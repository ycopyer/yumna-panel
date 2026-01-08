const db = require('../config/db');

const auditLogger = (action) => {
    return (req, res, next) => {
        const userId = req.userId || null;
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const userAgent = req.headers['user-agent'];
        const details = JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            body: req.method !== 'GET' ? req.body : undefined
        });

        // Use a background query to not slow down the response
        db.query(
            'INSERT INTO audit_logs (userId, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, action, details, ipAddress, userAgent],
            (err) => {
                if (err) console.error('[AuditLog Error]', err.message);
            }
        );
        next();
    };
};

module.exports = { auditLogger };
