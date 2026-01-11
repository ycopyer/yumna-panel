const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireAdmin } = require('../../middleware/auth');
const { encrypt, decrypt } = require('../../utils/helpers');

// GET all servers
router.get('/servers', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name, hostname, ip, status, is_local, ssh_user, ssh_port, last_seen, cpu_usage, ram_usage, disk_usage, uptime, createdAt FROM servers ORDER BY is_local DESC, name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE server
router.post('/servers', requireAdmin, async (req, res) => {
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, status } = req.body;

    if (!name || !hostname || !ip) {
        return res.status(400).json({ error: 'Name, Hostname, and IP are required' });
    }

    try {
        const encryptedPass = ssh_password ? encrypt(ssh_password) : null;
        const [result] = await db.promise().query(
            'INSERT INTO servers (name, hostname, ip, ssh_user, ssh_password, ssh_port, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, hostname, ip, ssh_user || 'root', encryptedPass, ssh_port || 22, status || 'active']
        );
        res.json({ id: result.insertId, message: 'Server added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE server
router.put('/servers/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, status } = req.body;

    try {
        let query = 'UPDATE servers SET name=?, hostname=?, ip=?, ssh_user=?, ssh_port=?, status=?';
        let params = [name, hostname, ip, ssh_user, ssh_port, status];

        if (ssh_password) {
            query += ', ssh_password=?';
            params.push(encrypt(ssh_password));
        }

        query += ' WHERE id=?';
        params.push(id);

        await db.promise().query(query, params);
        res.json({ message: 'Server updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE server
router.delete('/servers/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting local node
        const [server] = await db.promise().query('SELECT is_local FROM servers WHERE id=?', [id]);
        if (server.length > 0 && server[0].is_local) {
            return res.status(400).json({ error: 'Cannot delete the local node' });
        }

        await db.promise().query('DELETE FROM servers WHERE id=?', [id]);
        res.json({ message: 'Server removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
