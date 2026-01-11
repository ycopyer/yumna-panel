const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// GET /api/ssl - List Certificates
router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM ssl_certificates';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY expiry_date ASC';
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ssl/letsencrypt - Issue Cert
router.post('/letsencrypt', requireAuth, async (req, res) => {
    const { domain, wildcard } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!domain) return res.status(400).json({ error: 'Domain name is required' });

    const connection = await pool.promise().getConnection();
    try {
        // 1. Find website for root path
        const [webs] = await connection.query('SELECT * FROM websites WHERE domain = ?', [domain]);
        if (webs.length === 0) return res.status(404).json({ error: `Website for domain ${domain} not found.` });

        const website = webs[0];
        if (!isAdmin && website.userId != userId) return res.status(403).json({ error: 'Access denied' });

        // 2. Call Agent to issue cert
        const agentRes = await agentApi.post('/ssl/letsencrypt', {
            domain,
            rootPath: website.rootPath,
            wildcard
        });

        // 3. Update VHost on Agent to enable SSL
        await agentApi.post('/web/vhost', {
            domain: website.domain,
            rootPath: website.rootPath,
            phpVersion: website.phpVersion,
            stack: website.webStack,
            ssl: true
        });

        // 4. Record in WHM DB
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 3);

        await connection.query(
            'INSERT INTO ssl_certificates (userId, domain, cert_path, key_path, fullchain_path, expiry_date, provider, status, wildcard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                website.userId, domain,
                `/etc/ssl/${domain}-chain.pem`, // Placeholder/Standard path
                `/etc/ssl/${domain}-key.pem`,
                `/etc/ssl/${domain}-chain.pem`,
                expiry, 'letsencrypt', 'active', wildcard ? 1 : 0
            ]
        );

        // 5. Update website table
        await connection.query('UPDATE websites SET sslEnabled = 1 WHERE id = ?', [website.id]);

        res.json({ message: 'Let\'s Encrypt certificate issued and applied successfully!', details: agentRes.data });
    } catch (err) {
        console.error('[WHM] SSL Issue Error:', err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.error || err.message });
    } finally {
        connection.release();
    }
});

// POST /api/ssl/upload - Custom SSL
router.post('/upload', requireAuth, async (req, res) => {
    const { domain, cert, key, chain } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!domain || !cert || !key) return res.status(400).json({ error: 'Domain, cert, and key are required' });

    const connection = await pool.promise().getConnection();
    try {
        const [webs] = await connection.query('SELECT * FROM websites WHERE domain = ?', [domain]);
        if (webs.length === 0) return res.status(404).json({ error: 'Website not found' });

        const website = webs[0];
        if (!isAdmin && website.userId != userId) return res.status(403).json({ error: 'Access denied' });

        // 1. Call Agent to save files
        const agentFileRes = await agentApi.post('/ssl/custom', { domain, cert, key, chain });

        // 2. Update VHost on Agent
        await agentApi.post('/web/vhost', {
            domain: website.domain,
            rootPath: website.rootPath,
            phpVersion: website.phpVersion,
            stack: website.webStack,
            ssl: true,
            customCert: agentFileRes.data.certPath,
            customKey: agentFileRes.data.keyPath
        });

        // 3. Record in DB
        await connection.query(
            'INSERT INTO ssl_certificates (userId, domain, is_auto, cert_path, key_path, fullchain_path, provider, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [website.userId, domain, 0, agentFileRes.data.certPath, agentFileRes.data.keyPath, agentFileRes.data.chainPath, 'custom', 'active']
        );

        // 4. Update website
        await connection.query('UPDATE websites SET sslEnabled = 1 WHERE id = ?', [website.id]);

        res.json({ message: 'Custom SSL uploaded and applied successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.error || err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
