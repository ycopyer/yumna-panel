const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { encrypt } = require('../../utils/helpers');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { uploadAvatar } = require('../../middleware/upload');
const argon2 = require('argon2');

// GET all users
router.get('/users', requireAdmin, (req, res) => {
    db.query(`
        SELECT u.id, u.username, u.role, u.status, u.email, u.shell, u.storage_quota, u.used_storage, 
               u.cpu_quota, u.ram_quota, u.two_factor_enabled, u.createdAt,
               s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath,
               COALESCE(w.web_count, 0) as website_count
        FROM users u
        LEFT JOIN sftp_configs s ON u.id = s.userId
        LEFT JOIN (
            SELECT userId, COUNT(*) as web_count 
            FROM websites 
            GROUP BY userId
        ) w ON u.id = w.userId
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});


// Helper to provision directory
const fs = require('fs');
const path = require('path');
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (e) {
            console.error('[Provision] Failed to create directory:', dirPath, e.message);
        }
    }
};

// CREATE user
router.post('/users', requireAdmin, async (req, res) => {
    const { username, password, role, email, status, storage_quota, max_websites, max_subdomains, max_cron_jobs, max_databases, max_ssh_accounts, max_email_accounts, max_dns_zones, plan_name, two_factor_enabled, sftp } = req.body;

    try {
        const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

        db.query(`INSERT INTO users (username, password, role, email, status, storage_quota, max_websites, max_subdomains, max_cron_jobs, max_databases, max_ssh_accounts, max_email_accounts, max_dns_zones, plan_name, two_factor_enabled) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, role || 'user', email, status || 'active',
                storage_quota || 1073741824,
                max_websites || 3,
                max_subdomains || 10,
                max_cron_jobs || 2, // Default 2
                max_databases || 3,
                max_ssh_accounts || 1,
                max_email_accounts || 5, // Default 5
                max_dns_zones || 5, // Default 5
                plan_name || 'Basic',
                two_factor_enabled ? 1 : 0], (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const newUserId = results.insertId;

                    // Handle SFTP / Auto-Provisioning
                    if (sftp) {
                        const { host, port, username: sftpUser, password: sftpPassword, name, rootPath } = sftp;
                        // Encrypt SFTP password if needed, or store plain (unsafe but per schema 'password TEXT'). 
                        // Assuming plain for now as per previous implementation context, or let's try to be safe? 
                        // Existing schema uses 'password TEXT'.

                        // Provision Directory
                        // Default to C:\YumnaPanel\users\{username} if rootPath is '/' or empty
                        let finalRootPath = rootPath;
                        if (!finalRootPath || finalRootPath === '/') {
                            const isWin = require('os').platform() === 'win32';
                            finalRootPath = isWin ? `C:\\YumnaPanel\\users\\${username}` : `/var/www/users/${username}`;
                        }
                        ensureDirectory(finalRootPath);

                        db.query(`INSERT INTO sftp_configs (userId, host, port, username, password, name, rootPath) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [newUserId, host || 'localhost', port || 22, sftpUser || username, sftpPassword || password, name || 'User Storage', finalRootPath],
                            (sftpErr) => {
                                if (sftpErr) console.error('Failed to create SFTP config:', sftpErr.message);
                                // Don't fail the request if SFTP fails, just log it.
                            }
                        );
                    } else {
                        // Create default provisioning
                        const isWin = require('os').platform() === 'win32';
                        const defaultPath = isWin ? `C:\\YumnaPanel\\users\\${username}` : `/var/www/users/${username}`;
                        ensureDirectory(defaultPath);

                        db.query(`INSERT INTO sftp_configs (userId, host, port, username, password, name, rootPath) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [newUserId, 'localhost', 22, username, password, 'Default Storage', defaultPath],
                            (sftpErr) => { if (sftpErr) console.error('Default SFTP init error:', sftpErr); }
                        );
                    }

                    res.json({ success: true, userId: newUserId });
                });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to hash password' });
    }
});

