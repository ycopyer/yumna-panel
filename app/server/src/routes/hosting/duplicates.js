const express = require('express');
const router = express.Router();
const DuplicateDetectionService = require('../../services/DuplicateDetectionService');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');

router.get('/duplicates/scan', getSession, async (req, res) => {
    const scanPath = sanitizePath(req.query.path);
    try {
        // Resolve path to physical path if needed, but here we assume Local Storage mapping
        // In a real scenario, we'd map /Local Storage/ to the actual disk path.
        // For simplicity, let's assume the path is relative to the root or absolute as provided.
        const duplicates = await DuplicateDetectionService.findDuplicates(scanPath);
        res.json(duplicates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
