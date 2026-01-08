const express = require('express');
const router = express.Router();
const pluginService = require('../../services/pluginService');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// List Plugins
router.get('/plugins', requireAuth, async (req, res) => {
    try {
        const plugins = pluginService.getAvailablePlugins();
        res.json(plugins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Install Plugin
router.post('/plugins/install', requireAdmin, async (req, res) => {
    const { id } = req.body;
    try {
        const result = await pluginService.installPlugin(id);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Uninstall Plugin
router.post('/plugins/uninstall', requireAdmin, async (req, res) => {
    const { id } = req.body;
    try {
        const result = await pluginService.uninstallPlugin(id);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
