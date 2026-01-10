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
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_mailing_lists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                domainId INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255) NOT NULL UNIQUE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (domainId) REFERENCES email_domains(id) ON DELETE CASCADE
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS email_mailing_list_subscribers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                listId INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                subscribedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(listId, email),
                FOREIGN KEY (listId) REFERENCES email_mailing_lists(id) ON DELETE CASCADE
            )
        `);
        await connection.query(`
            ALTER TABLE email_domains 
            ADD COLUMN IF NOT EXISTS spam_enabled TINYINT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS spam_score DECIMAL(3,1) DEFAULT 5.0,
            ADD COLUMN IF NOT EXISTS spam_marking_method VARCHAR(20) DEFAULT 'subject'
        `).catch(() => { });

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
    const { domain } = req.query; // domain name like 'example.com'

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM email_autoresponders';
        let params = [];

        if (domain) {
            query += ' WHERE email LIKE ?';
            params.push(`%@${domain}`);
            if (!isAdmin) {
                query += ' AND userId = ?';
                params.push(userId);
            }
        } else if (!isAdmin) {
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

const EmailConfigService = require('../../services/EmailConfigService');

router.get('/mail/domains/:id/dns-config', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [domains] = await connection.query('SELECT userId FROM email_domains WHERE id = ?', [id]);

        if (domains.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Domain not found' });
        }
        if (domains[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const configs = await EmailConfigService.getEmailDNSConfigs(id);
        await connection.end();
        res.json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/mail/logs', requireAuth, async (req, res) => {
    const { domain } = req.query;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM email_logs';
        let params = [];

        if (domain) {
            query += ' WHERE (sender LIKE ? OR recipient LIKE ?)';
            params.push(`%@${domain}`, `%@${domain}`);
        }

        query += ' ORDER BY timestamp DESC LIMIT 50';

        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// EMAIL QUOTA MANAGEMENT
// ============================================
const EmailQuotaService = require('../../services/EmailQuotaService');

// Get quota alerts for user's accounts
router.get('/mail/quota/alerts', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';
    const { threshold } = req.query;

    try {
        const alerts = await EmailQuotaService.getQuotaAlerts(
            isAdmin ? null : userId,
            threshold ? parseInt(threshold) : 90
        );
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get quota statistics for a domain
router.get('/mail/domains/:id/quota-stats', requireAuth, async (req, res) => {
    const domainId = parseInt(req.params.id);
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        // Verify ownership
        const connection = await mysql.createConnection(dbConfig);
        const [domains] = await connection.query(
            'SELECT * FROM email_domains WHERE id = ?',
            [domainId]
        );
        await connection.end();

        if (domains.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        if (!isAdmin && domains[0].userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stats = await EmailQuotaService.getDomainQuotaStats(domainId);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update account quota
router.put('/mail/accounts/:id/quota', requireAuth, async (req, res) => {
    const accountId = parseInt(req.params.id);
    const { quota_mb } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        // Verify ownership
        const connection = await mysql.createConnection(dbConfig);
        const [accounts] = await connection.query(
            `SELECT ea.*, ed.userId 
             FROM email_accounts ea 
             JOIN email_domains ed ON ea.domainId = ed.id 
             WHERE ea.id = ?`,
            [accountId]
        );
        await connection.end();

        if (accounts.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (!isAdmin && accounts[0].userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await EmailQuotaService.updateQuota(accountId, quota_mb);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simulate quota usage (for testing/demo)
router.post('/mail/accounts/:id/simulate-usage', requireAuth, async (req, res) => {
    const accountId = parseInt(req.params.id);
    const { percentage } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        // Verify ownership
        const connection = await mysql.createConnection(dbConfig);
        const [accounts] = await connection.query(
            `SELECT ea.*, ed.userId 
             FROM email_accounts ea 
             JOIN email_domains ed ON ea.domainId = ed.id 
             WHERE ea.id = ?`,
            [accountId]
        );
        await connection.end();

        if (accounts.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (!isAdmin && accounts[0].userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await EmailQuotaService.simulateUsage(accountId, percentage);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MAILING LISTS
// ============================================
const MailingListService = require('../../services/MailingListService');

router.get('/mail/lists', requireAuth, async (req, res) => {
    try {
        const lists = await MailingListService.getLists(req.userRole === 'admin' ? null : req.userId);
        res.json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mail/lists', requireAuth, auditLogger('CREATE_MAILING_LIST'), async (req, res) => {
    const { domainId, name } = req.body;
    try {
        const list = await MailingListService.createList(req.userId, domainId, name);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/mail/lists/:id', requireAuth, auditLogger('DELETE_MAILING_LIST'), async (req, res) => {
    try {
        await MailingListService.deleteList(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/mail/lists/:id/subscribers', requireAuth, async (req, res) => {
    try {
        const subs = await MailingListService.getSubscribers(req.params.id);
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mail/lists/:id/subscribers', requireAuth, async (req, res) => {
    const { email } = req.body;
    try {
        await MailingListService.addSubscriber(req.params.id, email);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SPAM PROTECTION
// ============================================
const SpamFilterService = require('../../services/SpamFilterService');

router.get('/mail/domains/:id/spam-settings', requireAuth, async (req, res) => {
    try {
        const settings = await SpamFilterService.getSettings(req.params.id);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mail/domains/:id/spam-settings', requireAuth, auditLogger('UPDATE_SPAM_SETTINGS'), async (req, res) => {
    try {
        const result = await SpamFilterService.updateSettings(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// WEBMAIL (ROUNDCUBE)
// ============================================
const EmailWebAppService = require('../../services/EmailWebAppService');

router.get('/mail/domains/:domain/webmail-status', requireAuth, async (req, res) => {
    try {
        const status = await EmailWebAppService.getWebmailStatus(req.params.domain);
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mail/domains/:domain/install-webmail', requireAuth, auditLogger('INSTALL_WEBMAIL'), async (req, res) => {
    try {
        const result = await EmailWebAppService.installRoundcube(req.params.domain);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

