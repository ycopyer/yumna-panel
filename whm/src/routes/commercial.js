const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * Licensing & Commercial Support Router
 */

// Verify License
router.get('/license/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM compliance_settings WHERE setting_key = "system_license"');
        const license = rows[0]?.setting_value || 'TRIAL-MODE';

        res.json({
            license,
            status: license.startsWith('YUMNA-') ? 'Valid' : 'Trial',
            expiresAt: '2027-01-01',
            type: 'Enterprise'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update License
router.post('/license/update', requireAuth, requireAdmin, async (req, res) => {
    const { key } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO compliance_settings (setting_key, setting_value) VALUES ("system_license", ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
            [key]
        );
        res.json({ success: true, message: 'License updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
