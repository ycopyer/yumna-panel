const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/cron/servers - Get available servers for Cron deployment
router.get('/servers', requireAuth, async (req, res) => {
    try {
        const [servers] = await pool.promise().query(
            'SELECT id, name, hostname, ip, is_local, status, cpu_usage, ram_usage, disk_usage FROM servers WHERE status = ? ORDER BY is_local DESC, name ASC',
            ['active']
        );
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/cron/jobs - List Cron Jobs
router.get('/jobs', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM cron_jobs';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';

        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cron/jobs - Create Cron Job
router.post('/jobs', requireAuth, async (req, res) => {
    const { name, schedule, command, serverId } = req.body;
    const userId = req.userId;
    let selectedServerId = serverId || 1;

    if (!name || !schedule || !command) {
        return res.status(400).json({ error: 'Name, schedule, and command are required' });
    }

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Validate Server
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [selectedServerId]);
        if (serverRows.length === 0) {
            throw new Error('Selected server not found');
        }
        const selectedServer = serverRows[0];

        if (selectedServer.status !== 'active') {
            throw new Error(`Server "${selectedServer.name}" is not active`);
        }

        // Determine Agent URL
        const agentUrl = selectedServer.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${selectedServer.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 10000
        });

        // Create cron job on Agent
        const response = await agentClient.post('/cron/create', {
            name,
            schedule,
            command
        });

        // Save to database
        const [result] = await connection.query(
            'INSERT INTO cron_jobs (userId, serverId, name, schedule, command, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, selectedServerId, name, schedule, command, 'active']
        );

        await connection.commit();

        console.log(`[CRON] Job "${name}" created on server "${selectedServer.name}"`);

        res.status(201).json({
            message: 'Cron job created successfully',
            jobId: result.insertId,
            server: {
                id: selectedServer.id,
                name: selectedServer.name,
                ip: selectedServer.ip
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE /api/cron/jobs/:id - Delete Cron Job
router.delete('/jobs/:id', requireAuth, async (req, res) => {
    const jobId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM cron_jobs WHERE id = ?', [jobId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cron job not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const job = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [job.serverId || 1]);
        if (serverRows.length > 0) {
            const server = serverRows[0];
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const agentClient = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
                timeout: 10000
            });

            // Delete from Agent
            await agentClient.delete(`/cron/${job.name}`);
        }

        // Delete from database
        await connection.query('DELETE FROM cron_jobs WHERE id = ?', [jobId]);

        res.json({ message: 'Cron job deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/cron/jobs/:id/toggle - Toggle Cron Job Status
router.put('/jobs/:id/toggle', requireAuth, async (req, res) => {
    const jobId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM cron_jobs WHERE id = ?', [jobId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cron job not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const job = rows[0];
        const newStatus = job.status === 'active' ? 'inactive' : 'active';

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [job.serverId || 1]);
        if (serverRows.length > 0) {
            const server = serverRows[0];
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const agentClient = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
                timeout: 10000
            });

            // Toggle on Agent
            await agentClient.put(`/cron/${job.name}/toggle`, { status: newStatus });
        }

        // Update database
        await connection.query('UPDATE cron_jobs SET status = ? WHERE id = ?', [newStatus, jobId]);

        res.json({ message: `Cron job ${newStatus}`, status: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
