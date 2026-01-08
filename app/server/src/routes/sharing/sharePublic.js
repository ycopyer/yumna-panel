const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const { ensureSftp } = require('../../services/storage');
const { listDirectory, listDirectoryRecursive } = require('../../core/sftp');
const argon2 = require('argon2');
const { logLoginAttempt } = require('../../services/securityMonitor');
const { sanitizePath, verifySharePassword, getClientIp } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const { previewTokenStore } = require('../../services/authStore');
const { tryGetSession } = require('../../middleware/auth');
const pdfParserEngine = require('pdf-parse');

// Helper to check password and migrate if needed
const checkAndMigratePassword = async (share, password) => {
    if (!share.password) return true;

    const { valid, needsRehash } = await verifySharePassword(share, password);

    if (valid && needsRehash) {
        try {
            const newHash = await argon2.hash(password, { type: argon2.argon2id });
            db.query('UPDATE shares SET password = ? WHERE id = ?', [newHash, share.id], (err) => {
                if (err) console.error('Failed to migrate share password', err);
                else console.log(`Migrated share ${share.id} password to Argon2id`);
            });
        } catch (e) {
            console.error('Migration hash failed', e);
        }
    }

    return valid;
};

// Middleware to ensure request comes from our own frontend (prevent direct link access)
const requireAppContext = (req, res, next) => {
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';
    // Check for token in params or query (often used for previews/downloads on mobile)
    const token = req.params.token || req.query.token;

    const isLocal = req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1');
    if (isLocal) return next();

    // 1. Trust valid preview tokens (essential for mobile/PWAs where Referer is stripped)
    if (token && previewTokenStore.has(token)) {
        return next();
    }

    // 2. Allow requests from established sessions
    if (req.sessionData && req.sessionData.userId) {
        return next();
    }

    // 3. Fallback to Referer/Origin check for web context
    if (referer && referer.includes(req.headers.host)) {
        return next();
    }

    if (origin && origin.includes(req.headers.host)) {
        return next();
    }

    // Log the blocked request for debugging but redirect to 403
    console.warn(`[SECURITY] AppContext blocked for Path: ${req.path}, IP: ${req.ip}, UA: ${req.headers['user-agent']}`);
    return res.redirect('/403');
};

router.use(tryGetSession);

router.get('/share-info/:id', (req, res) => {
    db.query('SELECT * FROM shares WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const share = results[0];
        if (!share) return res.status(404).json({ error: 'Share not found' });
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) return res.status(410).json({ error: 'Share expired' });

        // Remove sensitive info
        const { password, sftpConfig, ...safeShare } = share;

        // Update statistics
        const ip = getClientIp(req);
        const ua = req.headers['user-agent'] || 'Unknown';
        db.query('UPDATE shares SET access_count = access_count + 1, last_accessed_at = NOW(), last_access_ip = ?, last_access_ua = ? WHERE id = ?', [ip, ua, share.id]);

        // Mark this as a public/guest access
        req.isPublicShare = true;

        // Log to security monitor for Threat Map visualization
        logLoginAttempt('Share Guest', ip, ua, true, `Access share: ${share.fileName}`);

        req.targetUserId = share.userId;
        logActivity(null, 'share_view', `Public access to shared link: ${share.fileName} (Share ID: ${share.id})`, req);

        res.json({ ...safeShare, hasPassword: !!password });
    });
});

