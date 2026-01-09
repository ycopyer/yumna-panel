const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Ensure Tables Exist (Auto-run on module load)
(async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_autoresponders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                body TEXT,
                active TINYINT DEFAULT 1,
                startDate DATETIME,
                endDate DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(email),
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        await connection.end();
    } catch (e) {
        console.error('[Mail] Failed to ensure tables:', e.message);
    }
})();

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

router.post('/mail/domains', requireAuth, auditLogger('CREATE_EMAIL_DOMAIN'), async (req, res) => {
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

router.delete('/mail/domains/:id', requireAuth, auditLogger('DELETE_EMAIL_DOMAIN'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM email_domains WHERE id = ?', [id]);

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Domain not found' });
        }
        if (rows[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await connection.query('DELETE FROM email_domains WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'Email domain deleted' });
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

router.post('/mail/accounts', requireAuth, auditLogger('CREATE_EMAIL_ACCOUNT'), async (req, res) => {
    let { domainId, username, email, password, quota_mb } = req.body;
    const userId = req.userId;

    const quota_bytes = (quota_mb || 1024) * 1024 * 1024;

    try {
        const connection = await mysql.createConnection(dbConfig);

        if (email && !domainId && !username) {
            const parts = email.split('@');
            if (parts.length === 2) {
                username = parts[0];
                const domainName = parts[1];
                const [domains] = await connection.query('SELECT id, userId FROM email_domains WHERE domain = ?', [domainName]);
                if (domains.length === 0) {
                    await connection.end();
                    return res.status(404).json({ error: `Domain ${domainName} not found` });
                }
                if (domains[0].userId !== userId && req.userRole !== 'admin') {
                    await connection.end();
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                domainId = domains[0].id;
            }
        }

        if (!domainId || !username || !password) {
            await connection.end();
            return res.status(400).json({ error: 'Required fields missing' });
        }

        // --- QUOTA CHECK ---
        // Get the owner of the domain
        const [domainInfo] = await connection.query('SELECT userId FROM email_domains WHERE id = ?', [domainId]);
        if (domainInfo.length > 0) {
            const ownerId = domainInfo[0].userId;

            // Check if requester is admin or the owner (already checked above, but good for context)
            const isOwnerAdmin = req.userRole === 'admin'; // Admin creating means no limit? Or check owner limit?
            // Usually if Admin creates FOR a user, we might warn but allow, or enforce. 
            // Let's enforce for non-admins. Admin can do anything.

            if (req.userRole !== 'admin') {
                const [userQuota] = await connection.query('SELECT max_email_accounts FROM users WHERE id = ?', [ownerId]);
                const maxEmails = userQuota[0]?.max_email_accounts ?? 5;

                // Count all emails for this USER (across all their domains)
                const [countRes] = await connection.query(`
                    SELECT COUNT(*) as count 
                    FROM email_accounts a 
                    JOIN email_domains d ON a.domainId = d.id 
                    WHERE d.userId = ?`, [ownerId]);

                if (countRes[0].count >= maxEmails) {
                    await connection.end();
                    return res.status(403).json({ error: `You have reached your limit of ${maxEmails} email accounts.` });
                }
            }
        }
        // -------------------

        await connection.query(
            'INSERT INTO email_accounts (domainId, username, password, quota_bytes) VALUES (?, ?, ?, ?)',
            [domainId, username, password, quota_bytes]
        );
        await connection.end();
        res.status(201).json({ success: true, message: 'Account created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/mail/accounts/:id', requireAuth, auditLogger('DELETE_EMAIL_ACCOUNT'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT d.userId 
            FROM email_accounts a 
            JOIN email_domains d ON a.domainId = d.id 
            WHERE a.id = ?`, [id]);

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Account not found' });
        }
        if (rows[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await connection.query('DELETE FROM email_accounts WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ALIASES ---

router.get('/mail/aliases', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT a.*, d.domain 
            FROM email_aliases a 
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

router.post('/mail/aliases', requireAuth, auditLogger('CREATE_MAIL_ALIAS'), async (req, res) => {
    const { domainId, source, destination } = req.body;
    const userId = req.userId;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [domains] = await connection.query('SELECT userId FROM email_domains WHERE id = ?', [domainId]);
        if (domains.length === 0) return res.status(404).json({ error: 'Domain not found' });
        if (domains[0].userId !== userId && req.userRole !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

        await connection.query('INSERT INTO email_aliases (domainId, source, destination) VALUES (?, ?, ?)',
            [domainId, source, destination]);
        await connection.end();
        res.json({ success: true, message: 'Alias created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/mail/aliases/:id', requireAuth, auditLogger('DELETE_MAIL_ALIAS'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT d.userId 
            FROM email_aliases a 
            JOIN email_domains d ON a.domainId = d.id 
            WHERE a.id = ?`, [id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Alias not found' });
        if (rows[0].userId !== userId && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

        await connection.query('DELETE FROM email_aliases WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'Alias deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTORESPONDERS ---

router.get('/mail/autoresponders', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM email_autoresponders';
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

router.post('/mail/autoresponders', requireAuth, auditLogger('SET_AUTORESPONDER'), async (req, res) => {
    const { email, subject, body, active } = req.body;
    const userId = req.userId;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO email_autoresponders (email, subject, body, active, userId) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject=?, body=?, active=?';
        await connection.query(query, [email, subject, body, active, userId, subject, body, active]);

        await connection.end();
        res.json({ success: true, message: 'Autoresponder updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/mail/autoresponders/:id', requireAuth, auditLogger('DELETE_AUTORESPONDER'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM email_autoresponders WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (rows[0].userId !== userId && req.userRole !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

        await connection.query('DELETE FROM email_autoresponders WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'Autoresponder deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
