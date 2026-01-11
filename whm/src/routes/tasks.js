const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// GET /api/task/:id - Proxy to Agent Node
router.get('/:id', requireAuth, async (req, res) => {
    try {
        // In v3, we might need to know WHICH node the task is on.
        // For now, we assume primary agent or look it up if needed.
        // But jobId could encoded the nodeId.

        const response = await agentApi.get(`/task/${req.params.id}`);
        res.json(response.data);
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        res.status(500).json({ error: 'Agent communication failed' });
    }
});

module.exports = router;
