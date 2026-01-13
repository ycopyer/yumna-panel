const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');

// Helper to get Agent Client for a specific server or website
async function getAgentClient(serverId) {
    const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
    if (rows.length === 0) throw new Error('Server not found');
    const server = rows[0];

    const agentUrl = server.is_local
        ? (process.env.AGENT_URL || 'http://localhost:4001')
        : `http://${server.ip}:4001`;

    return axios.create({
        baseURL: agentUrl,
        headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
        timeout: 10000
    });
}

// GET /api/websites/defaults
router.get('/defaults', async (req, res) => {
    const { serverId } = req.query;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId || 1]);
        if (rows.length === 0) {
            const isWin = process.platform === 'win32';
            return res.json({ baseDir: isWin ? 'C:/YumnaPanel/www' : '/var/www' });
        }
        const server = rows[0];
        const isWin = server.is_local ? (process.platform === 'win32') : (server.os_type === 'windows');
        res.json({ baseDir: isWin ? 'C:/YumnaPanel/www' : '/var/www' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/websites/servers - Get available servers for deployment
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
    let { domain, rootPath, phpVersion, targetUserId, webStack, serverId } = req.body;
    let userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin && targetUserId) userId = targetUserId;

    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    domain = domain.toLowerCase().trim();
    if (!serverId) serverId = 1;

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Check Quota
        if (!isAdmin) {
            const [userRows] = await connection.query('SELECT max_websites FROM users WHERE id = ?', [userId]);
            const maxWebsites = userRows[0]?.max_websites ?? 3;
            const [countRows] = await connection.query('SELECT COUNT(*) as count FROM websites WHERE userId = ?', [userId]);
            if (countRows[0].count >= maxWebsites) {
                throw new Error(`Quota exceeded. Max ${maxWebsites} websites allowed.`);
            }
        }

        // Validate Server
        const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (serverRows.length === 0) throw new Error('Selected server not found');
        const selectedServer = serverRows[0];

        if (selectedServer.status !== 'active') {
            throw new Error(`Server "${selectedServer.name}" is not active`);
        }

        // Check Duplicates
        const [existing] = await connection.query('SELECT id FROM websites WHERE domain = ?', [domain]);
        if (existing.length > 0) throw new Error('Domain already exists');

        // Auto-generate rootPath
        if (!rootPath) {
            const isWin = selectedServer.is_local ? (process.platform === 'win32') : (selectedServer.os_type === 'windows');
            rootPath = isWin ? `C:/YumnaPanel/www/${domain}` : `/var/www/${domain}`;
        }

        // Insert Website
        const [webResult] = await connection.query(
            'INSERT INTO websites (userId, domain, serverId, rootPath, phpVersion, status, webStack) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, domain, serverId, rootPath, phpVersion || '8.2', 'active', webStack || 'nginx']
        );
        const websiteId = webResult.insertId;

        // Insert DNS Zone
        const [zoneRows] = await connection.query('SELECT id FROM dns_zones WHERE domain = ?', [domain]);
        if (zoneRows.length === 0) {
            await connection.query('INSERT INTO dns_zones (userId, domain, serverId) VALUES (?, ?, ?)', [userId, domain, serverId]);
        }

        // Call Agent
        try {
            const agentClient = await getAgentClient(serverId);
            await agentClient.post('/web/vhost', {
                domain,
                rootPath,
                phpVersion,
                stack: webStack,
                ssl: false
            });
        } catch (agentErr) {
            console.error('[WHM] Agent VHost creation failed:', agentErr.message);
        }

        await connection.commit();
        res.status(201).json({
            message: 'Website created successfully',
            websiteId,
            server: {
                id: selectedServer.id,
                name: selectedServer.name,
                ip: selectedServer.ip
            }
        });
    } catch (err) {
        if (connection) await connection.rollback();
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

        const [rows] = await connection.query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        // Delete from DB
        await connection.query('DELETE FROM websites WHERE id = ?', [websiteId]);

        // Call Agent
        try {
            const agentClient = await getAgentClient(website.serverId);
            await agentClient.delete(`/web/vhost/${website.domain}`);
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

    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        await pool.promise().query(
            'UPDATE websites SET rootPath = ?, phpVersion = ?, webStack = ?, sslEnabled = ? WHERE id = ?',
            [rootPath, phpVersion, webStack, sslEnabled ? 1 : 0, websiteId]
        );

        // Notify Agent
        try {
            const agentClient = await getAgentClient(website.serverId);
            await agentClient.post('/web/vhost', {
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
    }
});

// PUT /api/websites/:id/maintenance
router.put('/:id/maintenance', requireAuth, async (req, res) => {
    const { enabled } = req.body;
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];

        const agentClient = await getAgentClient(website.serverId);
        await agentClient.post('/web/maintenance', {
            rootPath: website.rootPath,
            enabled
        });

        res.json({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/websites/:id/install
router.post('/:id/install', requireAuth, async (req, res) => {
    const { appType } = req.body;
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';
    const crypto = require('crypto');

    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (!isAdmin && rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        const website = rows[0];
        const agentClient = await getAgentClient(website.serverId);

        const dbSuffix = crypto.randomBytes(3).toString('hex');
        const dbName = `wp_${dbSuffix}`;
        const dbUser = `u_${dbSuffix}`;
        const dbPass = crypto.randomBytes(8).toString('hex') + 'Aa1!';

        await agentClient.post('/db/create', { name: dbName, user: dbUser, password: dbPass });
        await pool.promise().query(
            'INSERT INTO `databases` (userId, serverId, name, user, password) VALUES (?, ?, ?, ?, ?)',
            [website.userId, website.serverId, dbName, dbUser, dbPass]
        );

        const response = await agentClient.post('/web/app/install', {
            appType,
            domain: website.domain,
            rootPath: website.rootPath,
            phpVersion: website.phpVersion,
            dbConfig: {
                name: dbName,
                user: dbUser,
                password: dbPass,
                host: 'localhost'
            }
        });

        res.json({ message: `${appType} installation started`, jobId: response.data.jobId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/websites/:id/config
router.get('/:id/config', requireAuth, async (req, res) => {
    const websiteId = req.params.id;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const website = rows[0];

        const agentClient = await getAgentClient(website.serverId);
        const result = await agentClient.get('/web/config', {
            params: { domain: website.domain, stack: website.webStack }
        });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/websites/:id/config
router.put('/:id/config', requireAuth, requireAdmin, async (req, res) => {
    const websiteId = req.params.id;
    const { config } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const website = rows[0];

        const agentClient = await getAgentClient(website.serverId);
        const result = await agentClient.put('/web/config', {
            domain: website.domain,
            stack: website.webStack,
            content: config
        });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/websites/:id/logs
router.get('/:id/logs', requireAuth, async (req, res) => {
    const websiteId = req.params.id;
    const { logType } = req.query;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const website = rows[0];

        const agentClient = await getAgentClient(website.serverId);
        const result = await agentClient.get('/web/logs', {
            params: { domain: website.domain, type: logType }
        });
        res.json(result.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

