const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const tunnelManager = require('../services/TunnelManagerService');
const { requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Start Shell Session (Tunnel Only for now)
router.post('/start', requireAdmin, async (req, res) => {
    const { serverId } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (!rows.length) return res.status(404).json({ error: 'Server not found' });
        const server = rows[0];

        if (server.connection_type === 'tunnel') {
            const shellId = uuidv4();
            // Send command to Agent to spawn shell
            await tunnelManager.sendCommand(server.agent_id, 'START_SHELL', { shellId });
            return res.json({ shellId, mode: 'tunnel', status: 'connected' });
        } else {
            return res.status(400).json({ error: 'Persistent WebSSH is currently only available for Tunnel Agents' });
        }
    } catch (err) {
        console.error('Terminal Start Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send Input to Shell
router.post('/input', requireAdmin, async (req, res) => {
    const { serverId, shellId, data } = req.body; // data string (will be base64 encoded by logic if needed, but lets assume frontend sends raw and we encode, or frontend sends base64)
    // Let's assume frontend sends RAW text, we encode here to base64 for JSON safety

    try {
        const [rows] = await pool.promise().query('SELECT agent_id, connection_type FROM servers WHERE id = ?', [serverId]);
        if (!rows.length) return res.status(404).json({ error: 'Server not found' });
        const server = rows[0];

        if (server.connection_type === 'tunnel') {
            const ws = tunnelManager.activeTunnels.get(server.agent_id);
            if (ws && ws.readyState === 1) { // OPEN
                const inputBase64 = Buffer.from(data).toString('base64');
                ws.send(JSON.stringify({
                    type: 'SHELL_INPUT',
                    data: { shellId, input: inputBase64 }
                }));
                res.json({ status: 'sent' });
            } else {
                res.status(503).json({ error: 'Tunnel disconnected' });
            }
        } else {
            res.status(400).json({ error: 'Not a tunnel server' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Poll Output from Shell
router.get('/output', requireAdmin, async (req, res) => {
    const { shellId } = req.query;
    try {
        // Consume from buffer manager in TunnelManagerService
        const data = tunnelManager.consumeShellBuffer(shellId);
        res.json({ events: data }); // Array of objects { stream: 'stdout'|'stderr', data: 'base64...' }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stop/Kill Shell
router.post('/stop', requireAdmin, async (req, res) => {
    const { serverId, shellId } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT agent_id, connection_type FROM servers WHERE id = ?', [serverId]);
        if (rows.length && rows[0].connection_type === 'tunnel') {
            const ws = tunnelManager.activeTunnels.get(rows[0].agent_id);
            if (ws) {
                ws.send(JSON.stringify({ type: 'KILL_SHELL', data: { shellId } }));
            }
        }
        res.json({ status: 'stopped' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
