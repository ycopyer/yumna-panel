const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');
const agentDispatcher = require('../services/AgentDispatcherService');

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
                const stats = await agentDispatcher.dispatchDbAction(db.serverId || 1, 'stats', { name: db.name });
                return { ...db, ...stats, serverName: db.serverName || 'Server' };
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

        // Trigger Agent to create database via Dispatcher
        await agentDispatcher.dispatchDbAction(selectedServerId, 'create', { name, user, password });

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

        // Trigger Agent via Dispatcher
        if (db.serverId) {
            await agentDispatcher.dispatchDbAction(db.serverId, 'drop', { name: db.name, user: db.user });
        }

        // Delete Record
        await connection.query('DELETE FROM `databases` WHERE id = ?', [dbId]);
        await connection.commit();

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

        // Trigger Agent via Dispatcher
        await agentDispatcher.dispatchDbAction(sourceDb.serverId || 1, 'clone', {
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

// POST /api/databases/sync - Sync existing databases from Agent to WHM
router.post('/sync', requireAuth, requireAdmin, async (req, res) => {
    const { serverId } = req.body;
    if (!serverId) return res.status(400).json({ error: 'serverId is required' });

    try {
        const dbs = await agentDispatcher.dispatchDbAction(serverId, 'list');

        const connection = await pool.promise().getConnection();
        try {
            await connection.beginTransaction();

            for (const db of dbs) {
                // Check if already in WHM
                const [existing] = await connection.query('SELECT id FROM `databases` WHERE serverId = ? AND name = ?', [serverId, db.name]);
                if (existing.length === 0) {
                    await connection.query(
                        'INSERT INTO `databases` (userId, serverId, name, user, password) VALUES (?, ?, ?, ?, ?)',
                        [req.userId, serverId, db.name, 'imported', 'imported']
                    );
                }
            }

            await connection.commit();
            res.json({ message: `Synced ${dbs.length} databases successfully`, count: dbs.length });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
