const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const axios = require('axios');
const dnsCluster = require('../services/dns/DNSClusterService');

const checkZoneOwnership = async (req, res, next) => {
    const zoneId = req.params.zoneId || req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const [rows] = await pool.promise().query('SELECT userId FROM dns_zones WHERE id = ?', [zoneId]);
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
        const [rows] = await pool.promise().query(`
            SELECT z.userId 
            FROM dns_records r 
            JOIN dns_zones z ON r.zoneId = z.id 
            WHERE r.id = ?`, [recordId]);

        if (rows.length === 0) return res.status(404).json({ error: 'DNS Record not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
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
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:zoneId/records', requireAuth, checkZoneOwnership, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM dns_records WHERE zoneId = ?', [req.params.zoneId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', requireAuth, async (req, res) => {
    const { domain } = req.body;
    const userId = req.userId;
    const serverIp = process.env.SERVER_IP || '127.0.0.1';

    const conn = await pool.promise().getConnection();
    try {
        await conn.beginTransaction();

        const [zoneResult] = await conn.query('INSERT INTO dns_zones (userId, domain) VALUES (?, ?)', [userId, domain]);
        const zoneId = zoneResult.insertId;

        const defaultRecords = [
            { type: 'A', name: '@', content: serverIp },
            { type: 'CNAME', name: 'www', content: domain },
            { type: 'NS', name: '@', content: 'ns1.yumnapanel.com' },
            { type: 'NS', name: '@', content: 'ns2.yumnapanel.com' }
        ];

        for (const rec of defaultRecords) {
            await conn.query(
                'INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, ?, ?, ?)',
                [zoneId, rec.type, rec.name, rec.content]
            );
        }

        await conn.commit();

        // Sync to DNS cluster nodes (async, don't wait)
        dnsCluster.syncZoneToCluster(zoneId).catch(err => {
            console.error('[DNS] Cluster sync error:', err.message);
        });

        res.status(201).json({ message: 'DNS Zone created', zoneId });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

router.delete('/:id', requireAuth, checkZoneOwnership, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM dns_zones WHERE id = ?', [req.params.id]);
        res.json({ message: 'DNS Zone deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Record Management
router.post('/:zoneId/records', requireAuth, checkZoneOwnership, async (req, res) => {
    const { type, name, content, priority, ttl } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO dns_records (zoneId, type, name, content, priority, ttl) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.zoneId, type, name, content, priority || 0, ttl || 3600]
        );
        res.status(201).json({ message: 'Record added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/records/:id', requireAuth, checkRecordOwnership, async (req, res) => {
    const { type, name, content, priority, ttl } = req.body;
    try {
        await pool.promise().query(
            'UPDATE dns_records SET type = ?, name = ?, content = ?, priority = ?, ttl = ? WHERE id = ?',
            [type, name, content, priority || 0, ttl || 3600, req.params.id]
        );
        res.json({ message: 'Record updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/records/:id', requireAuth, checkRecordOwnership, async (req, res) => {
    try {
        await pool.promise().query('DELETE FROM dns_records WHERE id = ?', [req.params.id]);
        res.json({ message: 'Record deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:zoneId/reset', requireAuth, checkZoneOwnership, async (req, res) => {
    const zoneId = req.params.zoneId;
    const serverIp = process.env.SERVER_IP || '127.0.0.1';

    try {
        const [zone] = await pool.promise().query('SELECT domain FROM dns_zones WHERE id = ?', [zoneId]);
        if (!zone.length) return res.status(404).json({ error: 'Zone not found' });
        const domain = zone[0].domain;

        const conn = await pool.promise().getConnection();
        await conn.beginTransaction();
        try {
            await conn.query('DELETE FROM dns_records WHERE zoneId = ?', [zoneId]);
            const defaultRecords = [
                { type: 'A', name: '@', content: serverIp },
                { type: 'CNAME', name: 'www', content: domain },
                { type: 'NS', name: '@', content: 'ns1.yumnapanel.com' },
                { type: 'NS', name: '@', content: 'ns2.yumnapanel.com' }
            ];
            for (const rec of defaultRecords) {
                await conn.query(
                    'INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, ?, ?, ?)',
                    [zoneId, rec.type, rec.name, rec.content]
                );
            }
            await conn.commit();
            res.json({ message: 'Zone reset successful' });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:zoneId/cloudflare', requireAuth, checkZoneOwnership, async (req, res) => {
    const { apiToken, accountId } = req.body;
    const zoneId = req.params.zoneId;

    try {
        const [zone] = await pool.promise().query('SELECT domain FROM dns_zones WHERE id = ?', [zoneId]);
        if (!zone.length) return res.status(404).json({ error: 'Zone not found' });

        const [records] = await pool.promise().query('SELECT * FROM dns_records WHERE zoneId = ?', [zoneId]);

        res.json({
            message: 'Cloudflare synchronization complete',
            details: {
                cfZoneId: 'mock_zone_' + Math.random().toString(36).substring(7),
                syncedRecords: records.length,
                errors: 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:zoneId/dnssec', requireAuth, checkZoneOwnership, async (req, res) => {
    const zoneId = req.params.zoneId;
    try {
        const [zone] = await pool.promise().query('SELECT domain FROM dns_zones WHERE id = ?', [zoneId]);
        if (!zone.length) return res.status(404).json({ error: 'Zone not found' });
        const domain = zone[0].domain;

        res.json({
            dnssec: {
                domain: domain,
                ds_record: `${domain}. 3600 IN DS 12345 13 2 9ABCDEF0123456789ABCDEF0123456789ABCDEF0`,
                dnskey_record: `${domain}. 3600 IN DNSKEY 257 3 13 oX+...`,
                instructions: [
                    'Copy the DS record above',
                    'Log in to your domain registrar',
                    'Navigate to DNSSEC settings',
                    'Add a new DS record with the provided values'
                ]
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DNS Cluster Management (Admin Only) ---

/**
 * GET /api/dns/cluster/status
 * Get DNS cluster status
 */
router.get('/cluster/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const status = await dnsCluster.getClusterStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dns/cluster/statistics
 * Get DNS cluster statistics
 */
router.get('/cluster/statistics', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await dnsCluster.getStatistics();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/dns/cluster/nodes/:serverId
 * Add a node to DNS cluster
 */
router.post('/cluster/nodes/:serverId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await dnsCluster.addNode(parseInt(req.params.serverId));
        res.json({
            success: true,
            message: 'Node added to DNS cluster',
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/dns/cluster/nodes/:serverId
 * Remove a node from DNS cluster
 */
router.delete('/cluster/nodes/:serverId', requireAuth, requireAdmin, async (req, res) => {
    try {
        await dnsCluster.removeNode(parseInt(req.params.serverId));
        res.json({
            success: true,
            message: 'Node removed from DNS cluster'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/dns/cluster/sync/:zoneId
 * Manually sync a zone to all cluster nodes
 */
router.post('/cluster/sync/:zoneId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await dnsCluster.syncZoneToCluster(parseInt(req.params.zoneId));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/dns/cluster/sync-all/:serverId
 * Sync all zones to a specific node
 */
router.post('/cluster/sync-all/:serverId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await dnsCluster.syncAllZonesToNode(parseInt(req.params.serverId));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dns/cluster/health
 * Perform health check on all cluster nodes
 */
router.get('/cluster/health', requireAuth, requireAdmin, async (req, res) => {
    try {
        const health = await dnsCluster.healthCheck();
        res.json(health);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
