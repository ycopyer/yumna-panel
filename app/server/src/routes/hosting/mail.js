const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// --- EMAIL DOMAINS ---

router.get('/mail/domains', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM email_domains';
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

router.post('/mail/domains', requireAuth, async (req, res) => {
    const { domain } = req.body;
    const userId = req.userId;

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('INSERT INTO email_domains (userId, domain) VALUES (?, ?)', [userId, domain]);
        await connection.end();
        res.status(201).json({ success: true, message: 'Email domain added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EMAIL ACCOUNTS ---

router.get('/mail/accounts', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT a.*, d.domain 
            FROM email_accounts a 
            JOIN email_domains d ON a.domainId = d.id
        `;
        let params = [];
        if (!isAdmin) {
            query += ' WHERE d.userId = ?';
            params.push(userId);
        }
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mail/accounts', requireAuth, async (req, res) => {
    const { domainId, username, password, quota_bytes } = req.body;
    // Password should be hashed in a real system, but for now we follow the existing pattern
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'INSERT INTO email_accounts (domainId, username, password, quota_bytes) VALUES (?, ?, ?, ?)',
            [domainId, username, password, quota_bytes || 1073741824]
        );
        await connection.end();
        res.status(201).json({ success: true, message: 'Email account created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
