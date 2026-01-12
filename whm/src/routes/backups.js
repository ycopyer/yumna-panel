const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/backups - List Backups
router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM backups';
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

// POST /api/backups/create - Create Backup
router.post('/create', requireAuth, async (req, res) => {
    const { type, resourceId, serverId } = req.body;
    const userId = req.userId;
    let targetServerId = serverId;

    if (!type || !resourceId) {
        return res.status(400).json({ error: 'Type and resourceId are required' });
    }

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Auto-detect serverId from resource if not provided
        if (!targetServerId) {
            if (type === 'website') {
                const [rows] = await connection.query('SELECT serverId FROM websites WHERE id = ?', [resourceId]);
                if (rows.length > 0) targetServerId = rows[0].serverId;
            } else if (type === 'database') {
                const [rows] = await connection.query('SELECT serverId FROM `databases` WHERE id = ?', [resourceId]);
                if (rows.length > 0) targetServerId = rows[0].serverId;
            }
        }

        if (!targetServerId) targetServerId = 1;

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [targetServerId]);
        if (serverRows.length === 0) {
            throw new Error('Server not found');
        }
        const server = serverRows[0];

        if (server.status !== 'active') {
            throw new Error(`Server "${server.name}" is not active`);
        }

        // Determine Agent URL
        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 60000 // Backups can take time
        });

        // Create backup on Agent
        const response = await agentClient.post('/backup/create', {
            type,
            resourceId
        });

        const backupPath = response.data.backupPath;
        const backupSize = response.data.size || 0;

        // Save to database
        const [result] = await connection.query(
            'INSERT INTO backups (userId, serverId, type, resourceId, backupPath, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, targetServerId, type, resourceId, backupPath, backupSize, 'completed']
        );

        await connection.commit();

        console.log(`[BACKUP] Created ${type} backup for resource ${resourceId} on server "${server.name}"`);

        res.status(201).json({
            message: 'Backup created successfully',
            backupId: result.insertId,
            backupPath,
            size: backupSize,
            server: {
                id: server.id,
                name: server.name,
                ip: server.ip
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// POST /api/backups/:id/restore - Restore Backup
router.post('/:id/restore', requireAuth, async (req, res) => {
    const backupId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM backups WHERE id = ?', [backupId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Backup not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const backup = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [backup.serverId || 1]);
        if (serverRows.length === 0) {
            throw new Error('Server not found');
        }
        const server = serverRows[0];

        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 60000
        });

        // Restore backup on Agent
        await agentClient.post('/backup/restore', {
            backupPath: backup.backupPath,
            type: backup.type,
            resourceId: backup.resourceId
        });

        res.json({
            message: 'Backup restored successfully',
            server: {
                id: server.id,
                name: server.name,
                ip: server.ip
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE /api/backups/:id - Delete Backup
router.delete('/:id', requireAuth, async (req, res) => {
    const backupId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM backups WHERE id = ?', [backupId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Backup not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const backup = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [backup.serverId || 1]);
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
            await agentClient.delete(`/backup/${backup.backupPath}`);
        }

        // Delete from database
        await connection.query('DELETE FROM backups WHERE id = ?', [backupId]);

        res.json({ message: 'Backup deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
