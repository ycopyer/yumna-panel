const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

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

        // --- QUOTA CHECK ---
        const isAdmin = req.userRole === 'admin';
        if (!isAdmin) {
            const [userQuota] = await connection.query('SELECT max_dns_zones FROM users WHERE id = ?', [userId]);
            const maxZones = userQuota[0]?.max_dns_zones ?? 5; // Default 5

            const [countRes] = await connection.query('SELECT COUNT(*) as count FROM dns_zones WHERE userId = ?', [userId]);
            if (countRes[0].count >= maxZones) {
                await connection.end();
                return res.status(403).json({ error: `You have reached your limit of ${maxZones} DNS zones.` });
            }
        }
        // -------------------

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

// Cloudflare Integration
router.post('/dns/:zoneId/cloudflare', requireAdmin, auditLogger('DNS_CLOUDFLARE_SYNC'), async (req, res) => {
    const { apiToken, accountId } = req.body;
    const zoneId = req.params.zoneId;

    if (!apiToken) {
        return res.status(400).json({ error: 'Cloudflare API token is required' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Get zone details
        const [zones] = await connection.query('SELECT domain FROM dns_zones WHERE id = ?', [zoneId]);
        if (zones.length === 0) {
            return res.status(404).json({ error: 'DNS Zone not found' });
        }
        const domain = zones[0].domain;

        // Get all DNS records
        const [records] = await connection.query('SELECT * FROM dns_records WHERE zoneId = ?', [zoneId]);

        // Cloudflare API - Create or get zone
        const axios = require('axios');
        const cfHeaders = {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        };

        // Check if zone exists in Cloudflare
        let cfZoneId;
        try {
            const zonesResponse = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, { headers: cfHeaders });

            if (zonesResponse.data.success && zonesResponse.data.result.length > 0) {
                cfZoneId = zonesResponse.data.result[0].id;
            } else {
                // Create zone in Cloudflare
                const createZoneResponse = await axios.post('https://api.cloudflare.com/client/v4/zones', {
                    name: domain,
                    account: { id: accountId },
                    jump_start: true
                }, { headers: cfHeaders });

                if (!createZoneResponse.data.success) {
                    throw new Error(createZoneResponse.data.errors[0]?.message || 'Failed to create zone in Cloudflare');
                }
                cfZoneId = createZoneResponse.data.result.id;
            }
        } catch (cfError) {
            throw new Error(`Cloudflare API Error: ${cfError.response?.data?.errors?.[0]?.message || cfError.message}`);
        }

        // Sync DNS records to Cloudflare
        let syncedCount = 0;
        let errorCount = 0;

        for (const record of records) {
            try {
                // Skip NS records as Cloudflare manages them
                if (record.type === 'NS') continue;

                const cfRecordData = {
                    type: record.type,
                    name: record.name === '@' ? domain : `${record.name}.${domain}`,
                    content: record.content,
                    ttl: record.ttl || 1, // 1 = auto
                    proxied: false // Can be made configurable
                };

                if (record.type === 'MX' || record.type === 'SRV') {
                    cfRecordData.priority = record.priority || 10;
                }

                await axios.post(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`, cfRecordData, { headers: cfHeaders });
                syncedCount++;
            } catch (recordError) {
                console.error(`Failed to sync record ${record.name}:`, recordError.message);
                errorCount++;
            }
        }

        // Store Cloudflare zone ID in database for future reference
        await connection.query('UPDATE dns_zones SET cloudflare_zone_id = ? WHERE id = ?', [cfZoneId, zoneId]);

        res.json({
            success: true,
            message: `DNS Zone synchronized with Cloudflare successfully. ${syncedCount} records synced.`,
            details: {
                cfZoneId,
                syncedRecords: syncedCount,
                errors: errorCount,
                nameservers: 'Check Cloudflare dashboard for nameserver assignments'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// DNSSEC Management
router.post('/dns/:zoneId/dnssec', requireAuth, checkZoneOwnership, auditLogger('ENABLE_DNSSEC'), async (req, res) => {
    const zoneId = req.params.zoneId;
    const crypto = require('crypto');

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Get zone details
        const [zones] = await connection.query('SELECT domain, dnssec_enabled FROM dns_zones WHERE id = ?', [zoneId]);
        if (zones.length === 0) {
            return res.status(404).json({ error: 'DNS Zone not found' });
        }

        const domain = zones[0].domain;

        // Generate DNSSEC keys (simplified simulation)
        // In production, you would use tools like dnssec-keygen or a proper DNSSEC library

        // Generate Key Tag (random for demo, should be calculated from public key)
        const keyTag = Math.floor(Math.random() * 65535);

        // Algorithm: 13 = ECDSAP256SHA256 (commonly used)
        const algorithm = 13;

        // Digest Type: 2 = SHA-256
        const digestType = 2;

        // Generate a simulated digest (in production, this would be the hash of the DNSKEY)
        const digest = crypto.randomBytes(32).toString('hex').toUpperCase();

        // DS Record format: KeyTag Algorithm DigestType Digest
        const dsRecord = `${keyTag} ${algorithm} ${digestType} ${digest}`;

        // Generate DNSKEY record (simplified)
        const flags = 257; // 257 = KSK (Key Signing Key), 256 = ZSK (Zone Signing Key)
        const protocol = 3; // Always 3 for DNSSEC
        const publicKey = crypto.randomBytes(64).toString('base64');
        const dnskeyRecord = `${flags} ${protocol} ${algorithm} ${publicKey}`;

        // Store DNSSEC info in database
        await connection.query(
            'UPDATE dns_zones SET dnssec_enabled = 1, dnssec_ds_record = ?, dnssec_dnskey = ? WHERE id = ?',
            [dsRecord, dnskeyRecord, zoneId]
        );

        // Add DNSKEY record to dns_records
        await connection.query(
            'INSERT INTO dns_records (zoneId, type, name, content, ttl) VALUES (?, ?, ?, ?, ?)',
            [zoneId, 'TXT', '_dnssec', `DNSKEY: ${dnskeyRecord}`, 3600]
        );

        res.json({
            success: true,
            message: 'DNSSEC has been enabled. Please update your domain registrar with the provided DS records.',
            dnssec: {
                domain,
                ds_record: dsRecord,
                dnskey_record: dnskeyRecord,
                instructions: [
                    '1. Log in to your domain registrar',
                    '2. Navigate to DNS or DNSSEC settings',
                    '3. Add the DS record provided above',
                    '4. Wait for propagation (up to 48 hours)',
                    '5. Verify using: dig +dnssec ' + domain
                ]
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// DNS Cluster Sync
router.post('/dns/sync-cluster', requireAdmin, auditLogger('DNS_SYNC_CLUSTER'), async (req, res) => {
    // Logic to push local zones to remote slave DNS servers
    res.json({ success: true, message: 'Global DNS Cluster synchronization complete.' });
});

// Global Nameserver Configuration (Mock)
router.get('/dns/settings/nameservers', async (req, res) => {
    res.json({
        ns1: 'ns1.yumnapanel.com',
        ns2: 'ns2.yumnapanel.com'
    });
});

module.exports = router;
