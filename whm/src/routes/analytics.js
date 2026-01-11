const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// GET /api/analytics/server-pulse
router.get('/server-pulse', requireAuth, requireAdmin, async (req, res) => {
    try {
        const response = await agentApi.get('/stats/pulse');
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/activity-history
router.get('/activity-history', requireAuth, async (req, res) => {
    const { userId } = req.query;
    const isAdmin = req.userRole === 'admin';
    const targetUserId = (isAdmin && userId) ? userId : req.userId;

    try {
        const query = 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.userId = ? ORDER BY a.createdAt DESC LIMIT 100';
        const [rows] = await pool.promise().query(query, [targetUserId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/summary
router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [totalUsers] = await pool.promise().query('SELECT COUNT(*) as count FROM users');
        const [totalWebsites] = await pool.promise().query('SELECT COUNT(*) as count FROM websites');
        const [totalDatabases] = await pool.promise().query('SELECT COUNT(*) as count FROM `databases`');

        const [todayActivity] = await pool.promise().query('SELECT COUNT(*) as count FROM activity_history WHERE DATE(createdAt) = CURDATE()');

        const [actionBreakdown] = await pool.promise().query(`
            SELECT action, COUNT(*) as count 
            FROM activity_history 
            WHERE createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY action
        `);

        res.json({
            totalUsers: totalUsers[0].count,
            totalWebsites: totalWebsites[0].count,
            totalDatabases: totalDatabases[0].count,
            totalShares: 0, // TODO: Implement shares in v3
            todayActivity: todayActivity[0].count,
            actionBreakdown
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/storage-stats
router.get('/storage-stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        // This is a bit complex in v3 as it might need to sum up storage from all nodes
        // For now, we'll return mock or simplified local data
        res.json({
            totalLocalStorage: 1024 * 1024 * 500, // 500MB
            userStorageBreakdown: []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/top-downloads
router.get('/top-downloads', requireAuth, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT description, COUNT(*) as downloadCount, MAX(createdAt) as lastDownload
            FROM activity_history 
            WHERE action = 'download'
            GROUP BY description
            ORDER BY downloadCount DESC
            LIMIT 10
        `;
        const [rows] = await pool.promise().query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/active-users
router.get('/active-users', requireAuth, requireAdmin, async (req, res) => {
    const days = req.query.days || 7;
    try {
        const query = `
            SELECT u.username, a.userId, COUNT(*) as activityCount, MAX(a.createdAt) as lastActivity
            FROM activity_history a
            JOIN users u ON a.userId = u.id
            WHERE a.createdAt > DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY a.userId
            ORDER BY activityCount DESC
            LIMIT 10
        `;
        const [rows] = await pool.promise().query(query, [days]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Detail Routes
router.get('/detail/action/:action', requireAuth, requireAdmin, async (req, res) => {
    try {
        const query = 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.action = ? ORDER BY a.createdAt DESC LIMIT 50';
        const [rows] = await pool.promise().query(query, [req.params.action]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/detail/user/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const query = 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.userId = ? ORDER BY a.createdAt DESC LIMIT 50';
        const [rows] = await pool.promise().query(query, [req.params.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/detail/file', requireAuth, requireAdmin, async (req, res) => {
    const { description } = req.query;
    try {
        const query = 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.description = ? ORDER BY a.createdAt DESC LIMIT 50';
        const [rows] = await pool.promise().query(query, [description]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/node-usage/:serverId', requireAuth, requireAdmin, async (req, res) => {
    const { serverId } = req.params;
    const { period } = req.query;
    let interval = '1 DAY';
    if (period === '7d') interval = '7 DAY';
    if (period === '30d') interval = '30 DAY';

    try {
        const query = `
            SELECT 
                DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as time,
                ROUND(AVG(cpu_load), 2) as cpu,
                ROUND(AVG(ram_used / ram_total * 100), 2) as ram,
                ROUND(MAX(disk_used / disk_total * 100), 2) as disk,
                MAX(net_rx) as net_rx,
                MAX(net_tx) as net_tx
            FROM usage_metrics
            WHERE serverId = ? AND timestamp > DATE_SUB(NOW(), INTERVAL ${interval})
            GROUP BY time
            ORDER BY time ASC
        `;
        const [rows] = await pool.promise().query(query, [serverId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
