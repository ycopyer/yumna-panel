const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { getSession, requireAdmin } = require('../../middleware/auth');
const { logActivity } = require('../../utils/logger');
const { refreshWhitelist, refreshGeoblock } = require('../../middleware/advancedFirewall');
const { checkIPReputation, getIPAbuseDetails, reportIP } = require('../../services/ipReputation');

// ==================== WHITELIST MANAGEMENT ====================

// Get all whitelisted IPs
router.get('/whitelist', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM firewall_whitelist ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add IP to whitelist
router.post('/whitelist', getSession, requireAdmin, (req, res) => {
    const { ip, description } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP is required' });

    db.query(
        'INSERT INTO firewall_whitelist (ip, description, added_by) VALUES (?, ?, ?)',
        [ip, description, req.sessionData.userId],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'IP already whitelisted' });
                }
                return res.status(500).json({ error: err.message });
            }

            refreshWhitelist();
            logActivity(req.sessionData.userId, 'whitelist_add', `Added ${ip} to whitelist`, req);
            res.json({ success: true });
        }
    );
});

// Remove IP from whitelist
router.delete('/whitelist/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query('SELECT ip FROM firewall_whitelist WHERE id = ?', [id], (err, results) => {
        if (err || !results.length) return res.status(404).json({ error: 'Not found' });

        const ip = results[0].ip;

        db.query('DELETE FROM firewall_whitelist WHERE id = ?', [id], (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });

            refreshWhitelist();
            logActivity(req.sessionData.userId, 'whitelist_remove', `Removed ${ip} from whitelist`, req);
            res.json({ success: true });
        });
    });
});

// ==================== GEO-BLOCKING MANAGEMENT ====================

// Get all geo-blocked countries
router.get('/geoblock', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM firewall_geoblock ORDER BY country_name', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add country to geo-block list
router.post('/geoblock', getSession, requireAdmin, (req, res) => {
    const { country_code, country_name } = req.body;
    if (!country_code) return res.status(400).json({ error: 'Country code is required' });

    db.query(
        'INSERT INTO firewall_geoblock (country_code, country_name, added_by) VALUES (?, ?, ?)',
        [country_code.toUpperCase(), country_name, req.sessionData.userId],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Country already blocked' });
                }
                return res.status(500).json({ error: err.message });
            }

            refreshGeoblock();
            logActivity(req.sessionData.userId, 'geoblock_add', `Blocked country: ${country_name} (${country_code})`, req);
            res.json({ success: true });
        }
    );
});

// Toggle geo-block status
router.patch('/geoblock/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    db.query(
        'UPDATE firewall_geoblock SET is_active = ? WHERE id = ?',
        [is_active ? 1 : 0, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            refreshGeoblock();
            logActivity(req.sessionData.userId, 'geoblock_toggle', `Toggled geo-block #${id}`, req);
            res.json({ success: true });
        }
    );
});

// Remove country from geo-block list
router.delete('/geoblock/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query('SELECT country_name FROM firewall_geoblock WHERE id = ?', [id], (err, results) => {
        if (err || !results.length) return res.status(404).json({ error: 'Not found' });

        const country = results[0].country_name;

        db.query('DELETE FROM firewall_geoblock WHERE id = ?', [id], (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });

            refreshGeoblock();
            logActivity(req.sessionData.userId, 'geoblock_remove', `Unblocked country: ${country}`, req);
            res.json({ success: true });
        });
    });
});

// ==================== RATE LIMITING MANAGEMENT ====================

// Get all rate limit rules
router.get('/ratelimit', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM firewall_ratelimit ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add rate limit rule
router.post('/ratelimit', getSession, requireAdmin, (req, res) => {
    const { ip, endpoint, max_requests, window_seconds } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP is required' });

    db.query(
        'INSERT INTO firewall_ratelimit (ip, endpoint, max_requests, window_seconds) VALUES (?, ?, ?, ?)',
        [ip, endpoint || '*', max_requests || 60, window_seconds || 60],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Rate limit already exists for this IP/endpoint' });
                }
                return res.status(500).json({ error: err.message });
            }

            logActivity(req.sessionData.userId, 'ratelimit_add', `Added rate limit for ${ip}`, req);
            res.json({ success: true });
        }
    );
});

