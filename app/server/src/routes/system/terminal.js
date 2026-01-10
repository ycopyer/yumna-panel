const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mysql = require('mysql2/promise');

// Store CWD for each user session in memory
const userSessions = {};
const DEFAULT_CWD = os.homedir();

router.post('/terminal/exec', requireAuth, auditLogger('TERMINAL_EXEC'), async (req, res) => {
    const { command, sshAccountId, websiteId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    let targetRootPath = DEFAULT_CWD;
    let isRestricted = false;

    // If sshAccountId is provided, we jail the session to that account's rootPath
    if (sshAccountId) {
        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME
            });

            const [accounts] = await connection.query(
                'SELECT rootPath, userId FROM ssh_accounts WHERE id = ?',
                [sshAccountId]
            );
            await connection.end();

            if (accounts.length === 0) return res.status(404).json({ error: 'SSH Account not found' });

            // Security check: must be owner or admin
            if (!isAdmin && accounts[0].userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized to use this SSH account' });
            }

            if (accounts[0].rootPath) {
                targetRootPath = accounts[0].rootPath;
                isRestricted = true;
            }
        } catch (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
    } else if (websiteId) {
        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME
            });

            const [websites] = await connection.query(
                'SELECT rootPath, userId FROM websites WHERE id = ?',
                [websiteId]
            );
            await connection.end();

            if (websites.length === 0) return res.status(404).json({ error: 'Website not found' });

            // Security check: must be owner or admin
            if (!isAdmin && websites[0].userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized to use this terminal' });
            }

            if (websites[0].rootPath) {
                targetRootPath = websites[0].rootPath;
                isRestricted = true;
            }
        } catch (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
    } else {
        // System terminal requires admin
        if (!isAdmin) {
            return res.status(403).json({ error: 'Only administrators can use the system terminal' });
        }
    }

    // Get current CWD for user or default
    const sessionKey = sshAccountId ? `ssh_${sshAccountId}` : (websiteId ? `web_${websiteId}` : `system_${userId}`);
    let currentCwd = userSessions[sessionKey] || targetRootPath;

    // Reset Cwd if it's invalid or outside jail
    if (isRestricted && (!currentCwd.toLowerCase().startsWith(targetRootPath.toLowerCase()))) {
        currentCwd = targetRootPath;
    }

    // Handle 'clear' command on frontend scale, but return empty output here
    if (command.trim().toLowerCase() === 'clear') {
        return res.json({ output: '', cwd: currentCwd === targetRootPath ? '~' : currentCwd.replace(targetRootPath, '~').replace(/\\/g, '/') });
    }

    // Handle CD command specially
    if (command.trim().startsWith('cd ')) {
        const targetDir = command.trim().substring(3).trim();
        let newPath = path.resolve(currentCwd, targetDir);

        // Handle cd ~
        if (targetDir === '~' || targetDir === '') {
            newPath = targetRootPath;
        }

        // Jail Check: Prevent moving above rootPath
        if (isRestricted && !newPath.toLowerCase().startsWith(targetRootPath.toLowerCase())) {
            return res.json({ output: `Access Denied: Cannot move outside root directory\n`, cwd: currentCwd === targetRootPath ? '~' : currentCwd.replace(targetRootPath, '~').replace(/\\/g, '/') });
        }

        if (fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory()) {
            userSessions[sessionKey] = newPath;
            const displayCwd = newPath.toLowerCase() === targetRootPath.toLowerCase() ? '~' : newPath.replace(targetRootPath, '~').replace(/\\/g, '/');
            return res.json({ output: '', cwd: displayCwd });
        } else {
            const displayCwd = currentCwd.toLowerCase() === targetRootPath.toLowerCase() ? '~' : currentCwd.replace(targetRootPath, '~').replace(/\\/g, '/');
            return res.json({ output: `cd: no such file or directory: ${targetDir}\n`, cwd: displayCwd });
        }
    }

    // Execute command
    exec(command, { cwd: currentCwd, timeout: 15000, shell: true }, (error, stdout, stderr) => {
        let output = (stdout || '') + (stderr || '');

        if (error && error.killed) {
            output += '\n[System] Command timed out (15s limit).';
        } else if (error && !stderr && !stdout) {
            output += `\nError: ${error.message}`;
        }

        // Filter sensitive paths from output if restricted to make it feel like a jail
        if (isRestricted) {
            const safeRoot = targetRootPath.replace(/\\/g, '/');
            output = output.split(safeRoot).join('~');
            output = output.split(targetRootPath).join('~');
        }

        const displayCwd = currentCwd.toLowerCase() === targetRootPath.toLowerCase() ? '~' : currentCwd.replace(targetRootPath, '~').replace(/\\/g, '/');
        res.json({ output: output, cwd: displayCwd });
    });
});

module.exports = router;
