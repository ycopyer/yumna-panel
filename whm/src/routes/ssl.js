const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

// GET /api/ssl/servers - Get available servers
router.get('/servers', requireAuth, async (req, res) => {
    try {
        const [servers] = await pool.promise().query(
            'SELECT id, name, hostname, ip, is_local, status, cpu_usage, ram_usage, disk_usage FROM servers WHERE status = ? ORDER BY is_local DESC, name ASC',
            ['active']
        );
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        // 2. Get server info
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [website.serverId || 1]);
        if (serverRows.length === 0) {
            throw new Error('Server not found for this website');
        }
        const server = serverRows[0];

        // 3. Determine Agent URL
        const agentUrl = server.is_local
            ? (process.env.AGENT_URL || 'http://localhost:4001')
            : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': AGENT_SECRET },
            timeout: 30000 // SSL operations can take time
        });

        // 4. Call Agent to issue cert
        const agentRes = await agentClient.post('/ssl/letsencrypt', {
            domain,
            rootPath: website.rootPath,
            wildcard
        });

        // 5. Update VHost on Agent to enable SSL
        await agentClient.post('/web/vhost', {
            domain: website.domain,
            rootPath: website.rootPath,
            phpVersion: website.phpVersion,
            stack: website.webStack,
            ssl: true
        });

        // 6. Record in WHM DB
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 3);

        await connection.query(
            'INSERT INTO ssl_certificates (userId, serverId, domain, cert_path, key_path, fullchain_path, expiry_date, provider, status, wildcard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                website.userId, website.serverId, domain,
                `/etc/ssl/${domain}-chain.pem`,
                `/etc/ssl/${domain}-key.pem`,
                `/etc/ssl/${domain}-chain.pem`,
                expiry, 'letsencrypt', 'active', wildcard ? 1 : 0
            ]
        );

        // 7. Update website table
        await connection.query('UPDATE websites SET sslEnabled = 1 WHERE id = ?', [website.id]);

        console.log(`[SSL] Certificate issued for "${domain}" on server "${server.name}"`);

        res.json({
            message: 'Let\'s Encrypt certificate issued and applied successfully!',
            details: agentRes.data,
            server: {
                id: server.id,
                name: server.name,
                ip: server.ip
            }
        });
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

        // 1. Get server info for Agent URL
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [website.serverId || 1]);
        if (serverRows.length === 0) throw new Error('Server not found for this website');
        const server = serverRows[0];
        const agentUrl = server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`;

        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': AGENT_SECRET },
            timeout: 10000
        });

        // 2. Call Agent to save files
        const agentFileRes = await agentClient.post('/ssl/custom', { domain, cert, key, chain });

        // 3. Update VHost on Agent
        await agentClient.post('/web/vhost', {
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
