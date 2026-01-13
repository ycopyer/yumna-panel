const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');
const tunnelManager = require('../services/TunnelManagerService');
const { v4: uuidv4 } = require('uuid');

const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

// Helper to get user's root path (Legacy/Local)
async function getUserRoot(userId, role, username) {
    if (role === 'admin') {
        const isWin = process.platform === 'win32';
        return isWin ? 'C:/YumnaPanel' : '/var/lib/yumnapanel';
    }
    const [rows] = await pool.promise().query('SELECT rootPath FROM sftp_configs WHERE userId = ?', [userId]);
    if (rows.length > 0 && rows[0].rootPath) return rows[0].rootPath;
    const isWin = process.platform === 'win32';
    return isWin ? `C:/YumnaPanel/users/${username}` : `/home/${username}/files`;
}

// Helper to resolve agent and root path for a target
async function resolveTarget(req, targetPath) {
    const isAdmin = req.userRole === 'admin';

    // 1. Handle Virtual Website Paths (/websites/domain/...)
    const websiteMatch = targetPath.match(/^\/websites\/([^\/]+)(.*)/);
    if (websiteMatch) {
        const domain = websiteMatch[1];
        const subPath = websiteMatch[2] || '/';

        let query = 'SELECT w.rootPath, s.ip, s.is_local, s.connection_type, s.agent_id FROM websites w JOIN servers s ON w.serverId = s.id WHERE w.domain = ?';
        let params = [domain];

        if (!isAdmin) {
            query += ' AND w.userId = ?';
            params.push(req.userId);
        }

        const [rows] = await pool.promise().query(query, params);
        if (rows.length > 0) {
            const website = rows[0];
            return {
                mode: website.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                agentId: website.agent_id,
                agentUrl: website.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${website.ip}:4001`,
                root: website.rootPath,
                path: subPath
            };
        }
    }

    // 2. Default fallback to Master Node / User Root
    const root = await getUserRoot(req.userId, req.userRole, req.user.username);
    return {
        mode: 'direct',
        agentUrl: process.env.AGENT_URL || 'http://localhost:4001',
        root,
        path: targetPath
    };
}

// Unified Handler for Agent Actions
async function dispatchAction(res, target, tunnelAction, tunnelPayload, directFn) {
    if (target.mode === 'tunnel') {
        try {
            const response = await tunnelManager.sendCommand(target.agentId, 'FILE_ACTION', {
                action: tunnelAction,
                root: target.root,
                path: target.path,
                ...tunnelPayload
            });
            res.json(response);
        } catch (e) {
            console.error(`[FILES] Tunnel Request Failed:`, e.message);
            res.status(500).json({ error: `Tunnel Error: ${e.message}` });
        }
    } else {
        try {
            const client = axios.create({
                baseURL: target.agentUrl,
                headers: { 'X-Agent-Secret': AGENT_SECRET },
                timeout: 10000
            });
            await directFn(client);
        } catch (agentErr) {
            console.error(`[FILES] Direct Request Failed (${target.agentUrl}):`, agentErr.message);
            res.status(agentErr.response?.status || 500).json({
                error: agentErr.response?.data?.error || agentErr.message
            });
        }
    }
}

// GET /api/ls
router.get('/ls', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const isAdmin = req.userRole === 'admin';

        if (targetPath === '/websites' || targetPath === '/websites/') {
            let query = 'SELECT domain FROM websites';
            let params = [];
            if (!isAdmin) {
                query += ' WHERE userId = ?';
                params.push(req.userId);
            }
            const [rows] = await pool.promise().query(query, params);
            return res.json(rows.map(r => ({
                name: r.domain, type: 'directory', size: 0,
                mtime: Math.floor(Date.now() / 1000), atime: Math.floor(Date.now() / 1000), birthTime: Date.now(),
                permissions: 0, uid: 0, gid: 0
            })));
        }

        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'ls', {}, async (client) => {
            const response = await client.get('/fs/ls', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/download (Streaming Support)
router.get('/download', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name } = req.query;
        const target = await resolveTarget(req, targetPath || '/');

        if (target.mode === 'tunnel') {
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            const requestId = uuidv4();
            tunnelManager.registerDownloadListener(requestId, res);

            // Fire and forget command, data comes back via streaming chunks
            tunnelManager.sendCommand(target.agentId, 'FILE_ACTION', {
                action: 'download_chunked',
                root: target.root,
                path: target.path
            }, requestId).catch(e => {
                // If start command fails before streaming starts
                if (!res.headersSent) res.status(500).json({ error: e.message });
            });
        } else {
            const client = axios.create({
                baseURL: target.agentUrl,
                headers: { 'X-Agent-Secret': AGENT_SECRET },
                responseType: 'stream',
                timeout: 30000
            });
            try {
                const response = await client.get('/fs/download', { params: { root: target.root, path: target.path } });
                res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
                response.data.pipe(res);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        }
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// PUT /api/save-content
router.put('/save-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, content } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'write', { content }, async (client) => {
            const response = await client.post('/fs/write', { root: target.root, path: target.path, content });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/read-content
router.get('/read-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'read', {}, async (client) => {
            const response = await client.get('/fs/read', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mkdir
router.post('/mkdir', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'mkdir', {}, async (client) => {
            const response = await client.post('/fs/mkdir', { root: target.root, path: target.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/delete
router.delete('/delete', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, recursive } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'delete', { recursive: recursive === 'true' }, async (client) => {
            const response = await client.post('/fs/delete', { root: target.root, path: target.path, recursive: recursive === 'true' });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rename
router.post('/rename', requireAuth, async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        const targetOld = await resolveTarget(req, oldPath);
        const targetNew = await resolveTarget(req, newPath); // Mainly to resolve path relative to root

        // Assuming both are on same server/root, which is typical for rename
        // We use targetOld settings
        await dispatchAction(res, targetOld, 'rename', { oldPath: targetOld.path, newPath: targetNew.path }, async (client) => {
            const response = await client.post('/fs/rename', { root: targetOld.root, oldPath: targetOld.path, newPath: targetNew.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
