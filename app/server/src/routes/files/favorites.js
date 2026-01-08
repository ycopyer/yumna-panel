const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');

router.get('/favorites', requireAuth, (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId;
    db.query('SELECT * FROM favorites WHERE userId = ? ORDER BY createdAt DESC', [userId], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

router.post('/favorites/toggle', requireAuth, (req, res) => {
    const { userId, filePath, fileName, fileType } = req.body;
    db.query('SELECT id FROM favorites WHERE userId = ? AND filePath = ?', [userId, filePath], (err, r) => {
        if (r && r.length > 0) {
            db.query('DELETE FROM favorites WHERE userId=? AND filePath=?', [userId, filePath], () => res.json({ success: true, action: 'removed' }));
        } else {
            db.query('INSERT INTO favorites (userId, filePath, fileName, fileType) VALUES (?, ?, ?, ?)', [userId, filePath, fileName, fileType], () => res.json({ success: true, action: 'added' }));
        }
    });
});

router.get('/shared-with-me', requireAuth, (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId;
    db.query(`SELECT s.*, u.username as sharedBy FROM shares s LEFT JOIN users u ON s.userId = u.id WHERE s.recipientUserId = ? AND (s.expiresAt IS NULL OR s.expiresAt > NOW()) ORDER BY s.createdAt DESC`, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(s => ({
            id: s.id, name: s.fileName, type: s.isFolder ? 'directory' : 'file', size: 0,
            mtime: new Date(s.createdAt).getTime() / 1000,
            atime: new Date(s.createdAt).getTime() / 1000,
            birthTime: new Date(s.createdAt).getTime(),
            isShared: true, shareId: s.id, expiresAt: s.expiresAt, hasPassword: !!s.password, permissions: s.permissions, sharedBy: s.sharedBy || 'Unknown'
        })));
    });
});

module.exports = router;
