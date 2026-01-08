const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const https = require('https');
const http = require('http');
const { getSession, requireAdmin } = require('../../middleware/auth');
const { logActivity } = require('../../utils/logger');
const { getGeoFromIP } = require('../../utils/helpers');

// In-memory lock for concurrent unblock requests
const processingIPs = new Set();
// Cache for Server Geo Location
let serverGeoCache = null;

const fetchServerGeo = () => {
    return new Promise((resolve) => {
        if (serverGeoCache) return resolve(serverGeoCache);

        console.log('[SERVER] Fetching server public IP and Geo info...');

        // Try getting IP explicitly first using reliable ipify
        https.get('https://api.ipify.org?format=json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                try {
                    const parsed = JSON.parse(data);
                    const ip = parsed.ip;
                    console.log(`[SERVER] Detected Public IP: ${ip}`);

                    // Now get Geo info for this IP using our existing helper
                    const geo = await getGeoFromIP(ip);
                    console.log(`[SERVER] Server Location: ${geo.country}, ${geo.lat}, ${geo.lon}`);

                    serverGeoCache = {
                        country: geo.country,
                        lat: geo.lat,
                        lon: geo.lon,
                        ip: ip
                    };
                    resolve(serverGeoCache);
                } catch (e) {
                    console.error('[SERVER] Failed to parse IP from ipify:', e.message);

                    // Fallback to simpler ip-api call if ipify fails parsing
                    resolve(null);
                }
            });
        }).on('error', (e) => {
            console.error('[SERVER] Failed to fetch IP:', e.message);
            resolve(null);
        });
    });
};

const { sendNotification } = require('../../services/notification');
const { refreshSecurityPatterns } = require('../../middleware/firewall');

// --- PUBLIC ROUTES (No Auth Required) ---

// Check if an IP is blocked
router.get('/firewall/check/:ip', (req, res) => {
    const { ip } = req.params;
    db.query('SELECT * FROM firewall WHERE target = ? AND type = "ip"', [ip], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            const rule = results[0];
            // Check expiry
            if (!rule.expiresAt || new Date(rule.expiresAt) > new Date()) {
                return res.json({ blocked: true, reason: rule.reason, expiresAt: rule.expiresAt });
            }
        }
        res.json({ blocked: false });
    });
});

// Submit unblock request
router.post('/firewall/unblock-request', (req, res) => {
    const { ip, name, email, reason, blockReason } = req.body;
    if (!ip || !name || !email || !reason) return res.status(400).json({ error: 'All fields are required' });

    // Check for existing pending request
    db.query('SELECT id FROM unblock_requests WHERE ip = ? AND status = "pending"', [ip], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results && results.length > 0) return res.status(409).json({ error: 'Pending request already exists' });

        db.query(
            'INSERT INTO unblock_requests (ip, name, email, reason, block_reason, status) VALUES (?, ?, ?, ?, ?, "pending")',
            [ip, name, email, reason, blockReason || 'Unknown'],
            (insertErr) => {
                if (insertErr) {
                    // Create table if not exists (Lazy fix for schema sync)
                    if (insertErr.code === 'ER_NO_SUCH_TABLE') {
                        return db.query(`
                            CREATE TABLE IF NOT EXISTS unblock_requests (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                ip VARCHAR(45) NOT NULL,
                                name VARCHAR(100),
                                email VARCHAR(100),
                                reason TEXT,
                                block_reason TEXT,
                                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                                processedBy INT,
                                processedAt DATETIME,
                                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                INDEX idx_status (status)
                            )
                        `, (createErr) => {
                            if (createErr) return res.status(500).json({ error: 'Failed to init table' });
                            // Retry insert? No, ask user to retry.
                            res.status(500).json({ error: 'System init, please retry.' });
                        });
                    }
                    return res.status(500).json({ error: insertErr.message });
                }

                // Notify Admin
                sendNotification(`📝 <b>Unblock Request</b>\n👤 <b>Name:</b> ${name}\n📧 <b>Email:</b> ${email}\n💻 <b>IP:</b> ${ip}\nReason: ${reason}`);

                res.json({ success: true });
            }
        );
    });
});

// --- PROTECTED ROUTES ---

// Get all firewall rules
router.get('/firewall', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM firewall ORDER BY createdAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add a firewall rule
router.post('/firewall', getSession, requireAdmin, async (req, res) => {
    const { type, target, reason, expiresAt } = req.body;
    if (!type || !target) return res.status(400).json({ error: 'Type and target are required' });

    let country = null;
    let lat = null;
    let lon = null;

    if (type === 'ip') {
        try {
            const geo = await getGeoFromIP(target);
            country = geo.country;
            lat = geo.lat;
            lon = geo.lon;
        } catch (e) {
            console.error('Fail to get geo info', e);
        }
    }

    db.query(
        'INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), country=VALUES(country), lat=VALUES(lat), lon=VALUES(lon), expiresAt=VALUES(expiresAt)',
        [type, target, reason, country, lat, lon, expiresAt || null],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Sync with web server configs
            const FirewallService = require('../../services/FirewallService');
            FirewallService.sync();

            logActivity(req.sessionData.userId, 'firewall_add', `Added ${type} block for: ${target} (${country || 'Unknown'})`, req);
            res.json({ success: true });
        }
    );
});

