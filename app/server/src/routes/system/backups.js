const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const { encrypt, decrypt } = require('../../utils/helpers');
const BackupService = require('../../services/BackupService');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// --- BACKUP HISTORY ---
// --- BACKUP STATS ---
router.get('/backups/stats', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT 
                COUNT(*) as count,
                SUM(size) as total_size,
                SUM(CASE WHEN storage_type = 'local' THEN size ELSE 0 END) as local_size,
                SUM(CASE WHEN storage_type != 'local' THEN size ELSE 0 END) as remote_size
            FROM backups
            WHERE status = 'completed'
        `;
        let params = [];
        if (!isAdmin) {
            query += ' AND userId = ?';
            params.push(userId);
        }

        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows[0] || { count: 0, total_size: 0, local_size: 0, remote_size: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/backups', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT b.*, s.name as schedule_name, r.name as storage_name 
            FROM backups b
            LEFT JOIN backup_schedules s ON b.scheduleId = s.id
            LEFT JOIN remote_storage_configs r ON b.storageId = r.id
        `;
        let params = [];
        if (!isAdmin) {
            query += ' WHERE b.userId = ?';
            params.push(userId);
        }
        query += ' ORDER BY b.createdAt DESC LIMIT 50';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backups', requireAuth, auditLogger('CREATE_BACKUP'), async (req, res) => {
    const { target, storageId, encrypted } = req.body;
    const userId = req.userId;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.query(
            'INSERT INTO backups (userId, type, target, storageId, status) VALUES (?, "manual", ?, ?, "pending")',
            [userId, target || 'full', storageId || null]
        );
        const backupId = result.insertId;
        await connection.end();

        // Run in background
        BackupService.performBackup(backupId, {
            userId,
            target: target || 'full',
            storageId: storageId || null,
            encrypted: !!encrypted
        });

        res.json({ success: true, message: 'Backup task started', backupId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/backups/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT filePath, userId FROM backups WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Backup not found' });

        if (rows[0].userId !== userId && req.userRole !== 'admin') {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (rows[0].filePath && fs.existsSync(rows[0].filePath)) {
            try { fs.unlinkSync(rows[0].filePath); } catch (e) { }
        }

        await connection.query('DELETE FROM backups WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BACKUP SCHEDULES ---
router.get('/backups/schedules', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(
            'SELECT s.*, r.name as storage_name FROM backup_schedules s LEFT JOIN remote_storage_configs r ON s.storageId = r.id WHERE s.userId = ?',
            [req.userId]
        );
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backups/schedules', requireAuth, auditLogger('CREATE_BACKUP_SCHEDULE'), async (req, res) => {
    const { name, type, target, storageId, keepBackups } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const nextRun = BackupService.calculateNextRun(type, new Date());
        const [result] = await connection.query(
            'INSERT INTO backup_schedules (userId, name, type, target, storageId, keepBackups, nextRun) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.userId, name, type, target, storageId || null, keepBackups || 7, nextRun]
        );
        await connection.end();
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/backups/schedules/:id', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM backup_schedules WHERE id = ? AND userId = ?', [req.params.id, req.userId]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REMOTE STORAGE ---
router.get('/backups/storage', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(
            'SELECT id, name, provider, isActive, createdAt FROM remote_storage_configs WHERE userId = ?',
            [req.userId]
        );
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backups/storage', requireAuth, auditLogger('CONFIGURE_REMOTE_STORAGE'), async (req, res) => {
    const { name, provider, config } = req.body;
    try {
        const encryptedConfig = encrypt(JSON.stringify(config));
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.query(
            'INSERT INTO remote_storage_configs (userId, name, provider, config) VALUES (?, ?, ?, ?)',
            [req.userId, name, provider, encryptedConfig]
        );
        await connection.end();
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backups/storage/test', requireAuth, async (req, res) => {
    const { provider, config } = req.body;

    if (provider === 'sftp') {
        const sftp = new SftpClient();
        try {
            await sftp.connect({
                host: config.host,
                port: parseInt(config.port) || 22,
                username: config.username,
                password: config.password,
                timeout: 10000
            });
            await sftp.end();
            res.json({ success: true, message: 'SFTP connection successful!' });
        } catch (err) {
            res.status(400).json({ error: 'Connection failed: ' + err.message });
        }
    } else {
        res.status(400).json({ error: 'Provider test not implemented yet' });
    }
});

router.delete('/backups/storage/:id', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM remote_storage_configs WHERE id = ? AND userId = ?', [req.params.id, req.userId]);
        await connection.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/backups/:id/verify', requireAuth, async (req, res) => {
    try {
        const result = await BackupService.verifyBackup(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/backups/:id/restore', requireAuth, auditLogger('RESTORE_BACKUP'), async (req, res) => {
    try {
        const result = await BackupService.restoreBackup(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
