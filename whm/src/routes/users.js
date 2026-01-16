const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const argon2 = require('argon2');
const { requireAuth, requirePrivileged, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Get Users (Admin sees all, Reseller sees their sub-users)
router.get('/', requirePrivileged, async (req, res) => {
    try {
        let query = 'SELECT u.id, u.username, u.email, u.role, u.status, u.parentId, u.createdAt, p.username as parentName FROM users u LEFT JOIN users p ON u.parentId = p.id';
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
    const { username, email, password, role, max_websites, max_databases } = req.body;

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
            'INSERT INTO users (username, email, password, role, parentId, max_websites, max_databases) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, targetRole, req.userId, max_websites || 5, max_databases || 5]
        );

        logActivity(req.userId, 'create_user', `Created user ${username} with role ${targetRole}`, req);
        res.json({ success: true, userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update User
router.put('/:id', requirePrivileged, async (req, res) => {
    const { status, max_websites, max_databases } = req.body;
    const targetUserId = req.params.id;

    try {
        // Check ownership
        if (req.userRole !== 'admin') {
            const [check] = await pool.promise().query('SELECT parentId FROM users WHERE id = ?', [targetUserId]);
            if (check.length === 0 || check[0].parentId !== req.userId) {
                return res.status(403).json({ error: 'Unauthorized to update this user' });
            }
        }

        await pool.promise().query(
            'UPDATE users SET status = ?, max_websites = ?, max_databases = ? WHERE id = ?',
            [status, max_websites, max_databases, targetUserId]
        );

        logActivity(req.userId, 'update_user', `Updated user ID ${targetUserId}`, req);
        res.json({ success: true });
    } catch (err) {
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
            'SELECT id, username, email, role, status, two_factor_enabled, createdAt FROM users WHERE id = ?',
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

