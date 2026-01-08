const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const { getClientIp, getGeoFromIP } = require('../utils/helpers');

// --- SECURITY SETTINGS CACHE ---
// Default to safe regex (matches nothing) until DB loads
const safeRegex = new RegExp('StartOfNoMatch', 'i');

let cachedPatterns = {
    sqli: safeRegex,
    xss: safeRegex,
    bot: safeRegex,
    lastUpdated: 0
};

const refreshSecurityPatterns = (force = false) => {
    const now = Date.now();
    if (!force && now - cachedPatterns.lastUpdated < 600000) return; // 10 min cache

    db.query('SELECT type, pattern FROM security_patterns WHERE isActive = 1', (err, results) => {
        if (!err && results.length > 0) {
            // Filter out empty/whitespace patterns to avoid empty matches (catches all strings)
            const validResult = results.filter(r => r.pattern && r.pattern.trim().length > 0);

            const sqliRules = validResult.filter(r => r.type === 'sqli').map(r => r.pattern);
            const xssRules = validResult.filter(r => r.type === 'xss').map(r => r.pattern);
            const botRules = validResult.filter(r => r.type === 'bot').map(r => r.pattern);

            try {
                if (sqliRules.length > 0) cachedPatterns.sqli = new RegExp(sqliRules.join('|'), 'i');
                if (xssRules.length > 0) cachedPatterns.xss = new RegExp(xssRules.join('|'), 'i');
                if (botRules.length > 0) cachedPatterns.bot = new RegExp(botRules.join('|'), 'i');
                cachedPatterns.lastUpdated = now;
                console.log('[FIREWALL] Security patterns refreshed');
            } catch (e) {
                console.error('[FIREWALL] Error building regex from DB:', e.message);
            }
        }
    });
};
// Initialize
refreshSecurityPatterns();

/**
 * Firewall Middleware
 * Blocks access based on IP or User ID if they are in the blacklist
 */
