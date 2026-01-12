const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/email/servers - Get available servers for email deployment
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

// GET /api/email/accounts - List Email Accounts
router.get('/accounts', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM email_accounts';
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

// POST /api/email/accounts - Create Email Account
router.post('/accounts', requireAuth, async (req, res) => {
    const { email, password, quota, serverId } = req.body;
    const userId = req.userId;
    let selectedServerId = serverId || 1;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
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

        // Check if email already exists
        const [existing] = await connection.query('SELECT id FROM email_accounts WHERE email = ?', [email]);
        if (existing.length > 0) {
            throw new Error('Email account already exists');
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

        // Create email account on Agent
        await agentClient.post('/email/create', {
            email,
            password,
            quota: quota || 1024 // MB
        });

        // Save to database
        await connection.query(
            'INSERT INTO email_accounts (userId, serverId, email, password, quota) VALUES (?, ?, ?, ?, ?)',
            [userId, selectedServerId, email, password, quota || 1024]
        );

        await connection.commit();

        console.log(`[EMAIL] Account "${email}" created on server "${selectedServer.name}"`);

        res.status(201).json({
            message: 'Email account created successfully',
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

// DELETE /api/email/accounts/:id - Delete Email Account
router.delete('/accounts/:id', requireAuth, async (req, res) => {
    const accountId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM email_accounts WHERE id = ?', [accountId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Email account not found' });
        }
        if (!isAdmin && rows[0].userId != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const account = rows[0];

        // Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [account.serverId || 1]);
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
            await agentClient.delete(`/email/${account.email}`);
        }

        // Delete from database
        await connection.query('DELETE FROM email_accounts WHERE id = ?', [accountId]);

        res.json({ message: 'Email account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
