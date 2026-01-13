const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/favorites
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.query.userId || req.userId;
        const [rows] = await pool.promise().query('SELECT * FROM user_favorites WHERE userId = ?', [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/favorites/toggle
router.post('/toggle', requireAuth, async (req, res) => {
    const { userId, filePath, fileName, fileType } = req.body;
    const targetUserId = userId || req.userId;

    try {
        const [existing] = await pool.promise().query(
            'SELECT id FROM user_favorites WHERE userId = ? AND filePath = ?',
            [targetUserId, filePath]
        );

        if (existing.length > 0) {
            await pool.promise().query('DELETE FROM user_favorites WHERE id = ?', [existing[0].id]);
            res.json({ success: true, action: 'removed' });
        } else {
            await pool.promise().query(
                'INSERT INTO user_favorites (userId, filePath, fileName, fileType) VALUES (?, ?, ?, ?)',
                [targetUserId, filePath, fileName, fileType]
            );
            res.json({ success: true, action: 'added' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
