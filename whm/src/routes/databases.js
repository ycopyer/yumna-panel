const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// Configure Agent for local (default)
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
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

        // Fetch real stats from Agent
        const enriched = await Promise.all(rows.map(async (db) => {
            try {
                // orchestration: call agent for stats
                const statsRes = await agentApi.get('/db/stats', { params: { name: db.name } });
                return { ...db, ...statsRes.data };
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
    const { name, user, password } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!name || !user || !password) return res.status(400).json({ error: 'Missing required fields' });

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

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

        // Trigger Agent
        await agentApi.post('/db/create', { name, user, password });

        // Record in WHM
        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [userId, name, user, password]
        );

        await connection.commit();
        res.status(201).json({ message: 'Database created successfully' });
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

        // Trigger Agent
        await agentApi.post('/db/drop', { name: db.name, user: db.user });

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

        // Trigger Agent
        await agentApi.post('/db/clone', {
            source: sourceDb.name,
            target: newName,
            user: sourceDb.user,
            password: sourceDb.password
        });

        // Record it
        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [sourceDb.userId, newName, sourceDb.user, sourceDb.password]
        );

        res.json({ message: 'Database cloned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
