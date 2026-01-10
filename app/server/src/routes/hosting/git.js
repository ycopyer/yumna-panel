const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Middleware to check Git Repo ownership
const checkGitOwnership = async (req, res, next) => {
    const repoId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM git_repos WHERE id = ?', [repoId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'Repository not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all git repositories
router.get('/git', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT g.*, w.domain FROM git_repos g LEFT JOIN websites w ON g.websiteId = w.id';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE g.userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY g.createdAt DESC';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new git repository
router.post('/git', requireAuth, auditLogger('CREATE_GIT_REPO'), async (req, res) => {
    const { name, repoUrl, branch, deployPath, websiteId } = req.body;
    const userId = req.userId;

    if (!name || !repoUrl || !deployPath) {
        return res.status(400).json({ error: 'Name, Repo URL, and Deploy Path are required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Optional: Check if website exists and user owns it
        if (websiteId) {
            const [web] = await connection.query('SELECT userId FROM websites WHERE id = ?', [websiteId]);
            if (web.length === 0) {
                await connection.end();
                return res.status(404).json({ error: 'Website not found' });
            }
            if (req.userRole !== 'admin' && web[0].userId != userId) {
                await connection.end();
                return res.status(403).json({ error: 'Website access denied' });
            }
        }

        const [result] = await connection.query(
            'INSERT INTO git_repos (userId, websiteId, name, repoUrl, branch, deployPath, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, websiteId || null, name, repoUrl, branch || 'main', deployPath, 'active']
        );

        await connection.end();
        res.status(201).json({
            message: 'Git repository added successfully',
            repoId: result.insertId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete git repository
router.delete('/git/:id', requireAuth, checkGitOwnership, auditLogger('DELETE_GIT_REPO'), async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM git_repos WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Git repository removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deploy repository (Manual Pull)
router.post('/git/:id/deploy', requireAuth, checkGitOwnership, auditLogger('DEPLOY_GIT_REPO'), async (req, res) => {
    const repoId = req.params.id;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [repos] = await connection.query('SELECT * FROM git_repos WHERE id = ?', [repoId]);

        if (repos.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Repository not found' });
        }

        const repo = repos[0];

        // Update status to deploying
        await connection.query('UPDATE git_repos SET status = "deploying" WHERE id = ?', [repoId]);
        await connection.end();

        // Perform git operations
        const deployCmd = `cd "${repo.deployPath}" && git pull origin ${repo.branch}`;

        exec(deployCmd, async (err, stdout, stderr) => {
            const conn = await mysql.createConnection(dbConfig);
            if (err) {
                await conn.query(
                    'UPDATE git_repos SET status = "error", updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                    [repoId]
                );
                await conn.end();
                return res.status(500).json({
                    error: 'Deployment failed',
                    details: stderr || err.message
                });
            }

            await conn.query(
                'UPDATE git_repos SET status = "active", lastDeploy = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                [repoId]
            );
            await conn.end();

            res.json({
                message: 'Deployed successfully',
                output: stdout
            });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Webhook endpoint (Public)
router.post('/webhook/:id', async (req, res) => {
    const repoId = req.params.id;
    // Note: In a production environment, you should verify the webhook secret

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [repos] = await connection.query('SELECT * FROM git_repos WHERE id = ?', [repoId]);

        if (repos.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Repository not found' });
        }

        const repo = repos[0];

        // Update status to deploying
        await connection.query('UPDATE git_repos SET status = "deploying" WHERE id = ?', [repoId]);
        await connection.end();

        // Perform git operations
        const deployCmd = `cd "${repo.deployPath}" && git pull origin ${repo.branch}`;

        exec(deployCmd, async (err) => {
            const conn = await mysql.createConnection(dbConfig);
            if (err) {
                await conn.query('UPDATE git_repos SET status = "error", updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [repoId]);
                await conn.end();
                return;
            }

            await conn.query(
                'UPDATE git_repos SET status = "active", lastDeploy = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                [repoId]
            );
            await conn.end();
        });

        res.json({ message: 'Webhook received, deployment started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
