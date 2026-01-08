const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const { getSession, requireAuth } = require('../../middleware/auth');
const { encrypt, decrypt, sanitizePath } = require('../../utils/helpers');
const argon2 = require('argon2');

// POST /api/share
router.post('/share', getSession, async (req, res) => {
    const { fileName, title, expiresAt, password, permissions, isFolder, userId, existingId, recipientUserId } = req.body;
    const filePath = sanitizePath(req.body.filePath);
    const id = existingId || uuidv4();
    const config = { ...req.sessionData.config };
    try { const depass = decrypt(config.password); if (depass) config.password = depass; } catch (e) { }
    const sftpConfig = encrypt(JSON.stringify(config));
    const formattedExpiry = expiresAt ? expiresAt.slice(0, 19).replace('T', ' ') : null;

    let hashedPassword = null;
    if (password) {
        try {
            hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
        } catch (e) {
            return res.status(500).json({ error: 'Failed to hash password' });
        }
    }

    db.query(`INSERT INTO shares(id, filePath, fileName, title, expiresAt, password, permissions, isFolder, userId, sftpConfig, recipientUserId)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), expiresAt=VALUES(expiresAt), password=VALUES(password), permissions=VALUES(permissions), userId=VALUES(userId), sftpConfig=VALUES(sftpConfig), recipientUserId=VALUES(recipientUserId)`,
        [id, filePath, fileName, title || null, formattedExpiry, hashedPassword, permissions || 'View', isFolder ? 1 : 0, userId, sftpConfig, recipientUserId || null],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id });
        }
    );
});

// GET /api/share-by-path
router.get('/share-by-path', getSession, (req, res) => {
    db.query('SELECT * FROM shares WHERE filePath=? AND userId=?', [sanitizePath(req.query.path), req.sessionData.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json(null);
        const s = results[0];
        // We do NOT return the password anymore as it is hashed one-way
        res.json({ ...s, password: null, hasPassword: !!s.password });
    });
});

// DELETE /api/share/:id
router.delete('/share/:id', requireAuth, (req, res) => {
    db.query('DELETE FROM shares WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// GET /api/shares-all
router.get('/shares-all', requireAuth, (req, res) => {
    db.query('SELECT * FROM shares ORDER BY createdAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;
