const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// GET /api/ftp/servers - Get available servers for FTP deployment
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

// GET /api/ftp/accounts - List FTP Accounts
router.get('/accounts', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM ftp_accounts';
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

// POST /api/ftp/accounts - Create FTP Account
router.post('/accounts', requireAuth, async (req, res) => {
    const { username, password, homedir, serverId } = req.body;
    const userId = req.userId;
    let selectedServerId = serverId || 1;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
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

        // Check if username already exists
        const [existing] = await connection.query('SELECT id FROM ftp_accounts WHERE username = ?', [username]);
        if (existing.length > 0) {
            throw new Error('FTP username already exists');
        }

        // Auto-generate homedir if not provided
        const ftpHomedir = homedir || (selectedServer.is_local
            ? `C:/YumnaPanel/ftp/${username}`
            : `/home/ftp/${username}`);

        // Determine Agent URL
        const agentUrl = selectedServer.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${selectedServer.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET },
            timeout: 10000
        });

        // Create FTP account on Agent
        await agentClient.post('/ftp/create', {
            username,
            password,
            homedir: ftpHomedir
        });

        // Save to database
        await connection.query(
            'INSERT INTO ftp_accounts (userId, serverId, username, password, homedir) VALUES (?, ?, ?, ?, ?)',
            [userId, selectedServerId, username, password, ftpHomedir]
        );

        await connection.commit();

        console.log(`[FTP] Account "${username}" created on server "${selectedServer.name}"`);

        res.status(201).json({
            message: 'FTP account created successfully',
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

// DELETE /api/ftp/accounts/:id - Delete FTP Account
router.delete('/accounts/:id', requireAuth, async (req, res) => {
    const accountId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM ftp_accounts WHERE id = ?', [accountId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'FTP account not found' });
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
            await agentClient.delete(`/ftp/${account.username}`);
        }

        // Delete from database
        await connection.query('DELETE FROM ftp_accounts WHERE id = ?', [accountId]);

        res.json({ message: 'FTP account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
