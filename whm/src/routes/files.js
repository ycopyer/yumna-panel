const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

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

// GET /api/ls
router.get('/ls', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.get('/fs/ls', {
            params: { root, path: targetPath }
        });

        // Enforce sharing logic if needed (monolith does this)
        const list = response.data;
        // ... sharing enrichment ... (omitting for brevity, matching basic functionality first)

        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/download
router.get('/download', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name } = req.query;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.get('/fs/download', {
            params: { root, path: targetPath },
            responseType: 'stream'
        });

        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        response.data.pipe(res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/save-content
router.put('/save-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, content } = req.body;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.post('/fs/write', {
            root, path: targetPath, content
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/read-content
router.get('/read-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.get('/fs/read', {
            params: { root, path: targetPath }
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mkdir
router.post('/mkdir', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.post('/fs/mkdir', {
            root, path: targetPath
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/delete
router.delete('/delete', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, recursive } = req.query;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.post('/fs/delete', {
            root, path: targetPath, recursive: recursive === 'true'
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rename
router.post('/rename', requireAuth, async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.post('/fs/rename', {
            root, oldPath, newPath
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/chmod
router.put('/chmod', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, mode } = req.body;
        const root = await getUserRoot(req.userId, req.userRole, req.user.username);

        const response = await agentApi.post('/fs/chmod', {
            root, path: targetPath, mode
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
