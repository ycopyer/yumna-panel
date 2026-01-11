const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// Configure Agent
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4001';
const AGENT_SECRET = process.env.AGENT_SECRET;

const agentApi = axios.create({
    baseURL: AGENT_URL,
    headers: { 'X-Agent-Secret': AGENT_SECRET }
});

// GET /api/websites/defaults
router.get('/defaults', (req, res) => {
    const isWin = process.platform === 'win32';
    const baseDir = isWin ? 'C:/YumnaPanel/www' : '/var/www';
    res.json({ baseDir });
});

// GET /api/websites - List Websites
router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM websites';
        let params = [];
        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }
        query += ' ORDER BY createdAt DESC';

        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/websites - Create Website
router.post('/', requireAuth, async (req, res) => {
    let { domain, rootPath, phpVersion, targetUserId, webStack } = req.body;
    let userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin && targetUserId) userId = targetUserId;

    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    // Sanitize domain
    domain = domain.toLowerCase().trim();

    // Defaults
    if (!rootPath) {
        const isWin = process.platform === 'win32';
        rootPath = isWin ? `C:/YumnaPanel/www/${domain}` : `/var/www/${domain}`;
    }

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Check Quota (Skip for Admin)
        if (!isAdmin) {
            const [userRows] = await connection.query('SELECT max_websites FROM users WHERE id = ?', [userId]);
            const maxWebsites = userRows[0]?.max_websites ?? 3;
            const [countRows] = await connection.query('SELECT COUNT(*) as count FROM websites WHERE userId = ?', [userId]);
            if (countRows[0].count >= maxWebsites) {
                throw new Error(`Quota exceeded. Max ${maxWebsites} websites allowed.`);
            }
        }

        // Check Duplicates
        const [existing] = await connection.query('SELECT id FROM websites WHERE domain = ?', [domain]);
        if (existing.length > 0) throw new Error('Domain already exists');

        // Insert Website
        const [webResult] = await connection.query(
            'INSERT INTO websites (userId, domain, rootPath, phpVersion, status, webStack) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, domain, rootPath, phpVersion || '8.2', 'active', webStack || 'nginx']
        );
        const websiteId = webResult.insertId;

        // Insert DNS Zone (Mock/Simple)
        const [zoneRows] = await connection.query('SELECT id FROM dns_zones WHERE domain = ?', [domain]);
        if (zoneRows.length === 0) {
            await connection.query('INSERT INTO dns_zones (userId, domain) VALUES (?, ?)', [userId, domain]);
        }

        // Call Agent to Create VHost & FS
        try {
            await agentApi.post('/web/vhost', {
                domain,
                rootPath,
                phpVersion,
                stack: webStack,
                ssl: false
            });
        } catch (agentErr) {
            console.error('[WHM] Agent VHost creation failed:', agentErr.message);
            // Optionally rollback or just warn
            // navigate: connection.rollback(); throw agentErr;
        }

        await connection.commit();
        res.status(201).json({ message: 'Website created successfully', websiteId });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE /api/websites/:id - Delete Website
router.delete('/:id', requireAuth, async (req, res) => {
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Check Ownership
        const [rows] = await connection.query('SELECT userId, domain FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const domain = rows[0].domain;

        // Delete from DB
        await connection.query('DELETE FROM websites WHERE id = ?', [websiteId]);

        // Call Agent to Remove VHost
        try {
            await agentApi.delete(`/web/vhost/${domain}`);
        } catch (agentErr) {
            console.error('[WHM] Agent VHost removal failed:', agentErr.message);
        }

        await connection.commit();
        res.json({ message: 'Website deleted successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/websites/:id - Update Website Config
router.put('/:id', requireAuth, async (req, res) => {
    const { rootPath, phpVersion, webStack, sslEnabled } = req.body;
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        // Check Ownership
        const [rows] = await connection.query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        // Update DB
        await connection.query(
            'UPDATE websites SET rootPath = ?, phpVersion = ?, webStack = ?, sslEnabled = ? WHERE id = ?',
            [rootPath, phpVersion, webStack, sslEnabled ? 1 : 0, websiteId]
        );

        // Notify Agent
        try {
            await agentApi.post('/web/vhost', {
                domain: website.domain,
                rootPath,
                phpVersion,
                stack: webStack,
                ssl: sslEnabled
            });
        } catch (agentErr) {
            console.error('[WHM] Agent VHost update failed:', agentErr.message);
        }

        res.json({ message: 'Website updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/websites/:id/status - Update Status (Suspend/Active)
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
    const { status } = req.body;
    const websiteId = req.params.id;

    const connection = await pool.promise().getConnection();
    try {
        await connection.query('UPDATE websites SET status = ? WHERE id = ?', [status, websiteId]);

        // If suspended, we might want to redirect Nginx, but for now simple DB status update
        // is enough as Nginx config can be re-rendered to point to a suspended page if we want.
        // We'll leave that logic for "update" or background sync.

        // Trigger update to ensure config reflects status (e.g. suspended page)
        const [rows] = await connection.query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length > 0) {
            const website = rows[0];
            // If status is suspended, maybe we want to force "yumna_blocked.html" or similar?
            // Not implementing full suspend logic on Agent yet, just DB.
        }

        res.json({ message: 'Website status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/websites/:id/maintenance - Toggle Maintenance
router.put('/:id/maintenance', requireAuth, async (req, res) => {
    const { enabled } = req.body;
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        // Call Agent
        await agentApi.post('/web/maintenance', {
            rootPath: website.rootPath,
            enabled
        });

        res.json({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// POST /api/websites/:id/install - One-Click Installer
router.post('/:id/install', requireAuth, async (req, res) => {
    const { appType } = req.body; // 'WordPress', 'Laravel'
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';
    const crypto = require('crypto');

    const connection = await pool.promise().getConnection();
    try {
        // 1. Validate
        const [rows] = await connection.query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        // 2. Create DB via Agent
        const dbSuffix = crypto.randomBytes(3).toString('hex');
        const newDbName = `wp_${dbSuffix}`;
        const newDbUser = `u_${dbSuffix}`;
        const newDbPass = crypto.randomBytes(8).toString('hex') + 'Aa1!';

        await agentApi.post('/db/create', {
            name: newDbName,
            user: newDbUser,
            password: newDbPass
        });

        // record db in panel
        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [website.userId, newDbName, newDbUser, newDbPass]
        );

        // 3. Trigger Agent
        const response = await agentApi.post('/web/app/install', {
            appType,
            domain: website.domain,
            rootPath: website.rootPath,
            phpVersion: website.phpVersion,
            dbConfig: {
                name: newDbName,
                user: newDbUser,
                password: newDbPass,
                host: 'localhost'
            }
        });

        res.json({ message: `${appType} installation started`, jobId: response.data.jobId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/websites/:id/install/logs - Poll installation progress
router.get('/:id/install/logs', requireAuth, async (req, res) => {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    try {
        const response = await agentApi.get(`/task/${jobId}`);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json({ error: 'Failed to fetch logs' });
    }
});

// GET /api/websites/:id/config
router.get('/:id/config', requireAuth, async (req, res) => {
    const websiteId = req.params.id;
    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT domain, webStack FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { domain, webStack } = rows[0];
        const result = await agentApi.get('/web/config', { params: { domain, stack: webStack } });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

// PUT /api/websites/:id/config
router.put('/:id/config', requireAuth, requireAdmin, async (req, res) => {
    const websiteId = req.params.id;
    const { config } = req.body;
    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT domain, webStack FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { domain, webStack } = rows[0];
        const result = await agentApi.put('/web/config', { domain, stack: webStack, content: config });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

// GET /api/websites/:id/logs
router.get('/:id/logs', requireAuth, async (req, res) => {
    const websiteId = req.params.id;
    const { logType } = req.query;
    const connection = await pool.promise().getConnection();
    try {
        const [rows] = await connection.query('SELECT domain FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { domain } = rows[0];
        const result = await agentApi.get('/web/logs', { params: { domain, type: logType } });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

module.exports = router;
