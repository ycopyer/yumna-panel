const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const argon2 = require('argon2');
const { requireAuth, requirePrivileged, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Get Users (Admin sees all, Reseller sees their sub-users)
router.get('/', requirePrivileged, async (req, res) => {
    try {
        let query = `
            SELECT 
                u.id, u.username, u.email, u.role, u.status, u.parentId, u.createdAt, u.two_factor_enabled,
                u.storage_quota, u.max_websites, u.max_subdomains, u.max_databases, 
                u.max_cron_jobs, u.max_ssh_accounts, u.max_email_accounts, u.max_dns_zones, u.plan_name,
                p.username as parentName,
                s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath
            FROM users u 
            LEFT JOIN users p ON u.parentId = p.id
            LEFT JOIN sftp_configs s ON u.id = s.userId
        `;
        let params = [];

        if (req.userRole !== 'admin') {
            query += ' WHERE u.parentId = ? OR u.id = ?';
            params.push(req.userId, req.userId);
        }

        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create User
router.post('/', requirePrivileged, async (req, res) => {
    const {
        username, email, password, role,
        storage_quota, max_websites, max_subdomains,
        max_databases, max_cron_jobs, max_ssh_accounts,
        max_email_accounts, max_dns_zones, plan_name,
        sftp
    } = req.body;

    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Role restrictions
    let targetRole = role || 'user';
    if (req.userRole === 'reseller' && targetRole !== 'user') {
        return res.status(403).json({ error: 'Resellers can only create regular users' });
    }

    try {
        const hashedPassword = await argon2.hash(password);
        const [result] = await pool.promise().query(
            `INSERT INTO users (
                username, email, password, role, parentId, 
                storage_quota, max_websites, max_subdomains, 
                max_databases, max_cron_jobs, max_ssh_accounts, 
                max_email_accounts, max_dns_zones, plan_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username, email, hashedPassword, targetRole, req.userId,
                storage_quota || 1073741824, max_websites || 5, max_subdomains || 10,
                max_databases || 5, max_cron_jobs || 5, max_ssh_accounts || 5,
                max_email_accounts || 10, max_dns_zones || 5, plan_name || 'Starter'
            ]
        );

        const newUserId = result.insertId;

        // Create SFTP Config if provided
        if (sftp) {
            const { host, port, username: sUser, password: sPass, name, rootPath } = sftp;
            await pool.promise().query(
                'INSERT INTO sftp_configs (userId, host, port, username, password, name, rootPath) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [newUserId, host, port || 22, sUser, sPass, name, rootPath]
            );
        }

        logActivity(req.userId, 'create_user', `Created user ${username} with role ${targetRole}`, req);
        res.json({ success: true, userId: newUserId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update User
router.put('/:id', requirePrivileged, async (req, res) => {
    const {
        username, email, password, role, status,
        two_factor_enabled, storage_quota, max_websites,
        max_subdomains, max_databases, max_cron_jobs,
        max_ssh_accounts, max_email_accounts, max_dns_zones,
        plan_name, sftp
    } = req.body;
    const targetUserId = req.params.id;

    try {
        // Check ownership
        if (req.userRole !== 'admin') {
            const [check] = await pool.promise().query('SELECT parentId FROM users WHERE id = ?', [targetUserId]);
            if (check.length === 0 || check[0].parentId !== req.userId) {
                return res.status(403).json({ error: 'Unauthorized to update this user' });
            }
        }

        // 1. Update users table partially
        let updateFields = [];
        let params = [];

        const allowedFields = {
            username, email, role, status, two_factor_enabled,
            storage_quota, max_websites, max_subdomains,
            max_databases, max_cron_jobs, max_ssh_accounts,
            max_email_accounts, max_dns_zones, plan_name
        };

        for (const [key, value] of Object.entries(allowedFields)) {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(value);
            }
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await argon2.hash(password);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        if (updateFields.length > 0) {
            params.push(targetUserId);
            await pool.promise().query(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                params
            );
        }

        // 2. Update SFTP Config if provided
        if (sftp) {
            const { host, port, username, password: sftpPassword, name, rootPath } = sftp;
            const [existingSftp] = await pool.promise().query('SELECT id FROM sftp_configs WHERE userId = ?', [targetUserId]);

            if (existingSftp.length > 0) {
                let sftpFields = ['host = ?', 'port = ?', 'username = ?', 'name = ?', 'rootPath = ?'];
                let sftpParams = [host, port || 22, username, name, rootPath];

                if (sftpPassword) {
                    sftpFields.push('password = ?');
                    sftpParams.push(sftpPassword);
                }

                sftpParams.push(targetUserId);
                await pool.promise().query(
                    `UPDATE sftp_configs SET ${sftpFields.join(', ')} WHERE userId = ?`,
                    sftpParams
                );
            } else {
                await pool.promise().query(
                    'INSERT INTO sftp_configs (userId, host, port, username, password, name, rootPath) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [targetUserId, host, port || 22, username, sftpPassword, name, rootPath]
                );
            }
        }

        logActivity(req.userId, 'update_user', `Updated user ${username || `ID ${targetUserId}`}`, req);
        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('[USERS] Update failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete User
router.delete('/:id', requirePrivileged, async (req, res) => {
    const targetUserId = req.params.id;

    try {
        // Check ownership
        if (req.userRole !== 'admin') {
            const [check] = await pool.promise().query('SELECT parentId FROM users WHERE id = ?', [targetUserId]);
            if (check.length === 0 || check[0].parentId !== req.userId) {
                return res.status(403).json({ error: 'Unauthorized to delete this user' });
            }
        }

        await pool.promise().query('DELETE FROM users WHERE id = ?', [targetUserId]);
        logActivity(req.userId, 'delete_user', `Deleted user ID ${targetUserId}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Current User Usage Stats
router.get('/me/usage', requireAuth, async (req, res) => {
    try {
        const [user] = await pool.promise().query('SELECT max_websites, max_databases FROM users WHERE id = ?', [req.userId]);
        const limits = user[0] || { max_websites: 0, max_databases: 0 };

        const [websites] = await pool.promise().query('SELECT COUNT(*) as count FROM websites WHERE userId = ?', [req.userId]);
        const [databases] = await pool.promise().query('SELECT COUNT(*) as count FROM `databases` WHERE userId = ?', [req.userId]);

        // Mock storage for now in v3 (distributed storage stats are complex)
        // In a real scenario, we would aggregate from all nodes the user has data on.
        res.json({
            storage: { used: 0, limit: 1024 * 1024 * 1024 }, // 1GB
            websites: { used: websites[0].count, limit: limits.max_websites },
            subdomains: { used: 0, limit: 10 },
            databases: { used: databases[0].count, limit: limits.max_databases },
            emails: { used: 0, limit: 10 },
            dns: { used: 0, limit: 10 },
            ssh: { used: 0, limit: 1 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user profile
router.get('/:id/profile', requireAuth, async (req, res) => {
    try {
        const targetId = req.params.id === 'me' ? req.userId : req.params.id;
        if (req.userRole !== 'admin' && targetId != req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await pool.promise().query(
            `SELECT 
                u.*, 
                s.host, s.port, s.username as sftp_username, s.name as sftp_name, s.rootPath as sftp_rootPath
            FROM users u 
            LEFT JOIN sftp_configs s ON u.id = s.userId
            WHERE u.id = ?`,
            [targetId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update current user profile
router.put('/profile', requireAuth, async (req, res) => {
    const { email, password } = req.body;
    try {
        let updateFields = [];
        let params = [];

        if (email) {
            updateFields.push('email = ?');
            params.push(email);
        }

        if (password) {
            const hashedPassword = await argon2.hash(password);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(req.userId);
        await pool.promise().query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        logActivity(req.userId, 'update_profile', 'Updated profile information', req);
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle 2FA (Legacy - moving to security routes but keeping for compatibility)
router.post('/toggle-2fa', requireAuth, async (req, res) => {
    const { enabled } = req.body;
    try {
        await pool.promise().query('UPDATE users SET two_factor_enabled = ? WHERE id = ?', [enabled ? 1 : 0, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

