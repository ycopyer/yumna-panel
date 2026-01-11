const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { getKeyPath, getPublicKey, generateKey } = require('../../utils/sshKeys');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const verifySignature = (req, secret) => {
    // GitHub
    const ghSig = req.headers['x-hub-signature-256'];
    if (ghSig) {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(ghSig), Buffer.from(digest));
    }

    // GitLab
    const glToken = req.headers['x-gitlab-token'];
    if (glToken) {
        return glToken === secret;
    }

    // If no signature/token header found, return false
    // (Or true if you want to allow insecure webhooks, but we are upgrading for security)
    return false;
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

// Get or Generate SSH Public Key
router.get('/git/key', requireAuth, async (req, res) => {
    try {
        const pubKey = await getPublicKey(req.userId);
        res.json({ publicKey: pubKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Regenerate SSH Key
router.post('/git/key/regenerate', requireAuth, auditLogger('REGENERATE_SSH_KEY'), async (req, res) => {
    try {
        const { publicKey } = await generateKey(req.userId);
        res.json({ publicKey });
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

        const webhookSecret = uuidv4().replace(/-/g, '');

        const [result] = await connection.query(
            'INSERT INTO git_repos (userId, websiteId, name, repoUrl, branch, deployPath, status, webhookSecret) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, websiteId || null, name, repoUrl, branch || 'main', deployPath, 'active', webhookSecret]
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

        // Perform git operations using user's specific SSH key
        // We use GIT_SSH_COMMAND env var to specify the key file
        // StrictHostKeyChecking=no is used to avoid interactive prompt, but has security implications
        // In a stricter env, we should scan keys first.
        const keyPath = getKeyPath(repo.userId);
        // Note: Git 2.3+ supports this env var.
        // On Windows with Git Bash, paths might need conversion, but node exec often handles it.
        // We ensure keyPath is properly escaped or handled.
        // Crucially, on Windows, file paths in GIT_SSH_COMMAND can be tricky if they have spaces.
        // We wrap the ssh command.

        let sshCommand;
        if (process.platform === 'win32') {
            // Windows specific handling if needed. OpenSSH on Windows supports paths.
            // Forward slashes are safer for git bash.
            const safeKeyPath = keyPath.replace(/\\/g, '/');
            sshCommand = `ssh -i "${safeKeyPath}" -o StrictHostKeyChecking=no`;
        } else {
            sshCommand = `ssh -i "${keyPath}" -o StrictHostKeyChecking=no`;
        }

        const deployCmd = `cd "${repo.deployPath}" && git pull origin ${repo.branch}`;
        const env = { ...process.env, GIT_SSH_COMMAND: sshCommand };

        exec(deployCmd, { env }, async (err, stdout, stderr) => {
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

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [repos] = await connection.query('SELECT * FROM git_repos WHERE id = ?', [repoId]);

        if (repos.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Repository not found' });
        }

        const repo = repos[0];

        // Verify Secret if exists
        if (repo.webhookSecret) {
            if (!verifySignature(req, repo.webhookSecret)) {
                await connection.end();
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }

        // Update status to deploying
        await connection.query('UPDATE git_repos SET status = "deploying" WHERE id = ?', [repoId]);
        await connection.end();

        // Perform git operations using user's specific SSH key
        const keyPath = getKeyPath(repo.userId);
        let sshCommand;

        if (process.platform === 'win32') {
            const safeKeyPath = keyPath.replace(/\\/g, '/');
            sshCommand = `ssh -i "${safeKeyPath}" -o StrictHostKeyChecking=no`;
        } else {
            sshCommand = `ssh -i "${keyPath}" -o StrictHostKeyChecking=no`;
        }

        const deployCmd = `cd "${repo.deployPath}" && git pull origin ${repo.branch}`;
        const env = { ...process.env, GIT_SSH_COMMAND: sshCommand };

        exec(deployCmd, { env }, async (err, stdout) => {
            const conn = await mysql.createConnection(dbConfig);
            if (err) {
                await conn.query('UPDATE git_repos SET status = "error", updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [repoId]);
                await conn.end();
                console.error(`[GIT] Webhook Deploy Error for Repo ${repoId}:`, err);
                return;
            }

            await conn.query(
                'UPDATE git_repos SET status = "active", lastDeploy = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                [repoId]
            );
            await conn.end();
            console.log(`[GIT] Webhook Deploy Success for Repo ${repoId}`);
        });

        res.json({ message: 'Webhook verified, deployment started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
