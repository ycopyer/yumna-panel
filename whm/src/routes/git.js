const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// GET /api/git - List repos
router.get('/', requireAuth, async (req, res) => {
    const isAdmin = req.userRole === 'admin';
    try {
        let query = 'SELECT g.*, w.domain FROM git_repos g LEFT JOIN websites w ON g.websiteId = w.id';
        const params = [];

        if (!isAdmin) {
            query += ' WHERE g.userId = ?';
            params.push(req.userId);
        }

        query += ' ORDER BY g.createdAt DESC';
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/git/key - Fetch node SSH key
router.get('/key', requireAuth, async (req, res) => {
    try {
        const response = await agentApi.get('/git/key');
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Webhook endpoint (Public)
router.post('/webhook/:id', async (req, res) => {
    const repoId = req.params.id;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM git_repos WHERE id = ?', [repoId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Repo not found' });

        const repo = rows[0];
        // Note: Simple verification for now. 
        // In full prod, verify signature using repo.webhookSecret

        // Trigger deploy on Agent
        await agentApi.post('/git/deploy', {
            repoUrl: repo.repoUrl,
            branch: repo.branch,
            deployPath: repo.deployPath
        });

        res.json({ success: true, message: 'Webhook received, deploy triggered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/git - Add repo
router.post('/', requireAuth, async (req, res) => {
    const { name, repoUrl, branch, deployPath, websiteId } = req.body;
    const userId = req.userId;

    if (!name || !repoUrl || !deployPath) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const webhookSecret = uuidv4().replace(/-/g, '');
        const [result] = await pool.promise().query(
            'INSERT INTO git_repos (userId, websiteId, name, repoUrl, branch, deployPath, webhookSecret) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, websiteId || null, name, repoUrl, branch || 'main', deployPath, webhookSecret]
        );

        res.json({ message: 'Git repository added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/git/:id/deploy - Trigger manual deploy
router.post('/:id/deploy', requireAuth, async (req, res) => {
    const repoId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const [rows] = await pool.promise().query('SELECT * FROM git_repos WHERE id = ?', [repoId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const repo = rows[0];
        if (!isAdmin && repo.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        // Update status in WHM
        await pool.promise().query('UPDATE git_repos SET status = "deploying" WHERE id = ?', [repoId]);

        // Forward to Agent
        const response = await agentApi.post('/git/deploy', {
            repoUrl: repo.repoUrl,
            branch: repo.branch,
            deployPath: repo.deployPath
        });

        res.json({ message: 'Deployment started', jobId: response.data.jobId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/git/:id/history - Get deploy history
router.get('/:id/history', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.promise().query(
            'SELECT * FROM git_deploy_history WHERE repoId = ? ORDER BY createdAt DESC LIMIT 50',
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/git/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT userId FROM git_repos WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (req.userRole !== 'admin' && rows[0].userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

        await pool.promise().query('DELETE FROM git_repos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Repository removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
