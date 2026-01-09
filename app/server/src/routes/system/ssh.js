const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Get SSH accounts for a user
router.get('/ssh-accounts', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT id, userId, username, status, rootPath, createdAt FROM ssh_accounts';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';
        const [accounts] = await connection.query(query, params);
        await connection.end();

        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create SSH account
router.post('/ssh-accounts', requireAuth, auditLogger('CREATE_SSH_ACCOUNT'), async (req, res) => {
    const { username, password, domainId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // --- QUOTA CHECK ---
        if (!isAdmin) {
            const [userResolves] = await connection.query('SELECT max_ssh_accounts FROM users WHERE id = ?', [userId]);
            // Default to 1 if not set
            const maxSSH = userResolves[0]?.max_ssh_accounts ?? 1;

            const [countResolves] = await connection.query('SELECT COUNT(*) as count FROM ssh_accounts WHERE userId = ?', [userId]);
            const currentCount = countResolves[0].count;

            if (currentCount >= maxSSH) {
                await connection.end();
                return res.status(403).json({
                    error: `You have reached your limit of ${maxSSH} SSH accounts. Please upgrade your plan.`
                });
            }
        }
        // -------------------

        // Get domain info to set rootPath
        let rootPath = null;
        if (domainId) {
            const [domains] = await connection.query(
                'SELECT rootPath, userId FROM websites WHERE id = ?',
                [domainId]
            );

            if (domains.length === 0) {
                await connection.end();
                return res.status(404).json({ error: 'Domain not found' });
            }

            // Check ownership
            if (!isAdmin && domains[0].userId !== userId) {
                await connection.end();
                return res.status(403).json({ error: 'Unauthorized' });
            }

            rootPath = domains[0].rootPath;
        }

        // Check if username already exists
        const [existing] = await connection.query(
            'SELECT id FROM ssh_accounts WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'SSH username already exists' });
        }

        // Hash password
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        // Create SSH account in database
        const [result] = await connection.query(
            'INSERT INTO ssh_accounts (userId, username, password, rootPath, status) VALUES (?, ?, ?, ?, ?)',
            [userId, username, hashedPassword, rootPath, 'active']
        );

        await connection.end();

        // Create system user (Windows-specific using net user)
        // Note: On Windows, we'll create a limited user account
        const createUserCmd = `net user ${username} ${password} /add`;
        exec(createUserCmd, (error) => {
            if (error) {
                console.error('[SSH] Failed to create system user:', error);
            } else {
                console.log(`[SSH] Created system user: ${username}`);

                // Restrict user permissions (Windows)
                exec(`net localgroup Users ${username} /delete`, () => {
                    exec(`net localgroup "Remote Desktop Users" ${username} /delete`, () => {
                        console.log(`[SSH] Restricted user: ${username}`);
                    });
                });
            }
        });

        res.json({
            success: true,
            message: 'SSH account created successfully',
            accountId: result.insertId,
            username: username
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update SSH account status
router.patch('/ssh-accounts/:id', requireAuth, auditLogger('UPDATE_SSH_ACCOUNT'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check ownership
        const [accounts] = await connection.query(
            'SELECT userId, username FROM ssh_accounts WHERE id = ?',
            [id]
        );

        if (accounts.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'SSH account not found' });
        }

        if (!isAdmin && accounts[0].userId !== userId) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update status
        await connection.query(
            'UPDATE ssh_accounts SET status = ? WHERE id = ?',
            [status, id]
        );

        await connection.end();

        // Enable/disable system user
        const username = accounts[0].username;
        if (status === 'suspended') {
            exec(`net user ${username} /active:no`, (error) => {
                if (error) console.error('[SSH] Failed to disable user:', error);
            });
        } else {
            exec(`net user ${username} /active:yes`, (error) => {
                if (error) console.error('[SSH] Failed to enable user:', error);
            });
        }

        res.json({ success: true, message: 'SSH account status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset SSH password
router.post('/ssh-accounts/:id/reset-password', requireAuth, auditLogger('RESET_SSH_PASSWORD'), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check ownership
        const [accounts] = await connection.query(
            'SELECT userId, username FROM ssh_accounts WHERE id = ?',
            [id]
        );

        if (accounts.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'SSH account not found' });
        }

        if (!isAdmin && accounts[0].userId !== userId) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

        await connection.query(
            'UPDATE ssh_accounts SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );

        await connection.end();

        // Update system user password
        const username = accounts[0].username;
        exec(`net user ${username} ${newPassword}`, (error) => {
            if (error) console.error('[SSH] Failed to reset system password:', error);
        });

        res.json({ success: true, message: 'SSH password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete SSH account
router.delete('/ssh-accounts/:id', requireAuth, auditLogger('DELETE_SSH_ACCOUNT'), async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check ownership
        const [accounts] = await connection.query(
            'SELECT userId, username FROM ssh_accounts WHERE id = ?',
            [id]
        );

        if (accounts.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'SSH account not found' });
        }

        if (!isAdmin && accounts[0].userId !== userId) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete from database
        await connection.query('DELETE FROM ssh_accounts WHERE id = ?', [id]);
        await connection.end();

        // Delete system user
        const username = accounts[0].username;
        exec(`net user ${username} /delete`, (error) => {
            if (error) console.error('[SSH] Failed to delete system user:', error);
        });

        res.json({ success: true, message: 'SSH account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
