const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const wpService = require('../services/WordPressService');

// Detect WP
router.post('/detect', requireAuth, async (req, res) => {
    try {
        const { path } = req.body;
        const result = await wpService.detectInstallation(path);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Plugins
router.post('/plugins/update', requireAuth, async (req, res) => {
    try {
        const { path } = req.body;
        const result = await wpService.updatePlugins(path);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Staging
router.post('/staging', requireAuth, async (req, res) => {
    try {
        const { domainId, path } = req.body;
        const result = await wpService.createStaging(domainId, path);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
