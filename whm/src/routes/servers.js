const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const serverNodeService = require('../services/ServerNodeService');
const { encrypt } = require('../utils/helpers');

// List all servers
router.get('/', requireAuth, async (req, res) => {
    try {
        const [servers] = await pool.promise().query('SELECT id, name, hostname, ip, is_local, status, cpu_usage, ram_usage, disk_usage, last_seen FROM servers');
        res.json(servers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get server details
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        // Don't leak password
        delete rows[0].ssh_password;
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new server
router.post('/', requireAdmin, async (req, res) => {
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, is_local } = req.body;

    // Check local
    if (is_local) {
        // Only one local server allowed usually (The Controller)
        // But for flexible topology, let's allow it but warn or check logic specific to local agent
    }

    try {
        const encryptedPass = ssh_password ? encrypt(ssh_password) : null;
        const [result] = await pool.promise().query(
            `INSERT INTO servers (name, hostname, ip, is_local, ssh_user, ssh_password, ssh_port, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown')`,
            [name, hostname, ip, is_local ? 1 : 0, ssh_user, encryptedPass, ssh_port || 22]
        );

        // Trigger immediate check
        const newServerId = result.insertId;
        const [newRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [newServerId]);

        // Sync in background
        if (newRows[0].is_local) {
            serverNodeService.checkLocalAgent(newRows[0]);
        } else {
            serverNodeService.checkRemote(newRows[0]);
        }

        res.json({ message: 'Server added successfully', id: newServerId });
    } catch (error) {
        console.error('Add server error:', error);
        res.status(500).json({ error: 'Failed to add server' });
    }
});

// Update server
router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, status } = req.body;

    try {
        let query = 'UPDATE servers SET name = ?, hostname = ?, ip = ?, ssh_user = ?, ssh_port = ?, status = ?';
        let params = [name, hostname, ip, ssh_user, ssh_port, status];

        if (ssh_password) {
            query += ', ssh_password = ?';
            params.push(encrypt(ssh_password));
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.promise().query(query, params);
        res.json({ message: 'Server updated successfully' });
    } catch (error) {
        console.error('Update server error:', error);
        res.status(500).json({ error: 'Failed to update server' });
    }
});

// Remove server
router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting the local master node if it's the only one/critical
        const [rows] = await pool.promise().query('SELECT is_local FROM servers WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].is_local) {
            return res.status(400).json({ error: 'Cannot delete the Local Master Node' });
        }

        await pool.promise().query('DELETE FROM servers WHERE id = ?', [id]);
        res.json({ message: 'Server removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const agentApi = axios.create({
    headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
});

// Force Sync
router.post('/:id/sync', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        if (server.is_local) {
            await serverNodeService.checkLocalAgent(server);
        } else {
            await serverNodeService.checkRemote(server);
        }
        res.json({ message: 'Sync triggered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/restart', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { service } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        const baseURL = server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`;

        const response = await agentApi.post(`${baseURL}/system/restart`, { service });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/logs', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { lines } = req.query;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        const baseURL = server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`;

        const response = await agentApi.get(`${baseURL}/system/logs`, { params: { lines } });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const agentDeploymentService = require('../services/AgentDeploymentService');

// Deploy Agent to Remote Server
router.post('/:id/deploy-agent', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { dbConfig } = req.body;
    try {
        const result = await agentDeploymentService.deploy(id, dbConfig);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check Deployment Status
router.get('/:id/deploy-status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const status = agentDeploymentService.getDeploymentStatus(id);
    res.json({ status });
});

module.exports = router;
