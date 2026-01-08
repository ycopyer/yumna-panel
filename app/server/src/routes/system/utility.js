const express = require('express');
const router = express.Router();
const { getClientIp } = require('../../utils/helpers');
const db = require('../../config/db');

// Get client IP endpoint
router.get('/get-ip', (req, res) => {
    const ip = getClientIp(req);
    res.json({ ip });
});

// Get site settings for blocked page
router.get('/blocked-info', (req, res) => {
    db.query('SELECT key_name, value_text FROM settings WHERE key_name IN (?, ?, ?)',
        ['site_title', 'contact_email', 'contact_phone'],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const settings = {
                site_title: 'Yumna Panel',
                contact_email: 'admin@example.com',
                contact_phone: '+62 xxx-xxxx-xxxx'
            };

            results.forEach(row => {
                if (row.key_name === 'site_title') settings.site_title = row.value_text;
                if (row.key_name === 'contact_email') settings.contact_email = row.value_text;
                if (row.key_name === 'contact_phone') settings.contact_phone = row.value_text;
            });

            res.json(settings);
        }
    );
});

module.exports = router;
