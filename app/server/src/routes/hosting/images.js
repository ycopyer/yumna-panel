const express = require('express');
const router = express.Router();
const ImageService = require('../../services/ImageService');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const fs = require('fs');
const path = require('path');

router.get('/image/info', requireAuth, async (req, res) => {
    const { path: filePath } = req.query;
    try {
        const info = await ImageService.getInfo(filePath);
        res.json(info);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/image/edit', requireAuth, auditLogger('EDIT_IMAGE'), async (req, res) => {
    const { path: filePath, operations, saveAsNew } = req.body;
    try {
        const tempPath = await ImageService.processImage(filePath, operations);

        if (saveAsNew) {
            const ext = path.extname(filePath);
            const newPath = filePath.replace(ext, `_edited_${Date.now()}${ext}`);
            fs.renameSync(tempPath, newPath);
            res.json({ success: true, path: newPath });
        } else {
            // Overwrite original
            fs.copyFileSync(tempPath, filePath);
            fs.unlinkSync(tempPath);
            res.json({ success: true, path: filePath });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