// Update rate limit rule
router.patch('/ratelimit/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { max_requests, window_seconds, is_active } = req.body;

    db.query(
        'UPDATE firewall_ratelimit SET max_requests = ?, window_seconds = ?, is_active = ? WHERE id = ?',
        [max_requests, window_seconds, is_active ? 1 : 0, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            logActivity(req.sessionData.userId, 'ratelimit_update', `Updated rate limit #${id}`, req);
            res.json({ success: true });
        }
    );
});

// Delete rate limit rule
router.delete('/ratelimit/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM firewall_ratelimit WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        logActivity(req.sessionData.userId, 'ratelimit_delete', `Deleted rate limit #${id}`, req);
        res.json({ success: true });
    });
});

// ==================== IP REPUTATION ====================

// Check IP reputation
router.get('/reputation/:ip', getSession, requireAdmin, async (req, res) => {
    const { ip } = req.params;

    try {
        const reputation = await checkIPReputation(ip);
        res.json(reputation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Report IP to AbuseIPDB
router.post('/reputation/report', getSession, requireAdmin, async (req, res) => {
    const { ip, categories, comment } = req.body;

    if (!ip || !categories || !comment) {
        return res.status(400).json({ error: 'IP, categories, and comment are required' });
    }

    try {
        const success = await reportIP(ip, categories, comment);
        if (success) {
            logActivity(req.sessionData.userId, 'ip_report', `Reported ${ip} to AbuseIPDB`, req);
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to report IP' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SECURITY MONITORING ====================

// Get login attempts
router.get('/security/login-attempts', getSession, requireAdmin, (req, res) => {
    const { limit = 100, username, ip } = req.query;

    let query = 'SELECT * FROM login_attempts WHERE 1=1';
    const params = [];

    if (username) {
        query += ' AND username = ?';
        params.push(username);
    }

    if (ip) {
        query += ' AND ip = ?';
        params.push(ip);
    }

    query += ' ORDER BY attempted_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get active sessions
router.get('/security/sessions', getSession, requireAdmin, (req, res) => {
    const query = `
        SELECT s.*, u.username, u.email 
        FROM active_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.last_activity DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Force logout session
router.delete('/security/sessions/:sessionId', getSession, requireAdmin, (req, res) => {
    const { sessionId } = req.params;

    db.query('DELETE FROM active_sessions WHERE session_id = ?', [sessionId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        logActivity(req.sessionData.userId, 'session_force_logout', `Force logged out session ${sessionId}`, req);
        res.json({ success: true });
    });
});

// Get security statistics
router.get('/security/stats', getSession, requireAdmin, (req, res) => {
    const queries = {
        totalAttempts: 'SELECT COUNT(*) as count FROM login_attempts WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        failedAttempts: 'SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        activeSessions: 'SELECT COUNT(*) as count FROM active_sessions',
        whitelistedIPs: 'SELECT COUNT(*) as count FROM firewall_whitelist',
        blockedCountries: 'SELECT COUNT(*) as count FROM firewall_geoblock WHERE is_active = 1',
        topAttackers: 'SELECT ip, country, COUNT(*) as count FROM login_attempts WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY ip ORDER BY count DESC LIMIT 10',
        ransomwareBlocked: "SELECT COUNT(*) as count FROM activity_history WHERE action IN ('ransomware_blocked', 'ransomware_alert') AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        malwareBlocked: "SELECT COUNT(*) as count FROM activity_history WHERE action = 'malware_blocked' AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    };

    Promise.all([
        new Promise(resolve => db.query(queries.totalAttempts, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.failedAttempts, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.activeSessions, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.whitelistedIPs, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.blockedCountries, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.topAttackers, (err, r) => resolve(err ? [] : r))),
        new Promise(resolve => db.query(queries.ransomwareBlocked, (err, r) => resolve(err ? 0 : r[0].count))),
        new Promise(resolve => db.query(queries.malwareBlocked, (err, r) => resolve(err ? 0 : r[0].count)))
    ]).then(([totalAttempts, failedAttempts, activeSessions, whitelistedIPs, blockedCountries, topAttackers, ransomwareBlocked, malwareBlocked]) => {
        res.json({
            totalAttempts,
            failedAttempts,
            successRate: totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts * 100).toFixed(2) : 100,
            activeSessions,
            whitelistedIPs,
            blockedCountries,
            topAttackers,
            ransomwareBlocked,
            malwareBlocked
        });
    });
});

// Get advanced security statistics for charts and playback
// Get advanced security statistics for charts and playback
router.get('/security/advanced-stats', getSession, requireAdmin, (req, res) => {
    const { mode = 'realtime' } = req.query;

    const hourlyQuery = `
        SELECT 
            DATE_FORMAT(attempted_at, '%Y-%m-%d %H:00:00') as hour,
            COUNT(*) as total,
            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
        FROM login_attempts 
        WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY hour
        ORDER BY hour ASC
    `;

    const countryQuery = `
        SELECT country, COUNT(*) as count 
        FROM login_attempts 
        WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 10
    `;

    // History (Both success and failed for Real-time view and logs)
    // Fetches latest 500 entries regardless of timeframe, returned in ASC for map playback
    const historyQuery = `
        SELECT * FROM (
            SELECT id, username, ip, country, lat, lon, success, attempted_at 
            FROM login_attempts 
            WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 60 MINUTE)
            ORDER BY attempted_at DESC
            LIMIT 500
        ) as t ORDER BY attempted_at ASC
    `;

    const tasks = [
        new Promise(resolve => db.query(hourlyQuery, (err, r) => resolve(err ? [] : r))),
        new Promise(resolve => db.query(countryQuery, (err, r) => resolve(err ? [] : r))),
        new Promise(resolve => db.query(historyQuery, (err, r) => resolve(err ? [] : r)))
    ];

    if (mode === 'archive') {
        // All Attackers seen from the firewall table (blocked IPs)
        const firewallQuery = `
            SELECT id, target as ip, 'BLOCKED' as username, country, lat, lon, createdAt as attempted_at, 0 as success
            FROM firewall 
            WHERE type = 'ip'
            ORDER BY createdAt DESC
            LIMIT 2000
        `;
        tasks.push(new Promise(resolve => db.query(firewallQuery, (err, r) => resolve(err ? [] : r))));
    }

    Promise.all(tasks).then(([hourly, countries, history, archive]) => {
        res.json({
            hourly,
            countries,
            history,
            archive: archive || [] // Empty or requested archive
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Get Detailed IP Intel from AbuseIPDB
router.get('/security/ip-details', getSession, requireAdmin, async (req, res) => {
    const { ip } = req.query;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });

    try {
        const [details, reputation] = await Promise.all([
            getIPAbuseDetails(ip),
            checkIPReputation(ip)
        ]);
        res.json({ ...details, reputation });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error during IP intelligence lookup', details: err.message });
    }
});

const ThreatDetectionService = require('../../services/threatDetection');

// ==================== THREAT DETECTION ====================

// Get recent threats
router.get('/security/threats', getSession, requireAdmin, async (req, res) => {
    try {
        const stats = await ThreatDetectionService.getSecurityStats();
        res.json(stats.recentThreats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get high risk IPs
router.get('/security/reputation-stats', getSession, requireAdmin, async (req, res) => {
    try {
        const stats = await ThreatDetectionService.getSecurityStats();
        res.json(stats.highRiskIPs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get security insights (Zero-Day Heuristics stats)
router.get('/security/insights', getSession, requireAdmin, async (req, res) => {
    try {
        const stats = await ThreatDetectionService.getSecurityStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle Auto-Purge
router.post('/security/auto-purge', getSession, requireAdmin, (req, res) => {
    const { enabled } = req.body;
    const val = enabled ? '1' : '0';
    db.query('INSERT INTO compliance_settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = ?',
        ['threat_auto_purge_enabled', val, val],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(req.sessionData.userId, 'settings_update', `Set threat Auto-Purge to ${enabled}`, req);
            res.json({ success: true, enabled });
        }
    );
});

// Get Auto-Purge Status
router.get('/security/auto-purge', getSession, requireAdmin, (req, res) => {
    db.query('SELECT value_text FROM compliance_settings WHERE key_name = "threat_auto_purge_enabled"', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const enabled = results.length > 0 && results[0].value_text === '1';
        res.json({ enabled });
    });
});

module.exports = router;
