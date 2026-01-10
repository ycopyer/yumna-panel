const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const AppInstallerService = require('../../services/AppInstallerService');
const AppSchedulerService = require('../../services/AppSchedulerService');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

// List application templates
router.get('/apps/templates', requireAuth, async (req, res) => {
    try {
        const [templates] = await pool.query('SELECT * FROM application_templates');
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List installed applications
router.get('/apps/installed', requireAuth, async (req, res) => {
    const userId = req.userId;
    try {
        const [apps] = await pool.query(`
            SELECT a.*, w.domain as website_domain 
            FROM installed_applications a
            JOIN websites w ON a.websiteId = w.id
            WHERE a.userId = ?
        `, [userId]);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Install an application
router.post('/apps/install', requireAuth, auditLogger('INSTALL_APP'), async (req, res) => {
    const userId = req.userId;
    const { websiteId, templateId, options } = req.body;

    if (!websiteId || !templateId || !options) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        AppInstallerService.installApp(userId, websiteId, templateId, options)
            .then(result => console.log('[AppInstaller] Success:', result))
            .catch(err => console.error('[AppInstaller] Failed:', err));

        res.json({ success: true, message: 'Installation started in background' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual health check
router.post('/apps/:id/health', requireAuth, async (req, res) => {
    try {
        AppSchedulerService.runHealthChecks();
        res.json({ success: true, message: 'Health check started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual update
router.post('/apps/:id/update', requireAuth, auditLogger('UPDATE_APP'), async (req, res) => {
    try {
        await AppSchedulerService.triggerUpdate(req.params.id);
        res.json({ success: true, message: 'Update started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle auto-update
router.put('/apps/:id/auto-update', requireAuth, async (req, res) => {
    const { enabled } = req.body;
    try {
        await pool.query('UPDATE installed_applications SET auto_update_enabled = ? WHERE id = ?', [enabled, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
