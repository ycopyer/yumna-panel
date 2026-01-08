const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { getSession, requireAdmin } = require('../../middleware/auth');
const { logActivity } = require('../../utils/logger');
const os = require('os');

const isWindows = os.platform() === 'win32';

// List of services to monitor
const SERVICES = [
    { name: 'yumna-panel', label: 'Yumna Panel Engine', win: 'node', linux: 'node', isInternal: true },
    { name: 'nginx', label: 'Nginx Web Server', win: 'nginx', linux: 'nginx' },
    { name: 'apache', label: 'Apache HTTP Server', win: 'apache2.4', linux: 'apache2' },
    { name: 'mysql', label: 'MySQL Database', win: 'mysql', linux: 'mysql' },
    { name: 'mariadb', label: 'MariaDB Database', win: 'mariadb', linux: 'mariadb' },
    { name: 'php-fpm', label: 'PHP-FPM', win: 'php-fpm', linux: 'php8.2-fpm' }, // Linux version might vary
    { name: 'redis', label: 'Redis Server', win: 'redis', linux: 'redis-server' },
    { name: 'memcached', label: 'Memcached', win: 'memcached', linux: 'memcached' }
];

const checkServiceStatus = (service) => {
    if (service.isInternal) return Promise.resolve('running'); // The panel itself is always running if this code is executing
    return new Promise((resolve) => {
        const cmd = isWindows
            ? `sc query "${service.win}"`
            : `systemctl is-active ${service.linux}`;

        exec(cmd, (err, stdout) => {
            if (isWindows) {
                if (err || stdout.includes('FAILED 1060')) {
                    // Try checking process as fallback for manual/standalone mode
                    exec(`tasklist /FI "IMAGENAME eq ${service.win}.exe"`, (pErr, pStdout) => {
                        if (!pErr && pStdout.includes(`${service.win}.exe`)) {
                            resolve('running');
                        } else {
                            resolve('stopped');
                        }
                    });
                } else if (stdout.includes('RUNNING')) {
                    resolve('running');
                } else {
                    resolve('stopped');
                }
            } else {
                resolve(stdout.trim() === 'active' ? 'running' : 'stopped');
            }
        });
    });
};

// GET /api/services - Get status of all services
router.get('/services', getSession, requireAdmin, async (req, res) => {
    try {
        const results = await Promise.all(SERVICES.map(async (s) => {
            const status = await checkServiceStatus(s);
            return {
                ...s,
                status
            };
        }));
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/services/:name/:action - Start/Stop/Restart service
router.post('/services/:name/:action', getSession, requireAdmin, async (req, res) => {
    const { name, action } = req.params;
    const service = SERVICES.find(s => s.name === name);

    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!['start', 'stop', 'restart'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    let cmd;
    if (isWindows) {
        // Windows sc commands
        if (action === 'start') cmd = `sc start "${service.win}"`;
        else if (action === 'stop') cmd = `sc stop "${service.win}"`;
        else if (action === 'restart') cmd = `sc stop "${service.win}" && sc start "${service.win}"`;
    } else {
        // Linux systemctl commands
        cmd = `sudo systemctl ${action} ${service.linux}`;
    }

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error ${action} service ${name}:`, stderr);
            return res.status(500).json({ error: `Failed to ${action} ${service.label}. Error: ${stderr || err.message}` });
        }
        logActivity(req.sessionData.userId, 'service_action', `${action.toUpperCase()} service: ${service.label}`, req);
        res.json({ success: true, message: `${service.label} ${action}ed successfully.` });
    });
});

module.exports = router;
