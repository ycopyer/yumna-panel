const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/databases/servers - Get available servers for database deployment
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

// List Databases
router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';
    const targetUserId = req.query.targetUserId;

    try {
        let query = 'SELECT * FROM `databases`';
        let params = [];
        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        } else if (targetUserId) {
            query += ' WHERE userId = ?';
            params.push(targetUserId);
        }
        query += ' ORDER BY createdAt DESC';

        const [rows] = await pool.promise().query(query, params);

        // Fetch real stats from Agent (for each server)
        const enriched = await Promise.all(rows.map(async (db) => {
            try {
                // Get server info
                const [serverRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [db.serverId || 1]);
                if (serverRows.length === 0) {
                    return { ...db, size_mb: 0, table_count: 0, error: 'Server not found' };
                }

                const server = serverRows[0];
                const agentUrl = server.is_local
                    ? (process.env.AGENT_URL || 'http://localhost:4001')
                    : `http://${server.ip}:4001`;

                const agentClient = axios.create({
                    baseURL: agentUrl,
                    headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
                    timeout: 5000
                });

                const statsRes = await agentClient.get('/db/stats', { params: { name: db.name } });
                return { ...db, ...statsRes.data, serverName: server.name };
            } catch (e) {
                return { ...db, size_mb: 0, table_count: 0, error: 'Agent error' };
            }
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Database
router.post('/', requireAuth, async (req, res) => {
    const { name, user, password, serverId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';
    let selectedServerId = serverId || 1; // Default to server 1

    if (!name || !user || !password) return res.status(400).json({ error: 'Missing required fields' });

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

        // Quota Check
        if (!isAdmin) {
            const [uRows] = await connection.query('SELECT max_databases FROM users WHERE id = ?', [userId]);
            const max = uRows[0]?.max_databases ?? 3;
            const [cRows] = await connection.query('SELECT COUNT(*) as count FROM `databases` WHERE userId = ?', [userId]);
            if (cRows[0].count >= max) throw new Error(`Quota exceeded: Max ${max} databases.`);
        }

        // Check Duplicates in WHM
        const [existing] = await connection.query('SELECT id FROM `databases` WHERE name = ?', [name]);
        if (existing.length > 0) throw new Error('Database name already exists');

        // Determine Agent URL
        const agentUrl = selectedServer.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${selectedServer.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
            timeout: 10000
        });

        // Trigger Agent to create database
        await agentClient.post('/db/create', { name, user, password });

        // Record in WHM with serverId
        await connection.query(
            'INSERT INTO `databases` (userId, serverId, name, user, password) VALUES (?, ?, ?, ?, ?)',
            [userId, selectedServerId, name, user, password]
        );

        await connection.commit();

        console.log(`[DATABASE] "${name}" created on server "${selectedServer.name}"`);

        res.status(201).json({
            message: 'Database created successfully',
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

// Delete Database
router.delete('/:id', requireAuth, async (req, res) => {
    const dbId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM `databases` WHERE id = ?', [dbId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const db = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [db.serverId || 1]);
        if (serverRows.length > 0) {
            const server = serverRows[0];
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const agentClient = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
                timeout: 10000
            });

            // Trigger Agent
            await agentClient.post('/db/drop', { name: db.name, user: db.user });
        }

        // Delete Record
        await connection.query('DELETE FROM `databases` WHERE id = ?', [dbId]);

        res.json({ message: 'Database deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Clone Database
router.post('/:id/clone', requireAuth, async (req, res) => {
    const { newName } = req.body;
    const dbId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM `databases` WHERE id = ?', [dbId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const sourceDb = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [sourceDb.serverId || 1]);
        if (serverRows.length === 0) {
            throw new Error('Server not found');
        }

        const server = serverRows[0];
        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
            timeout: 30000 // Clone might take longer
        });

        // Trigger Agent
        await agentClient.post('/db/clone', {
            source: sourceDb.name,
            target: newName,
            user: sourceDb.user,
            password: sourceDb.password
        });

        // Record it (same server as source)
        await connection.query(
            'INSERT INTO `databases` (userId, serverId, name, user, password) VALUES (?, ?, ?, ?, ?)',
            [sourceDb.userId, sourceDb.serverId, newName, sourceDb.user, sourceDb.password]
        );

        res.json({ message: 'Database cloned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
