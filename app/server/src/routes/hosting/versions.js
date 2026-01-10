const express = require('express');
const router = express.Router();
const FileVersioningService = require('../../services/FileVersioningService');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

// Get version history for a file
router.get('/versions', requireAuth, async (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    try {
        const versions = await FileVersioningService.getVersions(req.userId, filePath);
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restore a specific version
router.post('/versions/:id/restore', requireAuth, auditLogger('RESTORE_FILE_VERSION'), async (req, res) => {
    try {
        const result = await FileVersioningService.restoreVersion(req.userId, req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a specific version
router.delete('/versions/:id', requireAuth, auditLogger('DELETE_FILE_VERSION'), async (req, res) => {
    try {
        const result = await FileVersioningService.deleteVersion(req.userId, req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
