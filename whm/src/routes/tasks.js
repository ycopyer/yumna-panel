const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// Helper to get agent client
const getAgentClient = async (serverId) => {
    let server;
    if (serverId) {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        server = rows[0];
    } else {
        // Default to local server (id=1)
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = 1');
        server = rows[0];
    }

    if (server.status !== 'active') throw new Error('Server is not active');

    const agentUrl = server.is_local
        ? (process.env.AGENT_URL || 'http://localhost:4001')
        : `http://${server.ip}:4001`;

    return {
        client: axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 30000 // Tasks can take time
        }),
        server
    };
};

// POST /api/task/run - Run a task on a specific server
router.post('/run', requireAuth, requireAdmin, async (req, res) => {
    const { command, args, serverId, background } = req.body;

    try {
        const { client, server } = await getAgentClient(serverId);

        // Dispatch task to agent
        const response = await client.post('/task/run', {
            command,
            args,
            background
        });

        res.json({
            message: 'Task dispatched successfully',
            taskId: response.data.taskId,
            output: response.data.output,
            server: {
                id: server.id,
                name: server.name
            }
        });
    } catch (err) {
        const msg = err.response?.data?.error || err.message;
        res.status(500).json({ error: `Task execution failed: ${msg}` });
    }
});

// GET /api/task/:id - Get task status (Proxy to Agent)
// We need serverId to know WHERE to look, or we assume the frontend knows
router.get('/:id', requireAuth, async (req, res) => {
    const { serverId } = req.query; // Pass serverId as query param

    try {
        const { client } = await getAgentClient(serverId);

        const response = await client.get(`/task/${req.params.id}`);
        res.json(response.data);
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        res.status(500).json({ error: 'Agent communication failed' });
    }
});

module.exports = router;
