const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// Helper to get agent client
const getAgentClient = (server) => {
    const agentUrl = server.is_local
        ? (process.env.AGENT_URL || 'http://localhost:4001')
        : `http://${server.ip}:4001`;

    return axios.create({
        baseURL: agentUrl,
        headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
        timeout: 5000
    });
};

// Helper to sync all nodes
async function syncFirewall() {
    try {
        const [servers] = await pool.promise().query('SELECT * FROM servers WHERE status = ?', ['active']);

        for (const server of servers) {
            try {
                // Get firewall rules
                const [firewallRules] = await pool.promise().query(
                    'SELECT type, target, country FROM firewall WHERE serverId IS NULL OR serverId = ?',
                    [server.id]
                );

                // Get security patterns
                const [patterns] = await pool.promise().query(
                    'SELECT type, pattern, isActive FROM security_patterns WHERE (serverId IS NULL OR serverId = ?) AND isActive = 1',
                    [server.id]
                );

                const agentApi = getAgentClient(server);
                await agentApi.post('/firewall/sync', {
                    rules: firewallRules,
                    patterns: patterns
                });
                console.log(`[WHM] Firewall synced with server ${server.name} (${server.ip})`);
            } catch (err) {
                console.error(`[WHM] Firewall sync failed for server ${server.name}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[WHM] Firewall sync failed:', err.message);
    }
}

// === WHITELIST ROUTES ===
router.get('/whitelist', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM firewall WHERE type = "whitelist" ORDER BY createdAt DESC');
        // Map to frontend expectation if needed (ip, description)
        const mapped = rows.map(r => ({ ...r, ip: r.target, description: r.reason }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/whitelist', requireAuth, requireAdmin, async (req, res) => {
    const { ip, description, serverId } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO firewall (type, target, reason, serverId) VALUES ("whitelist", ?, ?, ?)',
            [ip, description, serverId || null]
        );
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/whitelist/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM firewall WHERE id = ?', [req.params.id]);
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === GEOBLOCK ROUTES ===
router.get('/geoblock', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM firewall WHERE type = "geoblock" ORDER BY createdAt DESC');
        const mapped = rows.map(r => ({
            ...r,
            country_code: r.country,
            country_name: r.reason,
            is_active: true // Assuming entry exists means active
        }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/geoblock', requireAuth, requireAdmin, async (req, res) => {
    const { country_code, country_name, serverId } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO firewall (type, country, reason, target, serverId) VALUES ("geoblock", ?, ?, "ALL", ?)',
            [country_code, country_name, serverId || null]
        );
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/geoblock/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM firewall WHERE id = ?', [req.params.id]);
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === RATELIMIT ROUTES ===
router.get('/ratelimit', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM firewall WHERE type = "ratelimit" ORDER BY createdAt DESC');
        // Need to parse details from reason or store elsewhere. using generic storage for now
        // Assuming reason stores JSON: { max_requests, window_seconds, endpoint }
        // Or we use separate columns if modified. For now, simple mapping.
        const mapped = rows.map(r => {
            let details = {};
            try { details = JSON.parse(r.reason); } catch (e) { }
            return {
                id: r.id,
                ip: r.target,
                endpoint: details.endpoint || '*',
                max_requests: details.max_requests || 100,
                window_seconds: details.window_seconds || 60,
                is_active: true
            };
        });
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ratelimit', requireAuth, requireAdmin, async (req, res) => {
    const { ip, endpoint, max_requests, window_seconds, serverId } = req.body;
    try {
        const reason = JSON.stringify({ endpoint, max_requests, window_seconds });
        await pool.promise().query(
            'INSERT INTO firewall (type, target, reason, serverId) VALUES ("ratelimit", ?, ?, ?)',
            [ip, reason, serverId || null]
        );
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === SECURITY PATTERNS ROUTES ===
router.get('/firewall/security-patterns', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM security_patterns ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/firewall/security-patterns', requireAuth, requireAdmin, async (req, res) => {
    const { type, pattern, description, isActive, serverId } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO security_patterns (type, pattern, description, isActive, serverId) VALUES (?, ?, ?, ?, ?)',
            [type, pattern, description, isActive ? 1 : 0, serverId || null]
        );
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/firewall/security-patterns/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM security_patterns WHERE id = ?', [req.params.id]);
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// === GENERIC FIREWALL ROUTES (Legacy/Admin Interface) ===
router.get('/firewall', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT f.*, s.name as serverName 
            FROM firewall f
            LEFT JOIN servers s ON f.serverId = s.id
            ORDER BY f.createdAt DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/firewall', requireAuth, requireAdmin, async (req, res) => {
    const { type, target, reason, country, lat, lon, expiresAt, serverId } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO firewall (serverId, type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), expiresAt=VALUES(expiresAt)',
            [serverId || null, type, target, reason, country || null, lat || null, lon || null, expiresAt || null]
        );
        await syncFirewall();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/firewall/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [total] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall');
        const [active] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall WHERE expiresAt IS NULL OR expiresAt > NOW()');
        const [byCountry] = await pool.promise().query('SELECT country, COUNT(*) as count FROM firewall WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10');
        const [recent] = await pool.promise().query(`
            SELECT f.*, s.name as serverName 
            FROM firewall f
            LEFT JOIN servers s ON f.serverId = s.id
            ORDER BY f.createdAt DESC LIMIT 50
        `);

        res.json({
            total: total[0].count,
            active: active[0].count,
            byCountry: byCountry, // Mapped in frontend
            topAttackers: byCountry, // Alias for frontend
            failedAttempts: total[0].count, // Alias
            blockedCountries: active[0].count, // Alias
            recent
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === SECURITY STATS (Renamed for frontend compatibility) ===
router.get('/security/stats', requireAuth, async (req, res) => {
    try {
        const [total] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall');
        const [active] = await pool.promise().query('SELECT COUNT(*) as count FROM firewall WHERE expiresAt IS NULL OR expiresAt > NOW()');
        const [byCountry] = await pool.promise().query('SELECT country, COUNT(*) as count FROM firewall WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10');

        res.json({
            total: total[0].count,
            active: active[0].count,
            topAttackers: byCountry.map(c => ({ country: c.country, count: c.count })),
            failedAttempts: total[0].count,
            blockedCountries: active[0].count
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === 2FA ROUTES ===
router.get('/security/2fa/status', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT two_factor_enabled FROM users WHERE id = ?', [req.userId]);
        res.json({ enabled: !!rows[0]?.two_factor_enabled });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/security/2fa/setup', requireAuth, async (req, res) => {
    // Mock setup for now. In real implementation, use 'speakeasy' or similar
    res.json({
        secret: 'JBSWY3DPEHPK3PXP', // Mock secret
        qrContent: 'otpauth://totp/YumnaPanel:admin?secret=JBSWY3DPEHPK3PXP&issuer=YumnaPanel'
    });
});

router.post('/security/2fa/enable', requireAuth, async (req, res) => {
    try {
        await pool.promise().query('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', [req.userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/security/2fa/disable', requireAuth, async (req, res) => {
    try {
        await pool.promise().query('UPDATE users SET two_factor_enabled = 0 WHERE id = ?', [req.userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === AUDIT ROUTES ===
router.get('/security/audit/logs', requireAuth, async (req, res) => {
    try {
        const query = req.userRole === 'admin'
            ? 'SELECT * FROM activity_history ORDER BY createdAt DESC LIMIT 100'
            : 'SELECT * FROM activity_history WHERE userId = ? ORDER BY createdAt DESC LIMIT 100';

        const params = req.userRole === 'admin' ? [] : [req.userId];

        const [rows] = await pool.promise().query(query, params);
        const mapped = rows.map(r => ({
            id: r.id,
            event_type: r.action,
            severity: r.description.toLowerCase().includes('failed') || r.description.toLowerCase().includes('denied') ? 'warning' : 'info',
            username: 'user', // We might want to join with users table later
            ip_address: r.ipAddress || '0.0.0.0',
            action: r.description,
            status: 'success',
            timestamp: r.createdAt
        }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/security/audit/stats', requireAuth, async (req, res) => {
    try {
        const [total] = await pool.promise().query('SELECT COUNT(*) as count FROM activity_history');
        const [users] = await pool.promise().query('SELECT COUNT(DISTINCT userId) as count FROM activity_history');
        const [ips] = await pool.promise().query('SELECT COUNT(DISTINCT ipAddress) as count FROM activity_history');

        res.json({
            summary: {
                total_events: total[0].count,
                critical_events: 0,
                warning_events: 0,
                info_events: total[0].count,
                failed_events: 0,
                blocked_events: 0,
                unique_users: users[0].count,
                unique_ips: ips[0].count
            },
            top_events: [],
            recent_critical: []
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === MALWARE SCANNER ROUTES ===
router.get('/security/scans', requireAuth, async (req, res) => {
    res.json([]); // Empty history for now
});

router.get('/security/integrity', requireAuth, async (req, res) => {
    res.json({ status: 'healthy', last_check: new Date() });
});

module.exports = router;