const firewallCheck = async (req, res, next) => {
    // Skip firewall check for blocked page and unblock request page to prevent redirect loop
    const excludedPaths = ['/blocked', '/unblock-request', '/api/get-ip', '/api/blocked-info', '/api/firewall/check', '/api/firewall/unblock-request'];

    // Also skip static assets (js, css, images) otherwise the blocked page will be blank due to MIME type mismatch
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];

    if (excludedPaths.some(path => req.path.startsWith(path)) ||
        staticExtensions.some(ext => req.path.endsWith(ext))) {
        return next();
    }

    const ip = getClientIp(req);

    // 0. Whitelist Bypass (highest priority)
    const { isWhitelisted } = require('./advancedFirewall');
    if (isWhitelisted(ip)) {
        return next();
    }
    const username = (req.body && req.body.username) ? req.body.username : (req.headers['x-username'] || null);
    const userAgent = req.get('User-Agent') || '';

    // Trigger refresh on request (non-blocking, with cache)
    refreshSecurityPatterns();

    // Check for malicious Bot User-Agent
    if (userAgent && cachedPatterns.bot.source !== 'StartOfNoMatch') {
        const botMatch = cachedPatterns.bot.exec(userAgent);
        if (botMatch && botMatch[0].length > 1) {
            const reason = `Auto-blocked: Malicious Bot detected. UA Match: "${botMatch[0]}"`;
            console.warn(`[FIREWALL] ${reason}`);

            const { country, lat, lon } = await getGeoFromIP(ip);

            // Insert into firewall DB
            db.query(
                'INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR)) ON DUPLICATE KEY UPDATE reason = VALUES(reason), country = VALUES(country), lat = VALUES(lat), lon = VALUES(lon), expiresAt = VALUES(expiresAt)',
                ['ip', ip, reason, country, lat, lon],
                (err) => { if (err) console.error('[FIREWALL] Auto-block DB Error:', err); }
            );

            logActivity(0, 'firewall_bot_blocked', `${reason} (${country})`, req);

            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Access Denied: Browser/Bot not allowed.', firewall: true, reason });
            } else {
                return res.redirect(`/blocked?ip=${encodeURIComponent(ip)}&reason=${encodeURIComponent(reason)}&type=ip`);
            }
        }
    }

    // Basic heuristics to detect common attacks
    const hasAttackPayload = (input) => {
        if (!input || typeof input !== 'string') return null;

        let match;
        // Check for SQL Injection
        if ((match = cachedPatterns.sqli.exec(input)) !== null) {
            // Ignore empty or single-char matches (too aggressive/false positives)
            if (match[0].length <= 1) return null;

            console.warn(`[FIREWALL] SQLi Match: ${match[0]}`);
            return { type: 'SQL Injection', payload: match[0] };
        }
        // Check for XSS
        if ((match = cachedPatterns.xss.exec(input)) !== null) {
            if (match[0].length <= 1) return null;

            console.warn(`[FIREWALL] XSS Match: ${match[0]}`);
            return { type: 'XSS', payload: match[0] };
        }
        return null;
    };

    const scanRequest = (obj) => {
        if (!obj) return null;
        try {
            for (const val of Object.values(obj)) {
                if (typeof val === 'string') {
                    const result = hasAttackPayload(val);
                    if (result) return result;
                }
                if (typeof val === 'object' && val !== null) {
                    const result = scanRequest(val); // Recursive scan
                    if (result) return result;
                }
            }
        } catch (e) { return null; }
        return null;
    };

    // Scan Query, Body, and Params
    // Skip large bodies for performance? For now, scan all non-binary.
    let detection = scanRequest(req.query) || scanRequest(req.params) || (req.body && scanRequest(req.body));

    if (detection) {
        // Auto-block the attacker
        const safePayload = detection.payload.length > 200 ? detection.payload.substring(0, 200) + '...' : detection.payload;
        const reason = `Auto-blocked: ${detection.type} detected from ${ip}. Payload: "${safePayload}"`;
        console.warn(`[FIREWALL] ${reason}`);

        const { country, lat, lon } = await getGeoFromIP(ip);

        // Insert into firewall DB (async/background)
        db.query(
            'INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR)) ON DUPLICATE KEY UPDATE reason = VALUES(reason), country = VALUES(country), lat = VALUES(lat), lon = VALUES(lon), expiresAt = VALUES(expiresAt)',
            ['ip', ip, reason, country, lat, lon],
            (err) => { if (err) console.error('[FIREWALL] Auto-block DB Error:', err); }
        );

        // Immediate Rejection (Log full reason)
        logActivity(0, 'firewall_attack_blocked', `${reason} (${country})`, req);

        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Access Denied: Malicious payload detected.', firewall: true, reason, payload: safePayload });
        } else {
            return res.redirect(`/blocked?ip=${encodeURIComponent(ip)}&reason=${encodeURIComponent(reason)}&type=ip`);
        }
    }
    // ---------------------------------------------

    // Check for IP or User block
    const query = `
        SELECT * FROM firewall 
        WHERE ( (type = "ip" AND target = ?) OR (type = "user" AND target = ?) )
        AND (expiresAt IS NULL OR expiresAt > NOW())
    `;

    db.query(query, [ip, username], (err, results) => {
        if (err) return next();

        if (results.length > 0) {
            const block = results[0];
            console.warn(`[FIREWALL] Blocked ${block.type} attempt: ${block.target} for ${req.path}`);

            // Log & Notify via Telegram
            // logActivity(0, 'firewall_intercept', `Akses Diblokir [${block.type.toUpperCase()}]: ${block.target} (Alasan: ${block.reason || 'N/A'})`, req);

            // Check if this is an API request or web page request
            const isApiRequest = req.path.startsWith('/api/');

            if (isApiRequest) {
                // For API requests, return JSON
                return res.status(403).json({
                    error: `Access Denied: Your ${block.type} has been blocked due to suspicious activity.`,
                    reason: block.reason,
                    firewall: true,
                    blockedIP: ip,
                    blockType: block.type
                });
            } else {
                // For web page requests, redirect to blocked page
                const shortReason = (block.reason || 'Suspicious activity detected').substring(0, 100);
                return res.redirect(`/blocked?ip=${encodeURIComponent(ip)}&reason=${encodeURIComponent(shortReason)}&type=${block.type}`);
            }
        }
        next();
    });
};

module.exports = { firewallCheck, refreshSecurityPatterns };
