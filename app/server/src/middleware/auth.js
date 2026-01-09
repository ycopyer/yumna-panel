const db = require('../config/db');
const { ensureSftp } = require('../services/storage');

const getSession = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId || userId === 'undefined' || userId === 'null' || userId === '') return res.status(401).json({ error: 'User not logged in' });
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') return res.status(401).json({ error: 'Session ID required' });

    try {
        // Verify session in DB
        db.query('SELECT u.id, u.role, u.status, s.lastActive FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?', [sessionId, userId], async (err, results) => {
            try {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (results.length === 0) return res.status(401).json({ error: 'Invalid or expired session' });

                const user = results[0];

                if (user.status === 'suspended') {
                    return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
                }

                // Check for session expiry (30 minutes)
                const lastActive = new Date(user.lastActive).getTime();
                const now = Date.now();
                const thirtyMinutes = 30 * 60 * 1000;

                if (now - lastActive > thirtyMinutes) {
                    // Session expired
                    db.query('DELETE FROM user_sessions WHERE sessionId = ?', [sessionId]);
                    return res.status(401).json({ error: 'Session expired due to inactivity' });
                }

                req.userId = user.id;
                req.userRole = user.role;

                // Update last active
                db.query('UPDATE user_sessions SET lastActive = NOW() WHERE sessionId = ?', [sessionId]);

                // Initialize storage (Local or SFTP)
                const session = await ensureSftp(parseInt(userId));
                req.sftp = session.sftp;
                req.sessionData = session;
                next();
            } catch (innerError) {
                console.error('[AUTH] Storage init error:', innerError.message);
                res.status(500).json({ error: 'Storage initialization failed: ' + innerError.message });
            }
        });
    } catch (error) {
        console.error('[AUTH] getSession error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

const requireAuth = (req, res, next) => {
    getSession(req, res, next);
};

const requireAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    const sessionId = req.headers['x-session-id'];

    if (!userId || userId === 'undefined' || !sessionId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
        const userRole = results && results.length > 0 ? results[0].role : null;

        if (err || !userRole || userRole.toLowerCase() !== 'admin') {
            console.warn(`[AUTH] Admin check failed for UserID ${userId}. Role found: ${userRole}`);
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        // Also verify session for admin
        db.query('SELECT userId FROM user_sessions WHERE sessionId = ? AND userId = ?', [sessionId, userId], (sErr, sResults) => {
            if (sErr || sResults.length === 0) return res.status(401).json({ error: 'Invalid admin session' });
            next();
        });
    });
};


const tryGetSession = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId || userId === 'undefined' || !sessionId || sessionId === 'undefined') {
        return next();
    }

    // Verify session in DB but don't block if fails
    db.query('SELECT u.id, u.role, u.username, s.lastActive FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?', [sessionId, userId], (err, results) => {
        if (err || results.length === 0) {
            return next();
        }

        const user = results[0];

        // Optional: Check expiry, but for logging purposes we might be lenient or enforce it. 
        // Let's enforce it to be consistent.
        const lastActive = new Date(user.lastActive).getTime();
        if (Date.now() - lastActive > 30 * 60 * 1000) {
            return next(); // Expired
        }

        req.userId = user.id;
        req.userRole = user.role;
        // Also attach the full user object for logger to use
        req.user = { id: user.id, username: user.username, role: user.role };

        // We typically don't init SFTP here to save resources unless needed (public share uses owner's SFTP)

        // Update last active silently
        db.query('UPDATE user_sessions SET lastActive = NOW() WHERE sessionId = ?', [sessionId]);

        next();
    });
};

module.exports = {
    getSession,
    requireAuth,
    requireAdmin,
    tryGetSession
};
