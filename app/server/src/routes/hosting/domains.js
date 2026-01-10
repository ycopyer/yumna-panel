const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');
const whois = require('whois');
const dns = require('dns').promises;

// Get all domains
router.get('/', requireAuth, async (req, res) => {
    try {
        const [domains] = await db.promise().query(
            `SELECT d.*, 
        COUNT(DISTINCT w.id) as website_count,
        DATEDIFF(d.expiry_date, NOW()) as days_until_expiry
       FROM domains d
       LEFT JOIN websites w ON d.domain = w.domain OR w.domain LIKE CONCAT('%.', d.domain)
       WHERE d.user_id = ?
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
            [req.user.id]
        );

        res.json({ domains });
    } catch (error) {
        console.error('Error fetching domains:', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});

// Add new domain
router.post('/', requireAuth, async (req, res) => {
    try {
        const { domain, registrar, registration_date, expiry_date, auto_renew, whois_privacy, nameservers } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain name is required' });
        }

        // Check if domain already exists
        const [existing] = await db.promise().query(
            'SELECT id FROM domains WHERE domain = ? AND user_id = ?',
            [domain, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Domain already exists' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO domains (user_id, domain, registrar, registration_date, expiry_date, 
        auto_renew, whois_privacy, nameservers, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                req.user.id,
                domain,
                registrar || null,
                registration_date || null,
                expiry_date || null,
                auto_renew || false,
                whois_privacy || false,
                JSON.stringify(nameservers || [])
            ]
        );

        const [newDomain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Domain added successfully',
            domain: newDomain[0]
        });
    } catch (error) {
        console.error('Error adding domain:', error);
        res.status(500).json({ error: 'Failed to add domain' });
    }
});

// Update domain
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { registrar, registration_date, expiry_date, auto_renew, whois_privacy, nameservers, status } = req.body;

        // Verify ownership
        const [domain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        await db.promise().query(
            `UPDATE domains SET 
        registrar = COALESCE(?, registrar),
        registration_date = COALESCE(?, registration_date),
        expiry_date = COALESCE(?, expiry_date),
        auto_renew = COALESCE(?, auto_renew),
        whois_privacy = COALESCE(?, whois_privacy),
        nameservers = COALESCE(?, nameservers),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE id = ?`,
            [
                registrar,
                registration_date,
                expiry_date,
                auto_renew,
                whois_privacy,
                nameservers ? JSON.stringify(nameservers) : null,
                status,
                id
            ]
        );

        const [updated] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Domain updated successfully',
            domain: updated[0]
        });
    } catch (error) {
        console.error('Error updating domain:', error);
        res.status(500).json({ error: 'Failed to update domain' });
    }
});

// Delete domain
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const [domain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        await db.promise().query('DELETE FROM domains WHERE id = ?', [id]);

        res.json({ message: 'Domain deleted successfully' });
    } catch (error) {
        console.error('Error deleting domain:', error);
        res.status(500).json({ error: 'Failed to delete domain' });
    }
});

// Get WHOIS information
router.get('/:id/whois', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [domain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        whois.lookup(domain[0].domain, (err, data) => {
            if (err) {
                console.error('WHOIS lookup error:', err);
                return res.status(500).json({ error: 'Failed to fetch WHOIS data' });
            }

            res.json({ whois: data });
        });
    } catch (error) {
        console.error('Error fetching WHOIS:', error);
        res.status(500).json({ error: 'Failed to fetch WHOIS information' });
    }
});

// Check DNS records
router.get('/:id/dns-check', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [domain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        const domainName = domain[0].domain;
        const dnsRecords = {};

        try {
            dnsRecords.A = await dns.resolve4(domainName);
        } catch (e) {
            dnsRecords.A = [];
        }

        try {
            dnsRecords.AAAA = await dns.resolve6(domainName);
        } catch (e) {
            dnsRecords.AAAA = [];
        }

        try {
            dnsRecords.MX = await dns.resolveMx(domainName);
        } catch (e) {
            dnsRecords.MX = [];
        }

        try {
            dnsRecords.NS = await dns.resolveNs(domainName);
        } catch (e) {
            dnsRecords.NS = [];
        }

        try {
            dnsRecords.TXT = await dns.resolveTxt(domainName);
        } catch (e) {
            dnsRecords.TXT = [];
        }

        res.json({ dns: dnsRecords });
    } catch (error) {
        console.error('Error checking DNS:', error);
        res.status(500).json({ error: 'Failed to check DNS records' });
    }
});

// Setup domain forwarding
router.post('/:id/forwarding', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { target_url, type, preserve_path } = req.body;

        if (!target_url) {
            return res.status(400).json({ error: 'Target URL is required' });
        }

        const [domain] = await db.promise().query(
            'SELECT * FROM domains WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO domain_forwarding (domain_id, target_url, type, preserve_path, enabled)
       VALUES (?, ?, ?, ?, true)
       ON DUPLICATE KEY UPDATE 
         target_url = VALUES(target_url),
         type = VALUES(type),
         preserve_path = VALUES(preserve_path),
         enabled = true`,
            [id, target_url, type || '301', preserve_path || false]
        );

        res.json({
            message: 'Domain forwarding configured successfully',
            forwarding_id: result.insertId
        });
    } catch (error) {
        console.error('Error setting up forwarding:', error);
        res.status(500).json({ error: 'Failed to setup domain forwarding' });
    }
});

// Get domain forwarding
router.get('/:id/forwarding', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [forwarding] = await db.promise().query(
            `SELECT df.* FROM domain_forwarding df
       INNER JOIN domains d ON df.domain_id = d.id
       WHERE d.id = ? AND d.user_id = ?`,
            [id, req.user.id]
        );

        res.json({ forwarding: forwarding[0] || null });
    } catch (error) {
        console.error('Error fetching forwarding:', error);
        res.status(500).json({ error: 'Failed to fetch domain forwarding' });
    }
});

// Delete domain forwarding
router.delete('/:id/forwarding', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.promise().query(
            `DELETE df FROM domain_forwarding df
       INNER JOIN domains d ON df.domain_id = d.id
       WHERE d.id = ? AND d.user_id = ?`,
            [id, req.user.id]
        );

        res.json({ message: 'Domain forwarding removed successfully' });
    } catch (error) {
        console.error('Error deleting forwarding:', error);
        res.status(500).json({ error: 'Failed to remove domain forwarding' });
    }
});

module.exports = router;
