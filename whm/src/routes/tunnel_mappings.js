const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const tcpForwarder = require('../services/TcpForwarderService');

// GET /api/tunnel-mappings
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT tm.*, s.name as serverName 
            FROM tunnel_mappings tm
            JOIN servers s ON tm.serverId = s.id
            ORDER BY tm.createdAt DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tunnel-mappings
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { serverId, masterPort, agentPort, description } = req.body;

    if (!serverId || !masterPort || !agentPort) {
        return res.status(400).json({ error: 'serverId, masterPort, and agentPort are required' });
    }

    try {
        // Verify server has agent_id (must be a tunnel server)
        const [servers] = await pool.promise().query('SELECT agent_id FROM servers WHERE id = ?', [serverId]);
        if (servers.length === 0 || !servers[0].agent_id) {
            return res.status(400).json({ error: 'Selected server does not support tunnel port forwarding (No Agent ID)' });
        }

        await pool.promise().query(
            'INSERT INTO tunnel_mappings (serverId, masterPort, agentPort, description) VALUES (?, ?, ?, ?)',
            [serverId, masterPort, agentPort, description]
        );

        // Reload in service
        await tcpForwarder.reloadMappings();

        res.status(201).json({ message: 'Mapping created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/tunnel-mappings/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM tunnel_mappings WHERE id = ?', [req.params.id]);

        // Reload in service
        await tcpForwarder.reloadMappings();

        res.json({ message: 'Mapping deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
