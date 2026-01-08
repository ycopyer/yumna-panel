const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { encrypt } = require('../../utils/helpers');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { uploadAvatar } = require('../../middleware/upload');
const argon2 = require('argon2');

// GET all users
router.get('/users', requireAdmin, (req, res) => {
    db.query(`
        SELECT u.id, u.username, u.role, u.status, u.email, u.shell, u.storage_quota, u.used_storage, 
               u.cpu_quota, u.ram_quota, u.two_factor_enabled, u.createdAt,
               s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath,
               COALESCE(w.web_count, 0) as website_count
        FROM users u
        LEFT JOIN sftp_configs s ON u.id = s.userId
        LEFT JOIN (
            SELECT userId, COUNT(*) as web_count 
            FROM websites 
            GROUP BY userId
        ) w ON u.id = w.userId
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});


// CREATE user
router.post('/users', requireAdmin, async (req, res) => {
    const { username, password, role, email, status, shell, storage_quota, cpu_quota, ram_quota, two_factor_enabled } = req.body;

    try {
        const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

        db.query(`INSERT INTO users (username, password, role, email, status, shell, storage_quota, cpu_quota, ram_quota, two_factor_enabled) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, role || 'user', email, status || 'active', shell || '/bin/bash',
                storage_quota || 1073741824, cpu_quota || 100, ram_quota || 536870912, two_factor_enabled ? 1 : 0], (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, userId: results.insertId });
                });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to hash password' });
    }
});

// UPDATE user
router.put('/users/:id', requireAdmin, async (req, res) => {
    const { username, password, role, email, status, shell, storage_quota, cpu_quota, ram_quota, two_factor_enabled } = req.body;
    const { id } = req.params;

    let query = 'UPDATE users SET username=?, role=?, email=?, status=?, shell=?, storage_quota=?, cpu_quota=?, ram_quota=?, two_factor_enabled=?';
    let params = [username, role, email, status, shell, storage_quota, cpu_quota, ram_quota, two_factor_enabled ? 1 : 0];

    if (password) {
        try {
            const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
            query += ', password=?';
            params.push(hashedPassword);
        } catch (e) {
            return res.status(500).json({ error: 'Failed to hash password' });
        }
    }

    query += ' WHERE id=?';
    params.push(id);

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (sftp) {
            const encryptedSftpPass = sftp.password ? encrypt(sftp.password) : null;
            const port = parseInt(sftp.port) || 22;
            if (encryptedSftpPass) {
                db.query(`INSERT INTO sftp_configs(userId, host, port, username, password, name, rootPath) VALUES(?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE host=VALUES(host), port=VALUES(port), username=VALUES(username), password=VALUES(password), name=VALUES(name), rootPath=VALUES(rootPath)`,
                    [id, sftp.host, port, sftp.username, encryptedSftpPass, sftp.name, sftp.rootPath], () => res.json({ success: true }));
            } else {
                db.query(`UPDATE sftp_configs SET host=?, port=?, username=?, name=?, rootPath=? WHERE userId=?`,
                    [sftp.host, port, sftp.username, sftp.name, sftp.rootPath, id], () => res.json({ success: true }));
            }
        } else res.json({ success: true });
    });
});

// GET Profile
router.get('/users/:id/profile', requireAuth, (req, res) => {
    const { id } = req.params;
    if (String(req.headers['x-user-id']) !== String(id) && req.userRole !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    db.query('SELECT u.username, u.role, u.email, u.two_factor_enabled, u.avatar, u.storage_quota, u.used_storage, s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath FROM users u LEFT JOIN sftp_configs s ON u.id = s.userId WHERE u.id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

router.delete('/users/:id', requireAdmin, (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
