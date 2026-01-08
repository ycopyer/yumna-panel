const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const os = require('os');

// Helper for CPU Usage
const getCPUUsage = () => {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
    }
    const total = user + nice + sys + idle + irq;
    return { idle, total };
};

let startUsage = getCPUUsage();

// User's own activity history (for regular users)
router.get('/my-activity-history', requireAuth, (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const query = 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.userId = ? ORDER BY a.createdAt DESC LIMIT 100';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Admin: View all activity history or filter by userId
router.get('/activity-history', requireAdmin, (req, res) => {
    const { userId } = req.query;
    const query = userId
        ? 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.userId = ? ORDER BY a.createdAt DESC LIMIT 100'
        : 'SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id ORDER BY a.createdAt DESC LIMIT 100';
    db.query(query, userId ? [userId] : [], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/analytics/ip-details/:ip', requireAdmin, async (req, res) => {
    const { ip } = req.params;
    try {
        let geo = { country: 'Local Network', city: 'Intern', isp: 'Your Server' };
        if (!(ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.'))) {
            const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,isp`);
            geo = await r.json();
        }
        // Fetch authorized activities
        const activity = await new Promise(resolve => db.query("SELECT a.*, u.username FROM activity_history a LEFT JOIN users u ON a.userId = u.id WHERE a.ipAddress = ? ORDER BY a.createdAt DESC LIMIT 15", [ip], (e, r) => resolve(r || [])));

        // Fetch failed/blocked login attempts (the "why")
        const logins = await new Promise(resolve => db.query("SELECT 'SECURITY_ALERT' as action, failure_reason as description, attempted_at as createdAt, username FROM login_attempts WHERE ip = ? AND success = 0 ORDER BY attempted_at DESC LIMIT 15", [ip], (e, r) => resolve(r || [])));

        // Fetch active firewall blocks
        const blocks = await new Promise(resolve => db.query("SELECT 'FIREWALL_BLOCK' as action, reason as description, createdAt FROM firewall WHERE target = ? AND type = 'ip'", [ip], (e, r) => resolve(r || [])));

        // Merge and sort
        const mergedActivity = [...activity, ...logins, ...blocks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);

        const breakdown = await new Promise(resolve => db.query("SELECT action, COUNT(*) as count FROM activity_history WHERE ipAddress = ? GROUP BY action ORDER BY count DESC", [ip], (e, r) => resolve(r)));

        res.json({ geo, recentActivity: mergedActivity, actionBreakdown: breakdown });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Storage Statistics
router.get('/analytics/storage-stats', requireAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const { LOCAL_STORAGE_BASE } = require('../../services/storage');

        // Calculate local storage usage
        const getDirectorySize = async (dirPath) => {
            let totalSize = 0;
            try {
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                for (const file of files) {
                    const filePath = path.join(dirPath, file.name);
                    if (file.isDirectory()) {
                        totalSize += await getDirectorySize(filePath);
                    } else {
                        const stats = await fs.stat(filePath);
                        totalSize += stats.size;
                    }
                }
            } catch (err) {
                console.error('Error calculating directory size:', err);
            }
            return totalSize;
        };

        const localStorageSize = await getDirectorySize(LOCAL_STORAGE_BASE);

        // Get user-wise storage breakdown
        const userDirs = await fs.readdir(LOCAL_STORAGE_BASE, { withFileTypes: true });
        const userStorage = [];

        for (const dir of userDirs) {
            if (dir.isDirectory()) {
                const dirPath = path.join(LOCAL_STORAGE_BASE, dir.name);
                const size = await getDirectorySize(dirPath);
                userStorage.push({ username: dir.name, size });
            }
        }

        res.json({
            totalLocalStorage: localStorageSize,
            userStorageBreakdown: userStorage.sort((a, b) => b.size - a.size)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Top Downloaded Files
router.get('/analytics/top-downloads', requireAdmin, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const query = `
        SELECT 
            description,
            COUNT(*) as downloadCount,
            MAX(createdAt) as lastDownload
        FROM activity_history 
        WHERE action IN ('download', 'share_download')
        GROUP BY description
        ORDER BY downloadCount DESC
        LIMIT ?
    `;

    db.query(query, [limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Most Active Users
router.get('/analytics/active-users', requireAdmin, (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const query = `
        SELECT 
            u.username,
            u.id as userId,
            COUNT(*) as activityCount,
            MAX(a.createdAt) as lastActivity,
            GROUP_CONCAT(DISTINCT a.action) as actions
        FROM activity_history a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY u.id, u.username
        ORDER BY activityCount DESC
        LIMIT 20
    `;

    db.query(query, [days], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Activity Timeline (for charts)
router.get('/analytics/timeline', requireAdmin, (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const query = `
        SELECT 
            DATE(createdAt) as date,
            action,
            COUNT(*) as count
        FROM activity_history
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(createdAt), action
        ORDER BY date DESC, count DESC
    `;

    db.query(query, [days], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Audit Trail with filters
router.get('/analytics/audit-trail', requireAdmin, (req, res) => {
    const { userId, action, startDate, endDate, limit = 100 } = req.query;

    let query = `
        SELECT 
            a.*,
            u.username,
            u.role
        FROM activity_history a
        LEFT JOIN users u ON a.userId = u.id
        WHERE 1=1
    `;
    const params = [];

    if (userId) {
        query += ' AND a.userId = ?';
        params.push(userId);
    }
    if (action) {
        query += ' AND a.action = ?';
        params.push(action);
    }
    if (startDate) {
        query += ' AND a.createdAt >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND a.createdAt <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY a.createdAt DESC LIMIT ?';
    params.push(parseInt(limit));

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Dashboard Summary
router.get('/analytics/summary', requireAdmin, async (req, res) => {
    try {
        const totalUsers = await new Promise(resolve =>
            db.query('SELECT COUNT(*) as count FROM users', (e, r) => resolve(r[0].count))
        );

        const totalShares = await new Promise(resolve =>
            db.query('SELECT COUNT(*) as count FROM shares', (e, r) => resolve(r[0].count))
        );

        const todayActivity = await new Promise(resolve =>
            db.query('SELECT COUNT(*) as count FROM activity_history WHERE DATE(createdAt) = CURDATE()', (e, r) => resolve(r[0].count))
        );

        const actionBreakdown = await new Promise(resolve =>
            db.query('SELECT action, COUNT(*) as count FROM activity_history WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY action ORDER BY count DESC', (e, r) => resolve(r))
        );

        res.json({
            totalUsers,
            totalShares,
            todayActivity,
            actionBreakdown
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Detail: Action Activities
router.get('/analytics/detail/action/:action', requireAdmin, (req, res) => {
    const { action } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const query = `
        SELECT 
            a.*,
            u.username
        FROM activity_history a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.action = ?
        ORDER BY a.createdAt DESC
        LIMIT ?
    `;

    db.query(query, [action, limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ action, count: results.length, activities: results });
    });
});

// Detail: User Activities
router.get('/analytics/detail/user/:userId', requireAdmin, (req, res) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const query = `
        SELECT 
            a.*,
            u.username
        FROM activity_history a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.userId = ?
        ORDER BY a.createdAt DESC
        LIMIT ?
    `;

    db.query(query, [userId, limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get user info and summary
        const username = results[0]?.username || 'Unknown';
        const actions = [...new Set(results.map(r => r.action))].join(',');
        const lastActivity = results[0]?.createdAt;

        res.json({
            userId,
            username,
            activityCount: results.length,
            lastActivity,
            actions,
            activities: results
        });
    });
});

// Detail: File Downloads
router.get('/analytics/detail/file', requireAdmin, (req, res) => {
    const description = req.query.description;
    const limit = parseInt(req.query.limit) || 50;

    if (!description) return res.status(400).json({ error: 'Description required' });

    const query = `
        SELECT 
            a.*,
            u.username
        FROM activity_history a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.description = ? AND a.action IN ('download', 'share_download')
        ORDER BY a.createdAt DESC
        LIMIT ?
    `;

    db.query(query, [description, limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const lastDownload = results[0]?.createdAt;
        const users = [...new Set(results.map(r => r.userId).filter(id => id))];

        res.json({
            description,
            downloadCount: results.length,
            lastDownload,
            uniqueUsers: users.length,
            downloads: results
        });
    });
});

// Server Pulse: Real-time System Metrics
router.get('/analytics/server-pulse', requireAdmin, async (req, res) => {
    try {
        const endUsage = getCPUUsage();
        const idleDiff = endUsage.idle - startUsage.idle;
        const totalDiff = endUsage.total - startUsage.total;
        const cpuPercentage = totalDiff > 0 ? (100 - (100 * idleDiff / totalDiff)) : 0;

        // Reset for next call
        startUsage = endUsage;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercentage = (usedMem / totalMem) * 100;

        const uptime = os.uptime(); // in seconds
        const loadAvg = os.loadavg();

        res.json({
            cpu: {
                percentage: Math.round(cpuPercentage * 100) / 100,
                loadAvg: loadAvg,
                cores: os.cpus().length,
                model: os.cpus()[0].model
            },
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                percentage: Math.round(memPercentage * 100) / 100
            },
            uptime: uptime,
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
