const express = require('express');
const router = express.Router();
const statsService = require('../../services/stats');
const { requireAdmin } = require('../../middleware/auth');

router.get('/stats/realtime', requireAdmin, async (req, res) => {
    try {
        const [cpu, disk] = await Promise.all([
            statsService.getCpuUsage(),
            statsService.getDiskUsage()
        ]);

        res.json({
            cpu,
            memory: statsService.getMemoryUsage(),
            disk,
            uptime: statsService.getUptime(),
            timestamp: Date.now()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
