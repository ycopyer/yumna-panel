const express = require('express');
const router = express.Router();
const CloudCmdManager = require('../services/CloudCmdManager');
const { createProxyMiddleware } = require('http-proxy-middleware');
const db = require('../config/db');
const path = require('path');

// Helper to parse cookies
const parseCookies = (request) => {
    const list = {};
    const rc = request.headers.cookie;
    rc && rc.split(';').forEach(function (cookie) {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

const fmAuth = async (req, res, next) => {
    let userId = req.query.userId;
    let sessionId = req.query.sessionId;

    const cookies = parseCookies(req);

    // Cookie Fallback
    if (!userId || !sessionId) {
        if (cookies['yp_uid'] && cookies['yp_sid']) {
            userId = cookies['yp_uid'];
            sessionId = cookies['yp_sid'];
        }
    }

    if (!userId || !sessionId) {
        return res.status(401).send(`
            <html><body style="font-family:sans-serif; color:#666; text-align:center; padding-top:20%;">
            <h2>Authentication Required</h2>
            <p>Please reload the application to refresh your session.</p>
            </body></html>
        `);
    }

    // Verify Session in DB
    const query = 'SELECT u.id, u.role, u.username FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?';

    db.query(query, [sessionId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send('Invalid Session');
        }

        const user = results[0];
        req.userId = user.id;

        // Determine Root Path Configuration
        // 1. Get from SFTP Config
        db.query('SELECT rootPath FROM sftp_configs WHERE userId = ?', [user.id], (sftpErr, sftpResults) => {
            let rootPath;

            if (user.role === 'admin') {
                // Admin gets full access context? Or just YumnaPanel root
                // Let's set it to YumnaPanel root C:\YumnaPanel
                // Current dir is app/server/src/routes
                rootPath = path.resolve(__dirname, '../../../../');
            } else if (sftpResults && sftpResults.length > 0) {
                rootPath = sftpResults[0].rootPath;
            } else {
                // Default fallback
                rootPath = path.resolve(__dirname, '../../../../users', user.username);
            }

            req.userRoot = rootPath;

            // Set cookies if coming from query params (Initial load refresh)
            if (req.query.userId) {
                // Set cookie for path /api/file-manager to restrict scope if possible, but path is root usually
                res.cookie('yp_uid', userId, { httpOnly: true, path: '/' });
                res.cookie('yp_sid', sessionId, { httpOnly: true, path: '/' });
            }

            next();
        });
    });
};

router.use(fmAuth);

// Dynamic Proxy Setup
const proxy = createProxyMiddleware({
    router: async (req) => {
        try {
            // Get or Spawn CloudCmd Instance for this user
            const port = await CloudCmdManager.getInstance(req.userId, req.userRoot);
            return `http://127.0.0.1:${port}`;
        } catch (e) {
            console.error('[FileManager] Router Error:', e);
            // This might crash the proxy, ideally we return a valid fallback URL that shows an error?
            // http-proxy-middleware documentation says router can throw.
            throw e;
        }
    },
    changeOrigin: true,
    ws: true, // Websocket Support
    pathRewrite: {
        '^/api/file-manager': ''
    },
    onError: (err, req, res) => {
        console.error('[FileManager] Proxy Error:', err);
        res.status(503).send('File Manager Service Unavailable. Please try again.');
    },
    logLevel: 'silent' // Keep logs clean
});

router.use('/', proxy);

module.exports = router;