// Remove a firewall rule
router.delete('/firewall/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    // Get info first for logging
    db.query('SELECT * FROM firewall WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Rule not found' });
        const rule = results[0];

        db.query('DELETE FROM firewall WHERE id = ?', [id], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ error: deleteErr.message });

            // Sync with web server configs
            const FirewallService = require('../../services/FirewallService');
            FirewallService.sync();

            logActivity(req.sessionData.userId, 'firewall_remove', `Removed ${rule.type} block for: ${rule.target}`, req);
            res.json({ success: true });
        });
    });
});

// Get firewall settings
router.get('/firewall/settings', getSession, requireAdmin, (req, res) => {
    db.query(
        'SELECT key_name, value_text FROM settings WHERE key_name IN (?, ?, ?)',
        ['firewall_threshold', 'firewall_window', 'firewall_codes'],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const settings = {
                threshold: '40',
                window: '60',
                codes: '404,403,500,401,301,302,201,505'
            };
            results.forEach(r => {
                if (r.key_name === 'firewall_threshold') settings.threshold = r.value_text;
                if (r.key_name === 'firewall_window') settings.window = r.value_text;
                if (r.key_name === 'firewall_codes') settings.codes = r.value_text;
            });
            res.json(settings);
        }
    );
});

// Update firewall settings
router.post('/firewall/settings', getSession, requireAdmin, (req, res) => {
    const { threshold, window, codes } = req.body;

    const updates = [
        ['firewall_threshold', threshold || '40'],
        ['firewall_window', window || '60'],
        ['firewall_codes', codes || '404,403,500,401,301,302,201,505']
    ];

    const promises = updates.map(([key, value]) => {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)',
                [key, value],
                (err) => err ? reject(err) : resolve()
            );
        });
    });

    Promise.all(promises)
        .then(() => {
            logActivity(req.sessionData.userId, 'firewall_settings', `Updated firewall settings: threshold=${threshold}, window=${window}s`, req);
            res.json({ success: true });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get firewall stats
router.get('/firewall/stats', getSession, requireAdmin, async (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM firewall',
        active: 'SELECT COUNT(*) as count FROM firewall WHERE expiresAt IS NULL OR expiresAt > NOW()',
        byCountry: 'SELECT country, COUNT(*) as count FROM firewall WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10',
        recent: 'SELECT * FROM firewall ORDER BY createdAt DESC LIMIT 50'
    };

    try {
        const [total, active, byCountry, recent, serverGeo] = await Promise.all([
            new Promise(resolve => db.query(queries.total, (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise(resolve => db.query(queries.active, (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise(resolve => db.query(queries.byCountry, (err, r) => resolve(err ? [] : r))),
            new Promise(resolve => db.query(queries.recent, (err, r) => resolve(err ? [] : r))),
            fetchServerGeo()
        ]);

        res.json({ total, active, byCountry, recent, serverGeo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unblock requests
router.get('/firewall/unblock-requests', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM unblock_requests ORDER BY createdAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Approve unblock request
router.post('/firewall/unblock-requests/:id/approve', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    // Use transaction-like logic: Get IP first
    db.query('SELECT * FROM unblock_requests WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Request not found' });
        const request = results[0];

        if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

        // Delete from firewall
        db.query('DELETE FROM firewall WHERE target = ? AND type = "ip"', [request.ip], (delErr) => {
            // Even if not found in firewall (expired?), mark as approved
            if (delErr) console.error('Error removing IP from firewall', delErr);

            // Update request status
            db.query(
                'UPDATE unblock_requests SET status = "approved", processedAt = NOW(), processedBy = ? WHERE id = ?',
                [req.sessionData.userId, id],
                (updErr) => {
                    if (updErr) return res.status(500).json({ error: updErr.message });
                    logActivity(req.sessionData.userId, 'firewall_unblock_approve', `Approved unblock for ${request.ip}`, req);
                    res.json({ success: true });
                }
            );
        });
    });
});

// Reject unblock request
router.post('/firewall/unblock-requests/:id/reject', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query(
        'UPDATE unblock_requests SET status = "rejected", processedAt = NOW(), processedBy = ? WHERE id = ?',
        [req.sessionData.userId, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(req.sessionData.userId, 'firewall_unblock_reject', `Rejected unblock for request #${id}`, req);
            res.json({ success: true });
        }
    );
});

// --- SECURITY PATTERNS MANAGEMENT ---

// Get all security patterns
router.get('/firewall/security-patterns', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM security_patterns ORDER BY createdAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add a security pattern
router.post('/firewall/security-patterns', getSession, requireAdmin, (req, res) => {
    const { type, pattern, description, isActive } = req.body;
    if (!type || !pattern) return res.status(400).json({ error: 'Type and pattern are required' });

    db.query(
        'INSERT INTO security_patterns (type, pattern, description, isActive) VALUES (?, ?, ?, ?)',
        [type, pattern, description, isActive ? 1 : 0],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(req.sessionData.userId, 'security_pattern_add', `Added ${type} pattern`, req);
            res.json({ success: true });
        }
    );
});

// Update a security pattern
router.put('/firewall/security-patterns/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { type, pattern, description, isActive } = req.body;

    db.query(
        'UPDATE security_patterns SET type = ?, pattern = ?, description = ?, isActive = ? WHERE id = ?',
        [type, pattern, description, isActive ? 1 : 0, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logActivity(req.sessionData.userId, 'security_pattern_update', `Updated ${type} pattern #${id}`, req);
            res.json({ success: true });
        }
    );
});

// Delete a security pattern
router.delete('/firewall/security-patterns/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM security_patterns WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.sessionData.userId, 'security_pattern_delete', `Deleted security pattern #${id}`, req);
        res.json({ success: true });
    });
});

// Lookup IP details from ip-api.com (With Database Caching)
router.get('/firewall/lookup', getSession, requireAdmin, (req, res) => {
    const { ip } = req.query;
    if (!ip) return res.status(400).json({ error: 'IP is required' });

    // Check if IP is special
    if (ip === '127.0.0.1' || ip === '::1') {
        return res.json({
            query: ip,
            status: 'success',
            country: 'Localhost',
            countryCode: 'LO',
            region: 'LO',
            regionName: 'Localhost',
            city: 'Localhost',
            zip: '00000',
            lat: 0,
            lon: 0,
            timezone: 'UTC',
            isp: 'Localhost',
            org: 'Localhost',
            as: 'Localhost'
        });
    }

    // Check Cache first
    db.query('SELECT * FROM ip_geo_cache WHERE ip = ? AND last_checked > DATE_SUB(NOW(), INTERVAL 7 DAY)', [ip], (err, results) => {
        if (!err && results.length > 0) {
            const cached = results[0];
            return res.json({
                status: 'success',
                country: cached.country,
                countryCode: cached.countryCode,
                region: cached.region,
                regionName: cached.regionName,
                city: cached.city,
                zip: cached.zip,
                lat: parseFloat(cached.lat),
                lon: parseFloat(cached.lon),
                timezone: cached.timezone,
                isp: cached.isp,
                org: cached.org,
                as: cached.as_info,
                query: cached.ip,
                _from_cache: true
            });
        }

        // Fetch from external API
        let responseSent = false;
        const externalReq = http.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, (resp) => {
            let data = '';
            resp.on('data', (chunk) => data += chunk);
            resp.on('end', () => {
                if (responseSent) return;
                responseSent = true;
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        // Save to cache
                        db.query(`
                            INSERT INTO ip_geo_cache 
                            (ip, country, countryCode, region, regionName, city, zip, lat, lon, timezone, isp, org, as_info)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                            country=VALUES(country), countryCode=VALUES(countryCode), region=VALUES(region), regionName=VALUES(regionName),
                            city=VALUES(city), zip=VALUES(zip), lat=VALUES(lat), lon=VALUES(lon), timezone=VALUES(timezone),
                            isp=VALUES(isp), org=VALUES(org), as_info=VALUES(as_info), last_checked=NOW()
                        `, [
                            json.query, json.country, json.countryCode, json.region, json.regionName, json.city, json.zip,
                            json.lat, json.lon, json.timezone, json.isp, json.org, json.as
                        ]);
                    }
                    res.json(json);
                } catch (e) {
                    res.status(500).json({ error: 'Failed to parse external API' });
                }
            });
        });

        externalReq.on('error', (err) => {
            if (responseSent) return;
            responseSent = true;
            res.status(500).json({ error: err.message });
        });

        externalReq.setTimeout(5000, () => {
            if (responseSent) return;
            responseSent = true;
            externalReq.destroy();
            res.status(504).json({ error: 'External API Request Timeout' });
        });
    });
});

// --- SECURITY PATTERN MANAGEMENT ---

router.get('/firewall/security-patterns', getSession, requireAdmin, (req, res) => {
    db.query('SELECT * FROM security_patterns ORDER BY createdAt DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/firewall/security-patterns', getSession, requireAdmin, (req, res) => {
    const { type, pattern, description, isActive } = req.body;
    db.query('INSERT INTO security_patterns (type, pattern, description, isActive) VALUES (?, ?, ?, ?)',
        [type, pattern, description, isActive ? 1 : 0], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            refreshSecurityPatterns(true);
            res.json({ success: true });
        });
});

router.put('/firewall/security-patterns/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { isActive, description, pattern, type } = req.body;
    db.query('UPDATE security_patterns SET isActive = ?, description = ?, pattern = ?, type = ? WHERE id = ?',
        [isActive ? 1 : 0, description, pattern, type, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            refreshSecurityPatterns(true);
            res.json({ success: true });
        });
});

router.delete('/firewall/security-patterns/:id', getSession, requireAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM security_patterns WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        refreshSecurityPatterns(true);
        res.json({ success: true });
    });
});

module.exports = router;
