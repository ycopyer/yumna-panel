const db = require('../config/db');
const { getClientIp, getGeoFromIP } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');
const { sendNotification } = require('../services/notification');

// In-memory tracker for response codes per IP
const ipResponseTracker = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipResponseTracker.entries()) {
        if (now - data.lastActivity > 5 * 60 * 1000) {
            ipResponseTracker.delete(ip);
        }
    }
}, 5 * 60 * 1000);

/**
 * Response Monitor Middleware
 * Tracks response codes and auto-blocks IPs exceeding threshold
 */
const responseMonitor = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    const checkAndBlock = async (statusCode) => {
        const ip = getClientIp(req);

        // skip if whitelisted
        const { isWhitelisted } = require('./advancedFirewall');
        if (isWhitelisted(ip)) return;

        // Get firewall settings from DB
        const settings = await new Promise(resolve => {
            db.query('SELECT key_name, value_text FROM settings WHERE key_name IN (?, ?, ?)',
                ['firewall_threshold', 'firewall_window', 'firewall_codes'],
                (err, results) => {
                    if (err) return resolve(null);
                    const config = {};
                    results.forEach(r => config[r.key_name] = r.value_text);
                    resolve(config);
                }
            );
        });

        if (!settings) return;

        const threshold = parseInt(settings.firewall_threshold || '40');
        const windowMs = parseInt(settings.firewall_window || '60') * 1000;
        const monitoredCodes = (settings.firewall_codes || '404,403,500,401,301,302,201,505')
            .split(',')
            .map(c => parseInt(c.trim()));

        // Only track monitored status codes
        if (!monitoredCodes.includes(statusCode)) return;

        // Skip tracking for preview/view endpoints to prevent blocking on session expiry (401s)
        const skippedPaths = ['/api/preview', '/api/view-pdf', '/api/ls'];
        if (skippedPaths.some(p => req.path.startsWith(p))) return;

        const now = Date.now();

        // Initialize or get tracker for this IP
        if (!ipResponseTracker.has(ip)) {
            ipResponseTracker.set(ip, {
                codes: [],
                lastActivity: now
            });
        }

        const tracker = ipResponseTracker.get(ip);
        tracker.lastActivity = now;

        // Add current code with timestamp
        tracker.codes.push({ code: statusCode, time: now });

        // Remove codes outside the time window
        tracker.codes = tracker.codes.filter(entry => now - entry.time < windowMs);

        // Check if threshold exceeded
        if (tracker.codes.length >= threshold) {
            console.warn(`[FIREWALL] Auto-blocking IP ${ip} - ${tracker.codes.length} suspicious responses in ${windowMs / 1000}s`);

            // Get geo info
            const { country, lat, lon } = await getGeoFromIP(ip);

            // Get access history
            const accessLog = await new Promise(resolve => {
                db.query(
                    'SELECT action, description, createdAt FROM activity_history WHERE ipAddress = ? ORDER BY createdAt DESC LIMIT 10',
                    [ip],
                    (err, results) => resolve(err ? [] : results)
                );
            });

            const accessSummary = accessLog.map(a => `${a.action}: ${a.description}`).join('; ');

            // Block the IP
            await new Promise(resolve => {
                db.query(
                    'INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR)) ON DUPLICATE KEY UPDATE reason = VALUES(reason), country = VALUES(country), lat = VALUES(lat), lon = VALUES(lon), expiresAt = VALUES(expiresAt)',
                    [
                        'ip',
                        ip,
                        `Auto-blocked: ${tracker.codes.length} suspicious responses (${monitoredCodes.join(',')}) in ${windowMs / 1000}s. Recent: ${accessSummary.substring(0, 200)}`,
                        country,
                        lat,
                        lon
                    ],
                    (err) => {
                        if (err) console.error('[FIREWALL] Block error:', err.message);
                        resolve();
                    }
                );
            });

            // Log activity
            logActivity(0, 'firewall_auto_block', `IP ${ip} (${country}) auto-blocked after ${tracker.codes.length} suspicious responses`, req);

            // Send Telegram Notification
            const responseCodes = tracker.codes.map(c => c.code).join(', ');
            const uniqueCodes = [...new Set(tracker.codes.map(c => c.code))].join(', ');
            const accessTypes = accessLog.map(a => a.action).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A';

            const telegramMessage = `
🚨 <b>FIREWALL AUTO-BLOCK ALERT</b> 🚨

<b>📍 IP Address:</b> <code>${ip}</code>
<b>🌍 Country:</b> ${country}
<b>⚠️ Total Violations:</b> ${tracker.codes.length} suspicious responses
<b>📊 Response Codes:</b> ${uniqueCodes}
<b>⏱️ Time Window:</b> ${windowMs / 1000} seconds
<b>🔐 Access Types:</b> ${accessTypes}

<b>📋 Recent Activity:</b>
${accessLog.slice(0, 5).map((a, i) => `${i + 1}. ${a.action} - ${a.description.substring(0, 50)}`).join('\n') || 'No recent activity'}

<b>🛡️ Action Taken:</b> IP blocked for 24 hours

<b>⏰ Timestamp:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            `.trim();

            sendNotification(telegramMessage);

            // Clear tracker
            ipResponseTracker.delete(ip);
        }
    };

    // Override res.send
    res.send = function (data) {
        checkAndBlock(res.statusCode).catch(console.error);
        return originalSend.call(this, data);
    };

    // Override res.json
    res.json = function (data) {
        checkAndBlock(res.statusCode).catch(console.error);
        return originalJson.call(this, data);
    };

    next();
};

module.exports = { responseMonitor };