// Protect file listing in shared folder
router.all('/share-ls/:id', requireAppContext, async (req, res) => {
    const { id } = req.params;
    const subPath = (req.body && req.body.subPath !== undefined) ? req.body.subPath : (req.query.subPath || '');
    const search = (req.body && req.body.search) || req.query.search;
    const password = (req.body && req.body.password) || req.query.password;

    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        if (share.password) {
            const isValid = await checkAndMigratePassword(share, password);
            if (!isValid) return res.status(403).json({ error: 'Invalid password' });
            req.sharePasswordUsed = true;
        }

        try {
            const { sftp } = await ensureSftp(share.userId);

            if (!share.isFolder) {
                const stats = await sftp.stat(share.filePath);
                return res.json([{
                    name: share.fileName,
                    type: 'file',
                    size: stats.size,
                    mtime: stats.mtime,
                    atime: stats.atime,
                    birthTime: stats.birthTime || (stats.mtime ? stats.mtime * 1000 : Date.now())
                }]);
            }

            if (search) {
                // Global search across the shared folder
                const allFiles = await listDirectoryRecursive(sftp, share.filePath);
                const query = search.toLowerCase();
                const filtered = allFiles.filter(f => f.name.toLowerCase().includes(query)).map(f => {
                    const displayPath = f.path.replace(share.filePath, '').replace(/^\/+/, '');
                    return {
                        ...f,
                        displayPath,
                        searchSubPath: displayPath
                    };
                });

                // Log search activity
                req.isPublicShare = true;
                req.targetUserId = share.userId;
                logActivity(null, 'share_search', `Global search for "${search}" in share: ${share.fileName}`, req);

                return res.json(filtered);
            }

            const cleanSub = sanitizePath(subPath).replace(/^\/+/, '');
            let targetPath = share.filePath;
            if (share.isFolder && cleanSub) {
                targetPath = share.filePath.endsWith('/') ? share.filePath + cleanSub : share.filePath + '/' + cleanSub;
            }

            const list = await listDirectory(sftp, targetPath);
            res.json(list);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// Protect token generation
router.post('/share-preview-token/:id', requireAppContext, (req, res) => {
    const { id } = req.params;
    const { password, path: rawPath, type } = req.body;
    const filePath = sanitizePath(rawPath);

    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        if (share.password) {
            const isValid = await checkAndMigratePassword(share, password);
            if (!isValid) return res.status(403).json({ error: 'Invalid password' });
            req.sharePasswordUsed = true;
        }

        // Ensure the requested file is within the shared folder (if it's a folder share)
        if (share.isFolder && !filePath.startsWith(share.filePath)) {
            return res.status(403).json({ error: 'Access denied outside shared folder' });
        }
        if (!share.isFolder && filePath !== share.filePath) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const token = uuidv4();
        previewTokenStore.set(token, {
            shareId: id,
            filePath,
            type,
            expiresAt: Date.now() + 3600000
        });
        res.json({ token });
    });
});

// Apply strict app context check for previews
router.get('/share-preview/:id/:token?', requireAppContext, async (req, res) => {
    const { id, token: paramToken } = req.params;
    const { path: rawPath, type: queryType, password, token: queryToken } = req.query;
    const token = paramToken || queryToken;
    const queryPath = sanitizePath(rawPath);

    let filePath = queryPath;
    let type = queryType;

    if (token) {
        const tdata = previewTokenStore.get(token);
        if (!tdata || tdata.shareId !== id) return res.status(403).json({ error: 'Invalid or expired token' });
        filePath = tdata.filePath;
        type = tdata.type;
        req.sharePasswordUsed = true; // Token implies successful auth previously
    }

    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        if (!token && share.password) {
            const isValid = await checkAndMigratePassword(share, password);
            if (!isValid) return res.status(403).json({ error: 'Invalid password' });
        }

        try {
            const { sftp } = await ensureSftp(share.userId);
            const targetPath = filePath || share.filePath;

            // Security check
            if (share.isFolder && !targetPath.startsWith(share.filePath)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (!share.isFolder && targetPath !== share.filePath) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const stats = await sftp.stat(targetPath);
            const stream = sftp.createReadStream(targetPath);

            // Log preview activity
            req.isPublicShare = true;
            req.targetUserId = share.userId;
            logActivity(null, 'share_preview', `Preview file: ${targetPath} (Share ID: ${share.id}, Type: ${type})`, req);

            res.setHeader('Content-Length', stats.size);
            // Disable Range requests as we stream the full file
            // res.setHeader('Accept-Ranges', 'bytes'); 

            const mimes = { pdf: 'application/pdf', image: 'image/jpeg', video: 'video/mp4', text: 'text/plain; charset=utf-8' };
            if (mimes[type]) {
                res.setHeader('Content-Type', mimes[type]);
                res.setHeader('Content-Disposition', 'inline; filename="' + targetPath.split('/').pop() + '"');
            }
            stream.pipe(res);
        } catch (e) { res.status(404).json({ error: 'File not found' }); }
    });
});