// UPDATE user
router.put('/users/:id', requireAdmin, async (req, res) => {
    const { username, password, role, email, status, storage_quota, max_websites, max_subdomains, max_cron_jobs, max_databases, max_ssh_accounts, max_email_accounts, max_dns_zones, plan_name, two_factor_enabled, sftp } = req.body;
    const { id } = req.params;

    let query = 'UPDATE users SET username=?, role=?, email=?, status=?, storage_quota=?, max_websites=?, max_subdomains=?, max_cron_jobs=?, max_databases=?, max_ssh_accounts=?, max_email_accounts=?, max_dns_zones=?, plan_name=?, two_factor_enabled=?';
    let params = [username, role, email, status, storage_quota, max_websites, max_subdomains, max_cron_jobs, max_databases, max_ssh_accounts, max_email_accounts, max_dns_zones, plan_name, two_factor_enabled ? 1 : 0];

    if (password) {
        try {
            const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
            query += ', password=?';
            params.push(hashedPassword);
        } catch (e) {
            return res.status(500).json({ error: 'Failed to hash password' });
        }
    }

    query += ' WHERE id=?';
    params.push(id);

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Update SFTP if provided
        if (sftp) {
            const { host, port, username: sftpUser, password: sftpPassword, name, rootPath } = sftp;

            // Provision if path changed
            if (rootPath) ensureDirectory(rootPath);

            db.query('SELECT * FROM sftp_configs WHERE userId = ?', [id], (checkErr, checkRes) => {
                if (checkRes && checkRes.length > 0) {
                    // Update
                    let sftpQuery = 'UPDATE sftp_configs SET host=?, port=?, username=?, name=?, rootPath=?';
                    let sftpParams = [host, port, sftpUser, name, rootPath];
                    if (sftpPassword) {
                        sftpQuery += ', password=?';
                        sftpParams.push(sftpPassword);
                    }
                    sftpQuery += ' WHERE userId=?';
                    sftpParams.push(id);
                    db.query(sftpQuery, sftpParams);
                } else {
                    // Insert (if missing)
                    db.query(`INSERT INTO sftp_configs (userId, host, port, username, password, name, rootPath) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [id, host, port, sftpUser, sftpPassword || '', name, rootPath]);
                }
            });
        }

        res.json({ success: true });
    });
});

// GET Profile
router.get('/users/:id/profile', requireAuth, (req, res) => {
    const { id } = req.params;
    if (String(req.headers['x-user-id']) !== String(id) && req.userRole !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    db.query('SELECT u.username, u.role, u.email, u.two_factor_enabled, u.avatar, u.storage_quota, u.used_storage, s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath FROM users u LEFT JOIN sftp_configs s ON u.id = s.userId WHERE u.id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

router.delete('/users/:id', requireAdmin, (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// GET User Resource Usage (Stats)
router.get('/users/me/usage', requireAuth, async (req, res) => {
    // Determine userId:
    // requireAuth middleware sets req.sessionData = { userId, username, role, ... }
    const userId = req.sessionData?.userId;

    // Safety fallback
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const connection = await db.promise();

        // 1. Get User Quotas & Current Storage
        const [userRes] = await connection.query(`
            SELECT 
                storage_quota, used_storage, 
                max_websites, max_databases, max_subdomains, 
                max_email_accounts, max_dns_zones, max_ssh_accounts, max_cron_jobs
            FROM users WHERE id = ?`, [userId]);

        if (userRes.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes[0];

        // 2. Count Websites
        const [webRes] = await connection.query('SELECT COUNT(*) as count FROM websites WHERE userId = ?', [userId]);

        // 3. Count Subdomains (owned via websites)
        const [subRes] = await connection.query(`
            SELECT COUNT(s.id) as count 
            FROM subdomains s 
            JOIN websites w ON s.websiteId = w.id 
            WHERE w.userId = ?`, [userId]);

        // 4. Count Databases
        const [dbRes] = await connection.query('SELECT COUNT(*) as count FROM `databases` WHERE userId = ?', [userId]);

        // 5. Count Email Accounts (across all domains owned by user)
        const [mailRes] = await connection.query(`
            SELECT COUNT(a.id) as count 
            FROM email_accounts a 
            JOIN email_domains d ON a.domainId = d.id 
            WHERE d.userId = ?`, [userId]);

        // 6. Count DNS Zones
        const [dnsRes] = await connection.query('SELECT COUNT(*) as count FROM dns_zones WHERE userId = ?', [userId]);

        // 7. Count SSH Accounts
        const [sshRes] = await connection.query('SELECT COUNT(*) as count FROM sftp_configs WHERE userId = ?', [userId]);

        // 8. Count Cron Jobs
        const [cronRes] = await connection.query('SELECT COUNT(*) as count FROM cron_jobs WHERE userId = ?', [userId]);

        const stats = {
            storage: {
                used: parseInt(user.used_storage || 0),
                limit: parseInt(user.storage_quota || 0)
            },
            websites: {
                used: webRes[0].count,
                limit: user.max_websites
            },
            subdomains: {
                used: subRes[0].count,
                limit: user.max_subdomains
            },
            databases: {
                used: dbRes[0].count,
                limit: user.max_databases
            },
            emails: {
                used: mailRes[0].count,
                limit: user.max_email_accounts
            },
            dns: {
                used: dnsRes[0].count,
                limit: user.max_dns_zones
            },
            ssh: {
                used: sshRes[0].count,
                limit: user.max_ssh_accounts
            },
            cron: {
                used: cronRes[0].count,
                limit: user.max_cron_jobs
            }
        };

        res.json(stats);

    } catch (err) {
        console.error('Usage stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
