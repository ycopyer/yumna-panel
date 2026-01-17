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

    console.log('[TUNNEL-MAPPING] Creating mapping for server:', serverId, 'masterPort:', masterPort);

    try {
        // Verify server has agent_id (must be a tunnel server)
        const [serverRows] = await pool.promise().query('SELECT agent_id FROM servers WHERE id = ?', [serverId]);
        if (serverRows.length === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }

        if (!serverRows[0].agent_id) {
            return res.status(400).json({ error: 'Selected server does not support tunnel port forwarding (No Agent ID). Use Reverse Tunnel mode on Agent.' });
        }

        // Check if masterPort already exists
        const [existing] = await pool.promise().query('SELECT id FROM tunnel_mappings WHERE masterPort = ?', [masterPort]);
        if (existing.length > 0) {
            return res.status(400).json({ error: `Master port ${masterPort} is already in use by another mapping.` });
        }

        await pool.promise().query(
            'INSERT INTO tunnel_mappings (serverId, masterPort, agentPort, description) VALUES (?, ?, ?, ?)',
            [serverId, masterPort, agentPort, description]
        );

        console.log('[TUNNEL-MAPPING] Success inserting to DB. Reloading service...');

        // Reload in service
        await tcpForwarder.reloadMappings();

        console.log('[TUNNEL-MAPPING] Service reloaded.');

        res.status(201).json({ message: 'Mapping created successfully' });
    } catch (err) {
        console.error('[TUNNEL-MAPPING] Error creating mapping:', err);
        res.status(500).json({
            error: 'Internal Server Error: ' + err.message,
            details: err.stack
        });
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
