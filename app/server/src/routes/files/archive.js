const express = require('express');
const router = express.Router();
const path = require('path');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const archiver = require('archiver');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../../config/db');

// Helper
const resolveStoragePath = (req, targetPath) => {
    const { sftp, sessionData } = req;
    const toPosix = (p) => p.replace(/\\/g, '/');

    if (sftp.isMerged) {
        if (targetPath.startsWith('/Local Storage')) {
            const relativePath = targetPath.replace('/Local Storage', '') || '/';
            const localRoot = sftp.localAdapter.userDir;
            const sysPath = path.join(localRoot, relativePath.replace(/^\/+/, ''));
            return { type: 'local', sysPath, adapter: sftp.localAdapter };
        }
        let raw = targetPath.replace('/SFTP', '');
        if (raw === '') raw = '/';
        return { type: 'remote', rawPath: toPosix(raw), conn: sessionData.conn };
    }

    if (sessionData.isLocal) {
        const localRoot = sftp.userDir;
        const sysPath = path.join(localRoot, targetPath.replace(/^\/+/, ''));
        return { type: 'local', sysPath, adapter: sftp };
    } else {
        return { type: 'remote', rawPath: toPosix(targetPath), conn: sessionData.conn };
    }
};

router.post('/extract', getSession, async (req, res) => {
    // Skipped for now
    return res.status(501).json({ error: 'Maintenance' });
});

router.post('/compress', getSession, async (req, res) => {
    const rawItems = req.body.items || [];
    const archiveName = path.basename(req.body.name || 'archive.zip');
    const currentPath = sanitizePath(req.body.currentPath);

    if (rawItems.length === 0 || !archiveName) return res.status(400).json({ error: 'Invalid parameters' });

    const items = rawItems.map(i => path.basename(i));
    const resolvedDir = resolveStoragePath(req, currentPath === '/' ? '/.placeholder' : currentPath + '/.placeholder'); // Logic helper to get rawPath

    if (!resolvedDir) return res.status(400).json({ error: 'Invalid path' });

    try {
        if (resolvedDir.type === 'local') {

            // QUOTA PRE-CHECK
            if (req.userRole !== 'admin') {
                const [userData] = await db.promise().query('SELECT storage_quota, used_storage FROM users WHERE id = ?', [req.sessionData.userId]);
                const user = userData[0];
                if (user.storage_quota && BigInt(user.used_storage || 0) >= BigInt(user.storage_quota)) {
                    return res.status(400).json({ error: 'Storage quota exceeded. Cannot create new archive.' });
                }
            }

            const realDir = path.dirname(resolvedDir.sysPath);
            const outputFilePath = path.join(realDir, archiveName);
            const output = fs.createWriteStream(outputFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);

                items.forEach(item => {
                    const itemPath = path.join(realDir, item);
                    if (fs.existsSync(itemPath)) {
                        const stats = fs.statSync(itemPath);
                        if (stats.isDirectory()) archive.directory(itemPath, item);
                        else archive.file(itemPath, { name: item });
                    }
                });
                archive.finalize();
            });

            // Update Storage Usage
            try {
                const stats = fs.statSync(outputFilePath);
                await db.promise().query('UPDATE users SET used_storage = used_storage + ? WHERE id = ?', [stats.size, req.sessionData.userId]);
            } catch (ignore) { }

            logActivity(req.sessionData.userId, 'compress', `Created archive ${archiveName} in ${currentPath}`, req);
            res.json({ success: true });

        } else {
            // Remote Compression Disabled as per user request
            return res.status(400).json({ error: 'Remote compression (SFTP) is not supported.' });
        }

    } catch (error) {
        console.error('Compression error:', error);
        res.status(500).json({ error: 'Compression failed: ' + error.message });
    }
});

module.exports = router;
