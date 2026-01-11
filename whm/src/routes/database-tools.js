const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const dbTools = require('../services/DatabaseToolService');

// Execute Query
router.post('/query', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { sql, params } = req.body;
        const result = await dbTools.executeQuery(sql, params);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Table Stats
router.get('/stats/:dbName', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await dbTools.getTableStats(req.params.dbName);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Optimize Table
router.post('/optimize', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { dbName, tableName } = req.body;
        await dbTools.optimizeTable(dbName, tableName);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Redis Stats
router.get('/redis/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await dbTools.getRedisStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
