const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const { listDirectory, listDirectoryRecursive } = require('../../core/sftp');
const pdfParserEngine = require('pdf-parse');

router.get('/ls', getSession, async (req, res) => {
    const path = sanitizePath(req.query.path);
    try {
        const list = await listDirectory(req.sftp, path);
        logActivity(req.sessionData.userId, 'view', `Opened folder: ${path}`, req);

        // Prevent caching of file list
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        db.query('SELECT filePath FROM shares', (err, shares) => {
            if (err) return res.json(list);
            const sharedPaths = new Set(shares.map(s => s.filePath));
            const enrichedList = list
                .filter(item => item.name !== '.trash_bin') // Hide trash bin from all levels
                .map(item => {
                    const fullPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;
                    return { ...item, isShared: sharedPaths.has(fullPath) };
                });
            res.json(enrichedList);
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/ls-recursive', getSession, async (req, res) => {
    const path = sanitizePath(req.query.path);
    try {
        const list = await listDirectoryRecursive(req.sftp, path);
        res.json(list);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

const archiver = require('archiver');

router.get('/download', getSession, async (req, res) => {
    const filePath = sanitizePath(req.query.path);
    const { name } = req.query;

    try {
        const stats = await req.sftp.stat(filePath);

        if (stats.isDirectory()) {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err) => {
                console.error('Archive error:', err);
                if (!res.headersSent) res.status(500).end();
            });

            archive.pipe(res);

            // Get all files recursively
            const files = await listDirectoryRecursive(req.sftp, filePath);

            for (const file of files) {
                if (file.type === 'file') {
                    const stream = req.sftp.createReadStream(file.path);
                    // Create relative path for zip (remove base directory path)
                    // file.path is absolute e.g. /Local Storage/folder/sub/file.txt
                    // filePath is /Local Storage/folder
                    // relative should be sub/file.txt
                    const relativePath = file.path.substring(filePath.length).replace(/^\/+/, '');
                    archive.append(stream, { name: relativePath });
                }
            }

            logActivity(req.sessionData.userId, 'download', `Downloaded folder as zip: ${filePath}`, req);
            archive.finalize();

        } else {
            const stream = req.sftp.createReadStream(filePath);
            logActivity(req.sessionData.userId, 'download', `Downloaded: ${filePath}`, req);
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            stream.on('error', (err) => {
                if (!res.headersSent) res.status(500).end(err.message);
            });
            stream.pipe(res);
        }
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

router.post('/check-pdf-content', getSession, async (req, res) => {
    const filePath = sanitizePath(req.body.path);
    if (!filePath || filePath === '/') return res.status(400).json({ error: 'File path is required' });
    try {
        const fileName = filePath.split('/').pop();
        const identifier = fileName.substring(0, 19);
        const stream = req.sftp.createReadStream(filePath);
        const chunks = [];
        await new Promise((resolve, reject) => {
            stream.on('data', c => chunks.push(c));
            stream.on('end', resolve);
            stream.on('error', reject);
        });
        const data = await pdfParserEngine(Buffer.concat(chunks));
        const text = data.text || '';
        res.json({ success: true, fileName, identifier, isMatch: text.includes(identifier), count: (text.match(new RegExp(identifier, 'g')) || []).length });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/export-dir-map', getSession, async (req, res) => {
    const startPath = sanitizePath(req.query.path);
    try {
        const list = await listDirectoryRecursive(req.sftp, startPath);

        let output = `Directory Map for: ${startPath}\n`;
        output += `Generated at: ${new Date().toLocaleString()}\n`;
        output += `Total items: ${list.length}\n`;
        output += `--------------------------------------------------\n`;
        output += `MATCH | CNT | TYPE | FILENAME\n`;
        output += `--------------------------------------------------\n`;

        for (const item of list) {
            const indent = '  '.repeat(Math.max(0, item.path.split('/').length - startPath.split('/').length - 1));
            let matchStatus = '     ';
            let matchCount = '   ';
            let typeStr = item.type === 'directory' ? 'DIR ' : 'FILE';

            if (item.type === 'file' && item.name.toLowerCase().endsWith('.pdf')) {
                try {
                    const identifier = item.name.substring(0, 19);
                    const stream = req.sftp.createReadStream(item.path);
                    const chunks = [];
                    await new Promise((resolve, reject) => {
                        stream.on('data', c => chunks.push(c));
                        stream.on('end', resolve);
                        stream.on('error', reject);
                    });
                    const data = await pdfParserEngine(Buffer.concat(chunks));
                    const text = data.text || '';
                    const count = (text.match(new RegExp(identifier, 'g')) || []).length;

                    matchStatus = count > 0 ? '[OK] ' : '[!!] ';
                    matchCount = count.toString().padStart(3, ' ');
                } catch (e) {
                    matchStatus = '[ERR]';
                    matchCount = ' 0 ';
                }
            }

            output += `${matchStatus} | ${matchCount} | ${typeStr} | ${indent}${item.name}\n`;
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="directory_map_${Date.now()}.txt"`);
        res.send(output);
        logActivity(req.sessionData.userId, 'export', `Exported directory map: ${startPath}`, req);
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

router.get('/view-pdf', getSession, async (req, res) => {
    const filePath = sanitizePath(req.query.path);
    try {
        const stats = await req.sftp.stat(filePath);
        const stream = req.sftp.createReadStream(filePath);

        logActivity(req.sessionData.userId, 'view', `Previewed PDF: ${filePath}`, req);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', 'inline');

        stream.on('error', (err) => {
            if (!res.headersSent) res.status(500).end(err.message);
        });

        stream.pipe(res);
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

const FileVersioningService = require('../../services/FileVersioningService');

router.put('/save-content', getSession, async (req, res) => {
    const filePath = sanitizePath(req.body.path);
    const { content } = req.body;

    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    if (content === undefined) return res.status(400).json({ error: 'Content is required' });

    try {
        // Create version before saving
        try {
            await FileVersioningService.createVersion(req.sessionData.userId, filePath, req.sftp, 'Auto-save');
        } catch (vErr) {
            console.warn('[Versioning] Auto-save skipped:', vErr.message);
        }

        await req.sftp.put(content, filePath);
        logActivity(req.sessionData.userId, 'edit', `Edited file: ${filePath}`, req);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/chmod', getSession, async (req, res) => {
    const filePath = sanitizePath(req.body.path);
    const { mode } = req.body;

    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    if (!mode) return res.status(400).json({ error: 'Mode is required' });

    try {
        const modeInt = parseInt(mode.toString(), 8);
        if (isNaN(modeInt)) throw new Error('Invalid mode format');

        await req.sftp.chmod(filePath, modeInt);
        logActivity(req.sessionData.userId, 'chmod', `Changed permissions of ${filePath} to ${mode}`, req);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
