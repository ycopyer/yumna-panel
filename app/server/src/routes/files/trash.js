const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { getSession, requireAuth } = require('../../middleware/auth');
const { listDirectory, listDirectoryRecursive } = require('../../core/sftp');
const { logActivity } = require('../../utils/logger');
const { checkLegalHold } = require('../../middleware/compliance');

router.get('/trash', getSession, (req, res) => {
    db.query('SELECT * FROM trash WHERE userId = ? ORDER BY deletedAt DESC', [req.sessionData.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/trash/restore/:id', getSession, async (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM trash WHERE id = ? AND userId = ?', [id, req.sessionData.userId], async (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Item not found in trash' });
        const item = results[0];

        try {
            // Ensure parent directory of original path exists
            const parentDir = item.filePath.substring(0, item.filePath.lastIndexOf('/'));
            if (parentDir && parentDir !== '' && parentDir !== '/' && parentDir !== '/Local Storage' && !parentDir.endsWith('SFTP')) {
                await req.sftp.mkdir(parentDir, true);
            }

            try {
                // Move back from trashPath to filePath
                await req.sftp.rename(item.trashPath, item.filePath);
            } catch (renameErr) {
                // If the trash file itself is missing, clean up the DB and tell user
                if (renameErr.message.includes('no such file') || renameErr.code === 'ENOENT' || renameErr.code === 2) {
                    await db.promise().query('DELETE FROM trash WHERE id = ?', [id]);
                    return res.status(404).json({ error: 'Trash source file missing. Record has been removed from trash bin.' });
                }
                throw renameErr;
            }

            // Delete from DB
            await db.promise().query('DELETE FROM trash WHERE id = ?', [id]);
            await logActivity(req.sessionData.userId, 'restore', `Restored from trash: ${item.filePath}`, req);
            res.json({ success: true, message: 'Item restored successfully' });
        } catch (e) {
            console.error('Restore Error:', e);
            res.status(500).json({ error: `Restore failed: ${e.message}` });
        }
    });
});

router.delete('/trash/empty', getSession, checkLegalHold, async (req, res) => {
    db.query('SELECT * FROM trash WHERE userId = ?', [req.sessionData.userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({ success: true });

        let totalFreed = 0;
        try {
            for (const item of results) {
                try {
                    let adapter = req.sftp;
                    let targetPath = item.trashPath;

                    // Manual Adapter Selection for Merged Mode
                    if (req.sftp.isMerged) {
                        if (item.filePath.startsWith('/Local Storage')) {
                            adapter = req.sftp.localAdapter;
                            // Clean path: remove '/Local Storage' if present, ensure slash
                            targetPath = targetPath.replace('/Local Storage', '') || '/';
                            if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
                        } else {
                            adapter = req.sftp.remoteAdapter;
                            // Clean path: remove '/SFTP' (or variant) if present
                            // Since we don't know exact remote name easily here, just verify it doesn't look like local?
                            // Safest: use path relative to root if it looks absolute
                            if (targetPath.startsWith('/SFTP')) {
                                targetPath = targetPath.replace('/SFTP', '') || '/';
                            }
                            if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
                        }
                    }

                    if (item.fileType === 'directory') {
                        await adapter.rmdir(targetPath, true);
                    } else {
                        await adapter.delete(targetPath);
                    }
                    if (item.filePath.startsWith('/Local Storage')) totalFreed += item.fileSize;
                } catch (e) {
                    // Clean up DB even if file missing
                    if (e.message.includes('success')) {
                        // ignoring false positives 
                    } else {
                        console.error(`Failed to delete trash item ${item.id}:`, e.message);
                    }
                }
            }

            if (totalFreed > 0) {
                await db.promise().query('UPDATE users SET used_storage = GREATEST(0, used_storage - ?) WHERE id = ?', [totalFreed, req.sessionData.userId]);
            }

            db.query('DELETE FROM trash WHERE userId = ?', [req.sessionData.userId], () => res.json({ success: true }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

router.delete('/trash/:id', getSession, checkLegalHold, async (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM trash WHERE id = ? AND userId = ?', [id, req.sessionData.userId], async (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Item not found' });
        const item = results[0];
        try {
            let adapter = req.sftp;
            let targetPath = item.trashPath;

            // Manual Adapter Selection for Merged Mode
            if (req.sftp.isMerged) {
                if (item.filePath.startsWith('/Local Storage')) {
                    adapter = req.sftp.localAdapter;
                    targetPath = targetPath.replace('/Local Storage', '');
                } else {
                    adapter = req.sftp.remoteAdapter;
                    // Heuristic clean
                    if (targetPath.startsWith('/SFTP')) targetPath = targetPath.replace('/SFTP', '');
                }
                if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
            }

            // Delete from disk
            if (item.fileType === 'directory') {
                await adapter.rmdir(targetPath, true);
            } else {
                await adapter.delete(targetPath);
            }

            // Update Storage Usage (Only if local)
            if (item.filePath.startsWith('/Local Storage')) {
                await db.promise().query('UPDATE users SET used_storage = GREATEST(0, used_storage - ?) WHERE id = ?', [item.fileSize, req.sessionData.userId]);
            }

            // Delete from DB
            db.query('DELETE FROM trash WHERE id = ?', [id], () => res.json({ success: true }));
        } catch (e) {
            console.error(e);
            // Force delete DB record if file missing?
            if (e.message.includes('No such file') || e.code === 'ENOENT') {
                db.query('DELETE FROM trash WHERE id = ?', [id], () => res.json({ success: true }));
            } else {
                res.status(500).json({ error: e.message });
            }
        }
    });
});

router.get('/recent-files', getSession, async (req, res) => {
    const userId = req.sessionData.userId;
    const query = `
        SELECT a.description, a.createdAt 
        FROM activity_history a
        JOIN users u ON a.userId = u.id
        WHERE a.userId = ? 
        AND a.action IN ('view', 'download')
        AND (u.recent_cleared_at IS NULL OR a.createdAt > u.recent_cleared_at)
        ORDER BY a.createdAt DESC 
        LIMIT 100
    `;

    db.query(query, [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const recentItems = [];
        const seenPaths = new Set();

        for (const row of results) {
            // Extract path from description: "Previewed image: /path/to/file" or "Downloaded: /path/to/file"
            let filePath = '';
            if (row.description.includes(': ')) {
                filePath = row.description.split(': ').pop();
            } else if (row.description.startsWith('Downloaded: ')) {
                filePath = row.description.replace('Downloaded: ', '');
            }

            if (filePath && !seenPaths.has(filePath)) {
                seenPaths.add(filePath);
                try {
                    const stats = await req.sftp.stat(filePath);
                    if (!stats.isDirectory()) {
                        recentItems.push({
                            name: filePath.split('/').pop(),
                            type: 'file',
                            size: stats.size,
                            mtime: stats.mtime,
                            atime: stats.atime,
                            birthTime: stats.birthTime || (stats.mtime * 1000),
                            path: filePath,
                            viewedAt: row.createdAt
                        });
                    }
                } catch (e) {
                    // Skip files that no longer exist
                }
            }

            if (recentItems.length >= 20) break;
        }
        res.json(recentItems);
    });
});

router.delete('/recent-files/clear', getSession, (req, res) => {
    const userId = req.sessionData.userId;
    db.query(
        "UPDATE users SET recent_cleared_at = NOW() WHERE id = ?",
        [userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

module.exports = router;
