const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAdmin, requireAuth } = require('../../middleware/auth');

const checkZoneOwnership = async (req, res, next) => {
    const zoneId = req.params.zoneId || req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM dns_zones WHERE id = ?', [zoneId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'DNS Zone not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const checkRecordOwnership = async (req, res, next) => {
    const recordId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT z.userId 
            FROM dns_records r 
            JOIN dns_zones z ON r.zoneId = z.id 
            WHERE r.id = ?`, [recordId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'DNS Record not found' });
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

// --- DNS ---
router.get('/dns', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';


    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT z.*, COUNT(r.id) as records 
            FROM dns_zones z 
            LEFT JOIN dns_records r ON z.id = r.zoneId 
        `;
        let params = [];

        if (!isAdmin) {
            query += ' WHERE z.userId = ?';
            params.push(userId);
        }

        query += ' GROUP BY z.id ORDER BY z.createdAt DESC';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/dns/:zoneId/records', requireAuth, checkZoneOwnership, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT * FROM dns_records WHERE zoneId = ?', [req.params.zoneId]);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/dns', requireAuth, async (req, res) => {
    const { domain } = req.body;
    const userId = req.userId;


    const serverIp = process.env.SERVER_IP || '127.0.0.1';

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // 1. Create DNS Zone
        const [zoneResult] = await connection.query('INSERT INTO dns_zones (userId, domain) VALUES (?, ?)', [userId, domain]);
        const zoneId = zoneResult.insertId;

        // 2. Fetch Default NS from settings
        const [nsSettings] = await connection.query('SELECT key_name, value_text FROM settings WHERE key_name IN ("dns_ns1", "dns_ns2")');
        const ns1 = nsSettings.find(s => s.key_name === 'dns_ns1')?.value_text || 'ns1.yumnapanel.com';
        const ns2 = nsSettings.find(s => s.key_name === 'dns_ns2')?.value_text || 'ns2.yumnapanel.com';

        // 3. Create Default DNS Records
        const defaultRecords = [
            { type: 'A', name: '@', content: serverIp },
            { type: 'CNAME', name: 'www', content: domain },
            { type: 'NS', name: '@', content: ns1 },
            { type: 'NS', name: '@', content: ns2 }
        ];

        for (const rec of defaultRecords) {
            await connection.query(
                'INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, ?, ?, ?)',
                [zoneId, rec.type, rec.name, rec.content]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'DNS Zone and default records created successfully', zoneId });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

router.delete('/dns/:id', requireAuth, checkZoneOwnership, async (req, res) => {

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM dns_zones WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'DNS Zone deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECORD MANAGEMENT ---

// Add Record
router.post('/dns/:zoneId/records', requireAuth, checkZoneOwnership, async (req, res) => {

    const { type, name, content, priority, ttl } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'INSERT INTO dns_records (zoneId, type, name, content, priority, ttl) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.zoneId, type, name, content, priority || 0, ttl || 3600]
        );
        await connection.end();
        res.status(201).json({ message: 'DNS record added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Record
router.put('/dns/records/:id', requireAuth, checkRecordOwnership, async (req, res) => {

    const { type, name, content, priority, ttl } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'UPDATE dns_records SET type = ?, name = ?, content = ?, priority = ?, ttl = ? WHERE id = ?',
            [type, name, content, priority || 0, ttl || 3600, req.params.id]
        );
        await connection.end();
        res.json({ message: 'DNS record updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Record
router.delete('/dns/records/:id', requireAuth, checkRecordOwnership, async (req, res) => {

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM dns_records WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'DNS record deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Zone to Defaults
router.post('/dns/:zoneId/reset', requireAuth, checkZoneOwnership, async (req, res) => {

    const serverIp = process.env.SERVER_IP || '127.0.0.1';
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // 1. Get Domain
        const [zones] = await connection.query('SELECT domain FROM dns_zones WHERE id = ?', [req.params.zoneId]);
        if (zones.length === 0) throw new Error('Zone not found');
        const domain = zones[0].domain;

        // 2. Clear current records
        await connection.query('DELETE FROM dns_records WHERE zoneId = ?', [req.params.zoneId]);

        // 3. Fetch Default NS from settings
        const [nsSettings] = await connection.query('SELECT key_name, value_text FROM settings WHERE key_name IN ("dns_ns1", "dns_ns2")');
        const ns1 = nsSettings.find(s => s.key_name === 'dns_ns1')?.value_text || 'ns1.yumnapanel.com';
        const ns2 = nsSettings.find(s => s.key_name === 'dns_ns2')?.value_text || 'ns2.yumnapanel.com';

        // 4. Add Defaults
        const defaultRecords = [
            { type: 'A', name: '@', content: serverIp },
            { type: 'CNAME', name: 'www', content: domain },
            { type: 'NS', name: '@', content: ns1 },
            { type: 'NS', name: '@', content: ns2 }
        ];

        for (const rec of defaultRecords) {
            await connection.query(
                'INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, ?, ?, ?)',
                [req.params.zoneId, rec.type, rec.name, rec.content]
            );
        }

        await connection.commit();
        res.json({ message: 'DNS Zone reset to defaults' });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Cloudflare Integration (Placeholder)
router.post('/dns/:zoneId/cloudflare', requireAdmin, async (req, res) => {
    res.status(501).json({ error: 'Cloudflare integration coming soon in v2.0' });
});

// Global Nameserver Configuration (Mock)
router.get('/dns/settings/nameservers', async (req, res) => {
    res.json({
        ns1: 'ns1.yumnapanel.com',
        ns2: 'ns2.yumnapanel.com'
    });
});

module.exports = router;
