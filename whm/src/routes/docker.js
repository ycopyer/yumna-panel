const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/docker/servers - Get available servers for Docker deployment
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

// GET /api/docker/containers - List Docker Containers
router.get('/containers', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM docker_containers';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';

        const [rows] = await pool.promise().query(query, params);

        // Enrich with real-time stats from Agent
        const enriched = await Promise.all(rows.map(async (container) => {
            try {
                const [serverRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [container.serverId || 1]);
                if (serverRows.length === 0) return container;

                const server = serverRows[0];
                const agentUrl = server.is_local
                    ? (process.env.AGENT_URL || 'http://localhost:4001')
                    : `http://${server.ip}:4001`;

                const agentClient = axios.create({
                    baseURL: agentUrl,
                    headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
                    timeout: 5000
                });

                const statsRes = await agentClient.get(`/docker/stats/${container.containerId}`);
                return {
                    ...container,
                    stats: statsRes.data,
                    serverName: server.name,
                    serverIp: server.ip
                };
            } catch (err) {
                console.error(`[DOCKER] Failed to get stats for container ${container.id}:`, err.message);
                return container;
            }
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/docker/containers - Create Docker Container
router.post('/containers', requireAuth, async (req, res) => {
    const { name, image, ports, volumes, env, serverId } = req.body;
    const userId = req.userId;
    let selectedServerId = serverId || 1;

    if (!name || !image) {
        return res.status(400).json({ error: 'Container name and image are required' });
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

        // Check if container name already exists
        const [existing] = await connection.query('SELECT id FROM docker_containers WHERE name = ? AND serverId = ?', [name, selectedServerId]);
        if (existing.length > 0) {
            throw new Error('Container with this name already exists on this server');
        }

        // Determine Agent URL
        const agentUrl = selectedServer.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${selectedServer.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 30000 // Docker operations can take time
        });

        // Create container on Agent
        const response = await agentClient.post('/docker/create', {
            name,
            image,
            ports: ports || [],
            volumes: volumes || [],
            env: env || {}
        });

        const containerId = response.data.containerId;

        // Save to database
        await connection.query(
            'INSERT INTO docker_containers (userId, serverId, name, image, containerId, ports, volumes, env, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, selectedServerId, name, image, containerId, JSON.stringify(ports || []), JSON.stringify(volumes || []), JSON.stringify(env || {}), 'running']
        );

        await connection.commit();

        console.log(`[DOCKER] Container "${name}" created on server "${selectedServer.name}"`);

        res.status(201).json({
            message: 'Docker container created successfully',
            containerId,
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

// DELETE /api/docker/containers/:id - Delete Docker Container
router.delete('/containers/:id', requireAuth, async (req, res) => {
    const containerId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM docker_containers WHERE id = ?', [containerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const container = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [container.serverId || 1]);
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
            await agentClient.delete(`/docker/${container.containerId}`);
        }

        // Delete from database
        await connection.query('DELETE FROM docker_containers WHERE id = ?', [containerId]);

        res.json({ message: 'Docker container deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// POST /api/docker/containers/:id/start - Start Container
router.post('/containers/:id/start', requireAuth, async (req, res) => {
    const containerId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const [rows] = await pool.promise().query('SELECT * FROM docker_containers WHERE id = ?', [containerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const container = rows[0];
        const [serverRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [container.serverId || 1]);
        const server = serverRows[0];

        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
        });

        await agentClient.post(`/docker/${container.containerId}/start`);
        await pool.promise().query('UPDATE docker_containers SET status = ? WHERE id = ?', ['running', containerId]);

        res.json({ message: 'Container started successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/docker/containers/:id/stop - Stop Container
router.post('/containers/:id/stop', requireAuth, async (req, res) => {
    const containerId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const [rows] = await pool.promise().query('SELECT * FROM docker_containers WHERE id = ?', [containerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const container = rows[0];
        const [serverRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [container.serverId || 1]);
        const server = serverRows[0];

        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
        });

        await agentClient.post(`/docker/${container.containerId}/stop`);
        await pool.promise().query('UPDATE docker_containers SET status = ? WHERE id = ?', ['stopped', containerId]);

        res.json({ message: 'Container stopped successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
