const db = require('../config/db');
const { ensureSftp } = require('../services/storage');

const getSession = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
        return res.status(401).json({ error: 'User not logged in (Missing UserID)' });
    }
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
        return res.status(401).json({ error: 'Session ID required' });
    }

    try {
        // Verify session in DB
        db.query('SELECT u.id, u.role, u.username, u.status, s.lastActive FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?', [sessionId, userId], async (err, results) => {
            try {
                if (err) {
                    console.error('[AUTH] DB Error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (results.length === 0) {
                    console.warn(`[AUTH] Session not found or UserID mismatch. SID: ${sessionId}, UID: ${userId}`);
                    return res.status(401).json({ error: 'Invalid or expired session' });
                }

                const user = results[0];

                if (user.status === 'suspended') {
                    return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
                }

                // Check for session expiry (Extend to 24h for debug if needed, now 30m)
                const lastActive = new Date(user.lastActive).getTime();
                const now = Date.now();
                const timeout = 30 * 60 * 1000;

                if (now - lastActive > timeout) {
                    console.warn(`[AUTH] Session expired for ${user.username}. Last active: ${new Date(lastActive).toISOString()}, Now: ${new Date(now).toISOString()}`);
                    db.query('DELETE FROM user_sessions WHERE sessionId = ?', [sessionId]);
                    return res.status(401).json({ error: 'Session expired due to inactivity' });
                }

                req.userId = user.id;
                req.userRole = user.role;
                req.user = { id: user.id, role: user.role, username: user.username };

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

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return null;

    return new Promise((resolve) => {
        db.query('SELECT t.userId, t.scopes, u.role, u.username, u.id FROM api_tokens t JOIN users u ON t.userId = u.id WHERE t.token = ?', [token], (err, results) => {
            if (err || results.length === 0) return resolve(null);

            // Update usage
            db.query('UPDATE api_tokens SET last_used_at = NOW() WHERE token = ?', [token]);

            resolve({
                userId: results[0].userId,
                role: results[0].role,
                username: results[0].username,
                scopes: results[0].scopes ? JSON.parse(results[0].scopes) : []
            });
        });
    });
};

const requireAuth = async (req, res, next) => {
    // Check for API Token first
    if (req.headers['authorization']) {
        const tokenUser = await verifyToken(req, res, next);
        if (tokenUser) {
            req.userId = tokenUser.userId;
            req.userRole = tokenUser.role;
            req.user = { id: tokenUser.userId, role: tokenUser.role, username: tokenUser.username };
            req.tokenScopes = tokenUser.scopes;
            return next();
        }
    }

    // Fallback to Session
    getSession(req, res, next);
};

const requireScope = (scope) => {
    return (req, res, next) => {
        if (!req.tokenScopes) return next(); // Not using token, assume full access (session) or handle otherwise
        if (req.tokenScopes.includes(scope) || req.tokenScopes.includes('admin')) {
            next();
        } else {
            res.status(403).json({ error: `Missing required scope: ${scope}` });
        }
    };
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
        db.query('SELECT u.id, u.role, u.username FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?', [sessionId, userId], (sErr, sResults) => {
            if (sErr || sResults.length === 0) return res.status(401).json({ error: 'Invalid admin session' });

            const user = sResults[0];
            req.userId = user.id;
            req.userRole = user.role;
            req.user = { id: user.id, role: user.role, username: user.username };

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

const requireReseller = (req, res, next) => {
    getSession(req, res, () => {
        if (req.userRole === 'reseller' || req.userRole === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Reseller privileges required' });
        }
    });
};

const requirePrivileged = (req, res, next) => {
    getSession(req, res, () => {
        if (req.userRole === 'reseller' || req.userRole === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Admin or Reseller privileges required' });
        }
    });
};

/**
 * Granular Permission Check for Enterprise Roles
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        getSession(req, res, () => {
            // Admins automatically have all permissions
            if (req.userRole === 'admin') return next();

            db.query(
                'SELECT 1 FROM user_permissions WHERE userId = ? AND permission = ?',
                [req.userId, permission],
                (err, results) => {
                    if (err || (results && results.length === 0)) {
                        console.warn(`[AUTH] Permission denied: '${permission}' for UserID ${req.userId}`);
                        return res.status(403).json({ error: `Missing required permission: ${permission}` });
                    }
                    next();
                }
            );
        });
    };
};

module.exports = {
    getSession,
    requireAuth,
    requireAdmin,
    requireReseller,
    requirePrivileged,
    requirePermission,
    requireScope,
    tryGetSession
};