// Protect download action
router.post('/share-download/:id', requireAppContext, async (req, res) => {
    const { id } = req.params;
    const subPathBuffer = (req.body && req.body.subPath !== undefined) ? req.body.subPath : (req.query.subPath || '');
    const subPath = sanitizePath(subPathBuffer).replace(/^\/+/, '');
    const password = (req.body && req.body.password) || req.query.password;
    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        if (share.password) {
            const isValid = await checkAndMigratePassword(share, password);
            if (!isValid) return res.status(403).json({ error: 'Invalid password' });
        }

        try {
            const { sftp } = await ensureSftp(share.userId);
            const target = (share.isFolder && subPath)
                ? (share.filePath.endsWith('/') ? share.filePath + subPath : share.filePath + '/' + subPath)
                : share.filePath;

            // Safety check: Ensure target is within share.filePath
            if (share.isFolder && !target.startsWith(share.filePath)) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const stats = await sftp.stat(target);
            const targetName = subPath ? subPath.split('/').pop() : share.fileName;
            const isFile = (typeof stats.isFile === 'function') ? stats.isFile() : (stats.type === '-' || !stats.type);

            // Log download activity
            req.isPublicShare = true;
            req.targetUserId = share.userId;
            const itemType = isFile ? 'file' : 'folder';
            logActivity(null, 'share_download', `Download ${itemType}: ${target} (Share ID: ${share.id})`, req);

            if (isFile) {
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetName)}"`);
                sftp.createReadStream(target).pipe(res);
            } else {
                const archive = archiver('zip', { zlib: { level: 9 } });
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetName)}.zip"`);
                archive.pipe(res);
                const addFolder = async (p, l) => {
                    const list = await listDirectory(sftp, p);
                    for (const item of list) {
                        const r = p.endsWith('/') ? p + item.name : p + '/' + item.name;
                        const loc = l ? l + '/' + item.name : item.name;
                        if (item.type === 'directory' || item.type === 'd') await addFolder(r, loc);
                        else archive.append(sftp.createReadStream(r), { name: loc });
                    }
                };
                await addFolder(target, '');
                archive.finalize();
            }
        } catch (e) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
    });
});

router.post('/share-check-pdf/:id', async (req, res) => {
    const { id } = req.params;
    const { filePath, password } = req.body;
    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        if (share.password) {
            const isValid = await checkAndMigratePassword(share, password);
            if (!isValid) return res.status(403).json({ error: 'Invalid password' });
        }

        try {
            const { sftp } = await ensureSftp(share.userId);
            const identifier = filePath.split('/').pop().substring(0, 19);
            const stream = sftp.createReadStream(filePath);
            const chunks = [];
            await new Promise((resolve, reject) => {
                stream.on('data', c => chunks.push(c));
                stream.on('end', resolve);
                stream.on('error', reject);
            });
            const data = await pdfParserEngine(Buffer.concat(chunks));
            res.json({ success: true, isMatch: (data.text || '').includes(identifier), identifier });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

router.post('/share-auth/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    db.query('SELECT * FROM shares WHERE id = ?', [id], async (err, results) => {
        if (err || !results[0]) return res.status(404).json({ error: 'Share not found' });
        const share = results[0];

        const isValid = await checkAndMigratePassword(share, password);

        if (isValid) {
            req.sharePasswordUsed = true;
            req.isPublicShare = true;
            req.targetUserId = share.userId;
            // Log successful auth
            logActivity(null, 'share_view', `Share password verified: ${share.fileName}`, req);
            res.json({ success: true });
        } else res.status(403).json({ error: 'Invalid password' });
    });
});

module.exports = router;
