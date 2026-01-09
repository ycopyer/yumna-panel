const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const path = require('path');
const fs = require('fs').promises;

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Middleware to check FTP account ownership
const checkFtpOwnership = async (req, res, next) => {
    const ftpId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM ftp_accounts WHERE id = ?', [ftpId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'FTP Account not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all FTP accounts for user
router.get('/ftp', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT id, userId, username, rootPath, status, createdAt, updatedAt FROM ftp_accounts';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new FTP account
router.post('/ftp', requireAuth, auditLogger('CREATE_FTP_ACCOUNT'), async (req, res) => {
    const { username, password, rootPath, description } = req.body;
    const userId = req.userId;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }

    // Minimum password length
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Check quota (non-admin users)
        const isAdmin = req.userRole === 'admin';
        if (!isAdmin) {
            const [userQuota] = await connection.query('SELECT max_ftp_accounts FROM users WHERE id = ?', [userId]);
            const maxAccounts = userQuota[0]?.max_ftp_accounts ?? 5; // Default 5

            const [countRes] = await connection.query('SELECT COUNT(*) as count FROM ftp_accounts WHERE userId = ?', [userId]);
            if (countRes[0].count >= maxAccounts) {
                await connection.end();
                return res.status(403).json({ error: `You have reached your limit of ${maxAccounts} FTP accounts.` });
            }
        }

        // Check if username already exists
        const [existing] = await connection.query('SELECT id FROM ftp_accounts WHERE username = ?', [username]);
        if (existing.length > 0) {
            await connection.end();
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine root path - default to user's home directory if not specified
        let finalRootPath = rootPath;
        if (!finalRootPath) {
            // Get user's default storage path
            const [userConfig] = await connection.query('SELECT id FROM users WHERE id = ?', [userId]);
            if (userConfig.length > 0) {
                finalRootPath = `/home/user_${userId}/ftp_${username}`;
            } else {
                finalRootPath = `/home/ftp_${username}`;
            }
        }

        // Create FTP account
        const [result] = await connection.query(
            'INSERT INTO ftp_accounts (userId, username, password, rootPath, description, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, username, hashedPassword, finalRootPath, description || null, 'active']
        );

        // Create the root directory if it doesn't exist
        try {
            await fs.mkdir(finalRootPath, { recursive: true, mode: 0o755 });
            await fs.writeFile(
                path.join(finalRootPath, 'README.txt'),
                `FTP Account: ${username}\nCreated: ${new Date().toISOString()}\n\nThis is your restricted FTP directory.\nYou can only access files within this directory.`,
                'utf8'
            );
        } catch (fsErr) {
            console.error('Failed to create FTP directory:', fsErr.message);
            // Continue anyway - directory might be created by FTP server
        }

        await connection.end();
        res.status(201).json({
            message: 'FTP account created successfully',
            account: {
                id: result.insertId,
                username,
                rootPath: finalRootPath
            }
        });
    } catch (err) {
        if (connection) await connection.end();
        res.status(500).json({ error: err.message });
    }
});

// Update FTP account
router.put('/ftp/:id', requireAuth, checkFtpOwnership, auditLogger('UPDATE_FTP_ACCOUNT'), async (req, res) => {
    const { password, rootPath, description, status } = req.body;
    const ftpId = req.params.id;

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const updates = [];
        const params = [];

        if (password) {
            if (password.length < 8) {
                await connection.end();
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (rootPath !== undefined) {
            updates.push('rootPath = ?');
            params.push(rootPath);
        }

        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }

        if (status && ['active', 'suspended'].includes(status)) {
            updates.push('status = ?');
            params.push(status);
        }

        if (updates.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        params.push(ftpId);
        await connection.query(
            `UPDATE ftp_accounts SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        await connection.end();
        res.json({ message: 'FTP account updated successfully' });
    } catch (err) {
        if (connection) await connection.end();
        res.status(500).json({ error: err.message });
    }
});

// Delete FTP account
router.delete('/ftp/:id', requireAuth, checkFtpOwnership, auditLogger('DELETE_FTP_ACCOUNT'), async (req, res) => {
    const ftpId = req.params.id;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Get account details before deletion (for cleanup)
        const [accounts] = await connection.query('SELECT username, rootPath FROM ftp_accounts WHERE id = ?', [ftpId]);

        await connection.query('DELETE FROM ftp_accounts WHERE id = ?', [ftpId]);
        await connection.end();

        // Optionally delete the FTP directory (commented out for safety)
        // if (accounts.length > 0 && accounts[0].rootPath) {
        //     try {
        //         await fs.rm(accounts[0].rootPath, { recursive: true, force: true });
        //     } catch (fsErr) {
        //         console.error('Failed to delete FTP directory:', fsErr.message);
        //     }
        // }

        res.json({ message: 'FTP account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get FTP account statistics
router.get('/ftp/:id/stats', requireAuth, checkFtpOwnership, async (req, res) => {
    const ftpId = req.params.id;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [accounts] = await connection.query('SELECT rootPath FROM ftp_accounts WHERE id = ?', [ftpId]);
        await connection.end();

        if (accounts.length === 0) {
            return res.status(404).json({ error: 'FTP Account not found' });
        }

        const rootPath = accounts[0].rootPath;

        // Calculate directory size and file count
        let totalSize = 0;
        let fileCount = 0;

        try {
            const calculateSize = async (dirPath) => {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    if (entry.isDirectory()) {
                        await calculateSize(fullPath);
                    } else {
                        const stats = await fs.stat(fullPath);
                        totalSize += stats.size;
                        fileCount++;
                    }
                }
            };

            await calculateSize(rootPath);
        } catch (fsErr) {
            console.error('Failed to calculate stats:', fsErr.message);
        }

        res.json({
            totalSize,
            fileCount,
            formattedSize: formatBytes(totalSize)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
