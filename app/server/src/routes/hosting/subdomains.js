const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAdmin, requireAuth } = require('../../middleware/auth');

const checkWebsiteOwnership = async (req, res, next) => {
    const websiteId = req.params.id || req.body.websiteId;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM websites WHERE id = ?', [websiteId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const WebServerService = require('../../services/webserver');

// --- SUBDOMAINS ---
router.get('/websites/:id/subdomains', requireAuth, checkWebsiteOwnership, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT * FROM subdomains WHERE websiteId = ?', [req.params.id]);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/subdomains', requireAuth, checkWebsiteOwnership, async (req, res) => {
    const { websiteId, domain, rootPath, phpVersion } = req.body;

    const serverIp = process.env.SERVER_IP || '127.0.0.1';

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // --- QUOTA CHECK ---
        const userId = req.userId;
        const isAdmin = req.userRole === 'admin';

        if (!isAdmin) {
            // Get Owner ID (redundant since we have req.userId, assuming user owns the site they are adding to, which is checked by middleware)
            // But we need to count ALL subdomains for this user across ALL their sites.

            const [userQuota] = await connection.query('SELECT max_subdomains FROM users WHERE id = ?', [userId]);
            const maxSubs = userQuota[0]?.max_subdomains ?? 10;

            const [countRes] = await connection.query(`
                SELECT COUNT(s.id) as count 
                FROM subdomains s 
                JOIN websites w ON s.websiteId = w.id 
                WHERE w.userId = ?`, [userId]);

            if (countRes[0].count >= maxSubs) {
                await connection.end();
                return res.status(403).json({ error: `You have reached your limit of ${maxSubs} subdomains.` });
            }
        }
        // -------------------

        await connection.beginTransaction();

        // 1. Create Subdomain entry
        await connection.query(
            'INSERT INTO subdomains (websiteId, domain, rootPath, phpVersion) VALUES (?, ?, ?, ?)',
            [websiteId, domain, rootPath, phpVersion || '8.2']
        );

        // 2. Find parent website domain to locate DNS zone
        const [webs] = await connection.query('SELECT domain FROM websites WHERE id = ?', [websiteId]);
        if (webs.length > 0) {
            const parentDomain = webs[0].domain;
            const [zones] = await connection.query('SELECT id FROM dns_zones WHERE domain = ?', [parentDomain]);

            if (zones.length > 0) {
                const zoneId = zones[0].id;
                const subPrefix = domain.replace(`.${parentDomain}`, '');

                // 3. Add DNS A record
                await connection.query(
                    'INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, "A", ?, ?)',
                    [zoneId, subPrefix, serverIp]
                );
            }

            // 4. Create Web Server VHost
            const webConfig = WebServerService.getConfigs();
            if (!webConfig.isWin) {
                // In production, we usually use Nginx or Apache
                // Assuming Nginx by default or based on some system setting
                await WebServerService.createNginxVHost(domain, rootPath, phpVersion || '8.2');
            } else {
                // In Standalone/Windows
                await WebServerService.createNginxVHost(domain, rootPath, phpVersion || '8.2');
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Subdomain and DNS record created successfully' });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

router.delete('/subdomains/:id', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const isAdmin = req.userRole === 'admin';
        const userId = req.userId;

        // Check ownership via parent website
        const [subs] = await connection.query(`
            SELECT w.userId 
            FROM subdomains s 
            JOIN websites w ON s.websiteId = w.id 
            WHERE s.id = ?`, [req.params.id]);

        if (subs.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Subdomain not found' });
        }

        if (!isAdmin && subs[0].userId != userId) {
            await connection.end();
            return res.status(403).json({ error: 'Access denied' });
        }

        await connection.query('DELETE FROM subdomains WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Subdomain deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;

