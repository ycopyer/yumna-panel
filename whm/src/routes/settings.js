const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

/**
 * GET /api/settings-site
 * Public endpoint to fetch basic site settings for the frontend (Logo, Title, etc.)
 */
router.get('/settings-site', (req, res) => {
    db.query('SELECT key_name, value_text FROM settings', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const settings = {};
        const publicKeys = ['logo_url', 'site_title', 'footer_text', 'primary_color'];

        if (results) {
            results.forEach(row => {
                if (publicKeys.includes(row.key_name)) {
                    settings[row.key_name] = row.value_text;
                }
            });
        }

        settings.panel_version = 'v3.0.0-production';
        res.json(settings);
    });
});

/**
 * GET /api/admin/settings-site
 * Private endpoint for administrators to fetch all settings
 */
router.get('/admin/settings-site', requireAdmin, (req, res) => {
    db.query('SELECT key_name, value_text FROM settings', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const settings = {};
        if (results) {
            results.forEach(row => settings[row.key_name] = row.value_text);
        }
        res.json(settings);
    });
});

/**
 * POST /api/settings-site
 * Update site settings (Admin only)
 */
router.post('/settings-site', requireAdmin, (req, res) => {
    const queries = Object.entries(req.body).map(([k, v]) => {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)',
                [k, String(v)],
                (err) => err ? reject(err) : resolve()
            );
        });
    });

    Promise.all(queries)
        .then(() => res.json({ success: true, message: 'Settings updated successfully' }))
        .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
