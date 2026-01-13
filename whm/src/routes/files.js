const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// Helper to get user's root path
async function getUserRoot(userId, role, username) {
    if (role === 'admin') {
        const isWin = process.platform === 'win32';
        return isWin ? 'C:/YumnaPanel' : '/var/lib/yumnapanel';
    }

    // Check sftp_configs for custom root
    const [rows] = await pool.promise().query('SELECT rootPath FROM sftp_configs WHERE userId = ?', [userId]);
    if (rows.length > 0 && rows[0].rootPath) {
        return rows[0].rootPath;
    }

    // Default fallback
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

        let query = 'SELECT w.rootPath, s.ip, s.is_local FROM websites w JOIN servers s ON w.serverId = s.id WHERE w.domain = ?';
        let params = [domain];

        if (!isAdmin) {
            query += ' AND w.userId = ?';
            params.push(req.userId);
        }

        const [rows] = await pool.promise().query(query, params);
        if (rows.length > 0) {
            const website = rows[0];
            const agentUrl = website.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${website.ip}:4001`;
            return { agentUrl, root: website.rootPath, path: subPath };
        }
    }

    // 2. Default fallback to Master Node / User Root
    const root = await getUserRoot(req.userId, req.userRole, req.user.username);
    return {
        agentUrl: process.env.AGENT_URL || 'http://localhost:4001',
        root,
        path: targetPath
    };
}

// Utility to create agent client
function getAgentClient(agentUrl) {
    return axios.create({
        baseURL: agentUrl,
        headers: { 'X-Agent-Secret': AGENT_SECRET },
        timeout: 10000
    });
}

// Wrapper for agent calls with error handling
async function handleAgentRequest(res, agentUrl, fn) {
    try {
        const client = getAgentClient(agentUrl);
        return await fn(client);
    } catch (agentErr) {
        console.error(`[FILES] Agent Request Failed (${agentUrl}):`, agentErr.message);
        if (agentErr.code === 'ECONNREFUSED' || agentErr.code === 'ETIMEDOUT' || !agentErr.response) {
            return res.status(503).json({
                error: `Agent at ${agentUrl} is unreachable. Please ensure the agent is installed and running on the target server.`,
                code: 'AGENT_OFFLINE'
            });
        }
        res.status(agentErr.response?.status || 500).json({
            error: agentErr.response?.data?.error || agentErr.message
        });
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

        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.get('/fs/ls', { params: { root, path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/download
router.get('/download', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name } = req.query;
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.get('/fs/download', { params: { root, path }, responseType: 'stream' });
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            response.data.pipe(res);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/save-content
router.put('/save-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, content } = req.body;
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.post('/fs/write', { root, path, content });
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
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.get('/fs/read', { params: { root, path } });
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
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.post('/fs/mkdir', { root, path });
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
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.post('/fs/delete', { root, path, recursive: recursive === 'true' });
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
        const { agentUrl, root, path: resolvedOldPath } = await resolveTarget(req, oldPath);
        const { path: resolvedNewPath } = await resolveTarget(req, newPath);
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.post('/fs/rename', { root, oldPath: resolvedOldPath, newPath: resolvedNewPath });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/chmod
router.put('/chmod', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, mode } = req.body;
        const { agentUrl, root, path } = await resolveTarget(req, targetPath || '/');
        await handleAgentRequest(res, agentUrl, async (client) => {
            const response = await client.post('/fs/chmod', { root, path, mode });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
