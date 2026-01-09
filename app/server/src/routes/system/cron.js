const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const cron = require('node-cron');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// GET all cron jobs
router.get('/cron', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM cron_jobs';
        let params = [];
        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE cron job
router.post('/cron', requireAuth, auditLogger('CREATE_CRON'), async (req, res) => {
    const { command, schedule, description } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!command || !schedule) return res.status(400).json({ error: 'Command and Schedule are required' });
    if (!cron.validate(schedule)) return res.status(400).json({ error: 'Invalid cron schedule format' });

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Quota Check
        if (!isAdmin) {
            const [userQuota] = await connection.query('SELECT max_cron_jobs FROM users WHERE id = ?', [userId]);
            const maxJobs = userQuota[0]?.max_cron_jobs ?? 2;
            const [countRes] = await connection.query('SELECT COUNT(*) as count FROM cron_jobs WHERE userId = ?', [userId]);

            if (countRes[0].count >= maxJobs) {
                await connection.end();
                return res.status(403).json({ error: `You have reached your limit of ${maxJobs} cron jobs.` });
            }
        }

        await connection.query('INSERT INTO cron_jobs (userId, command, schedule, description) VALUES (?, ?, ?, ?)',
            [userId, command, schedule, description || '']);

        await connection.end();

        // Notify Scheduler (if running in same process, or reload)
        // For now we will rely on Scheduler to poll or have a reload mechanism.
        // Or if we implement scheduler in same app, we can emit an event.
        if (req.app.get('cronScheduler')) {
            req.app.get('cronScheduler').reload();
        }

        res.status(201).json({ success: true, message: 'Cron job created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE cron job
router.put('/cron/:id', requireAuth, auditLogger('UPDATE_CRON'), async (req, res) => {
    const { id } = req.params;
    const { command, schedule, description, isActive } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (schedule && !cron.validate(schedule)) return res.status(400).json({ error: 'Invalid cron schedule format' });

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Ownership Check
        const [rows] = await connection.query('SELECT userId FROM cron_jobs WHERE id = ?', [id]);
        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Job not found' });
        }
        if (rows[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let query = 'UPDATE cron_jobs SET ';
        let params = [];
        let updates = [];
        if (command) { updates.push('command=?'); params.push(command); }
        if (schedule) { updates.push('schedule=?'); params.push(schedule); }
        if (description !== undefined) { updates.push('description=?'); params.push(description); }
        if (isActive !== undefined) { updates.push('isActive=?'); params.push(isActive ? 1 : 0); }

        if (updates.length > 0) {
            query += updates.join(', ') + ' WHERE id=?';
            params.push(id);
            await connection.query(query, params);
        }

        await connection.end();

        if (req.app.get('cronScheduler')) {
            req.app.get('cronScheduler').reload();
        }

        res.json({ success: true, message: 'Cron job updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE cron job
router.delete('/cron/:id', requireAuth, auditLogger('DELETE_CRON'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.query('SELECT userId FROM cron_jobs WHERE id = ?', [id]);
        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Job not found' });
        }
        if (rows[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await connection.query('DELETE FROM cron_jobs WHERE id = ?', [id]);
        await connection.end();

        if (req.app.get('cronScheduler')) {
            req.app.get('cronScheduler').reload();
        }

        res.json({ success: true, message: 'Cron job deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
