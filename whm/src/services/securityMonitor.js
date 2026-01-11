const db = require('../config/db');
const { getGeoFromIP } = require('../utils/helpers');

/**
 * Security Monitoring Middleware
 * Tracks login attempts and active sessions
 */

/**
 * Log login attempt
 */
const logLoginAttempt = async (username, ip, userAgent, success, failureReason = null) => {
    try {
        // Get geo location
        let geo = { country: 'Unknown', lat: null, lon: null };
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            try {
                geo = await getGeoFromIP(ip);
            } catch (e) {
                console.error('Geo lookup failed:', e.message);
            }
        }

        // Insert login attempt
        db.query(
            `INSERT INTO login_attempts 
            (username, ip, country, lat, lon, user_agent, success, failure_reason) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, ip, geo.country, geo.lat, geo.lon, userAgent, success, failureReason],
            (err) => {
                if (err) console.error('Failed to log login attempt:', err);
            }
        );

        // Check for brute force (5 failed attempts in 10 minutes)
        if (!success) {
            db.query(
                `SELECT COUNT(*) as count FROM login_attempts 
                WHERE ip = ? AND success = 0 
                AND attempted_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
                [ip],
                (err, results) => {
                    if (!err && results[0].count >= 5) {
                        console.log(`[SECURITY] Brute force detected from ${ip} (${results[0].count} failed attempts)`);
                        // Auto-block this IP
                        db.query(
                            `INSERT INTO firewall (type, target, reason, country, lat, lon, auto_unblock_at) 
                            VALUES ('ip', ?, 'Brute force attack detected', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
                            ON DUPLICATE KEY UPDATE reason = VALUES(reason), auto_unblock_at = VALUES(auto_unblock_at)`,
                            [ip, geo.country, geo.lat, geo.lon],
                            (err) => {
                                if (!err) {
                                    console.log(`[SECURITY] Auto-blocked ${ip} for 1 hour`);
                                    // Sync with web server configs
                                    try {
                                        // const FirewallService = require('./FirewallService'); 
                                        // FirewallService.sync();
                                        console.log('[MOCK FIREWALL] Sync triggered');
                                    } catch (e) { }
                                }
                            }
                        );
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
};

/**
 * Track active session
 */
const trackSession = (sessionId, userId, ip, userAgent) => {
    return new Promise((resolve) => {
        // Get country from IP
        getGeoFromIP(ip).then(geo => {
            db.query(
                `INSERT INTO active_sessions (session_id, user_id, ip, country, user_agent) 
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    last_activity = CURRENT_TIMESTAMP,
                    ip = VALUES(ip),
                    country = VALUES(country),
                    user_agent = VALUES(user_agent)`,
                [sessionId, userId, ip, geo.country, userAgent],
                (err) => {
                    if (err) console.error('Failed to track session:', err);
                    resolve();
                }
            );
        }).catch(() => {
            // Fallback without geo
            db.query(
                `INSERT INTO active_sessions (session_id, user_id, ip, user_agent) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    last_activity = CURRENT_TIMESTAMP,
                    ip = VALUES(ip),
                    user_agent = VALUES(user_agent)`,
                [sessionId, userId, ip, userAgent],
                (err) => {
                    if (err) console.error('Failed to track session:', err);
                    resolve();
                }
            );
        });
    });
};

/**
 * Remove session
 */
const removeSession = (sessionId) => {
    return new Promise((resolve) => {
        db.query('DELETE FROM active_sessions WHERE session_id = ?', [sessionId], (err) => {
            if (err) console.error('Failed to remove session:', err);
            resolve();
        });
    });
};

/**
 * Clean up old sessions (inactive for 24 hours)
 */
const cleanupOldSessions = () => {
    db.query(
        'DELETE FROM active_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        (err, result) => {
            if (!err && result.affectedRows > 0) {
                console.log(`[Session Cleanup] Removed ${result.affectedRows} old sessions`);
            }
        }
    );
};

/**
 * Clean up old login attempts (older than 30 days)
 */
const cleanupOldLoginAttempts = () => {
    db.query(
        'DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
        (err, result) => {
            if (!err && result.affectedRows > 0) {
                console.log(`[Login Cleanup] Removed ${result.affectedRows} old login attempts`);
            }
        }
    );
};

/**
 * Auto-unblock expired IPs
 */
const autoUnblockExpired = () => {
    db.query(
        'DELETE FROM firewall WHERE auto_unblock_at IS NOT NULL AND auto_unblock_at < NOW()',
        (err, result) => {
            if (!err && result.affectedRows > 0) {
                console.log(`[Auto-Unblock] Removed ${result.affectedRows} expired blocks`);
            }
        }
    );
};

// Run cleanup tasks every hour
setInterval(() => {
    cleanupOldSessions();
    cleanupOldLoginAttempts();
    autoUnblockExpired();
}, 60 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(() => {
    cleanupOldSessions();
    autoUnblockExpired();
}, 5000);

module.exports = {
    logLoginAttempt,
    trackSession,
    removeSession,
    cleanupOldSessions,
    cleanupOldLoginAttempts,
    autoUnblockExpired
};
