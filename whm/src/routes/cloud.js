const express = require('express');
const router = express.Router();
const cloudService = require('../services/CloudService');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

/**
 * CLOUD & VPS MANAGEMENT (Stage 15)
 */

router.get('/vms', requireAuth, async (req, res) => {
    try {
        const vms = await cloudService.listVMs();
        res.json(vms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vms', requirePrivileged, async (req, res) => {
    try {
        const result = await cloudService.createVM(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vms/:vmid/status', requireAuth, async (req, res) => {
    const { action } = req.body;
    try {
        const result = await cloudService.controlVM(req.params.vmid, action);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
