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

// Helper to sync all nodes
async function syncFirewall() {
    try {
        const [rules] = await pool.promise().query('SELECT type, target FROM firewall');
        // In multi-node, loop through all servers
        await agentApi.post('/firewall/sync', { rules });
        console.log('[WHM] Firewall synced with agent');
    } catch (err) {
        console.error('[WHM] Firewall sync failed:', err.message);
    }
}

// GET /api/security/firewall
router.get('/firewall', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM firewall ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/security/firewall
router.post('/firewall', requireAuth, requireAdmin, async (req, res) => {
    const { type, target, reason, country, lat, lon, expiresAt } = req.body;
    if (!type || !target) return res.status(400).json({ error: 'Type and target are required' });

    try {
        await pool.promise().query(
            'INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), expiresAt=VALUES(expiresAt)',
            [type, target, reason, country || null, lat || null, lon || null, expiresAt || null]
        );

        await syncFirewall();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/security/firewall/:id
router.delete('/firewall/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.promise().query('DELETE FROM firewall WHERE id = ?', [id]);
        await syncFirewall();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/security/firewall/stats
router.get('/firewall/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [total] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall');
        const [active] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall WHERE expiresAt IS NULL OR expiresAt > NOW()');
        const [byCountry] = await pool.promise().query('SELECT country, COUNT(*) as count FROM firewall WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10');
        const [recent] = await pool.promise().query('SELECT * FROM firewall ORDER BY createdAt DESC LIMIT 50');

        res.json({
            total: total[0].count,
            active: active[0].count,
            byCountry,
            recent
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Fraud & Abuse Control ---
router.get('/admin/fraud/logs', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT f.*, u.username 
            FROM fraud_check_logs f 
            LEFT JOIN users u ON f.userId = u.id 
            ORDER BY f.createdAt DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/fraud/blacklist', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM ip_blacklist ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/fraud/blacklist', requireAuth, requireAdmin, async (req, res) => {
    const { ipAddress, reason } = req.body;
    try {
        await db.promise().query(
            'INSERT INTO ip_blacklist (ipAddress, reason, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR)) ON DUPLICATE KEY UPDATE reason = VALUES(reason)',
            [ipAddress, reason]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/admin/fraud/blacklist/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.promise().query('DELETE FROM ip_blacklist WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
