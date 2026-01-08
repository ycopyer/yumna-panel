const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/auth');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PANEL_ROOT = 'C:\\YumnaPanel';

const getServiceStatus = async (serviceName) => {
    return new Promise((resolve) => {
        if (os.platform() !== 'win32') {
            exec(`systemctl is-active ${serviceName}`, (err, stdout) => {
                resolve(stdout.trim() === 'active' ? 'running' : 'stopped');
            });
            return;
        }

        // Windows: Check process table
        let processName = '';
        if (serviceName === 'nginx') processName = 'nginx.exe';
        if (serviceName === 'apache') processName = 'httpd.exe';
        if (serviceName === 'mariadb') processName = 'mysqld.exe';

        exec(`tasklist /FI "IMAGENAME eq ${processName}"`, (err, stdout) => {
            if (stdout.includes(processName)) {
                resolve('running');
            } else {
                resolve('stopped');
            }
        });
    });
};

router.get('/services', requireAdmin, async (req, res) => {
    try {
        const services = [
            { name: 'nginx', label: 'Nginx Web Server', status: await getServiceStatus('nginx') },
            { name: 'apache', label: 'Apache Web Server', status: await getServiceStatus('apache') },
            { name: 'mariadb', label: 'MariaDB Database', status: await getServiceStatus('mariadb') },
            { name: 'yumna-panel', label: 'Yumna Panel Engine', status: 'running' } // Panel is obviously running if this responds
        ];
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/services/:id/:action', requireAdmin, async (req, res) => {
    const { id, action } = req.params;
    const isWin = os.platform() === 'win32';

    if (!isWin) {
        // Linux systemd logic
        const cmd = action === 'start' ? `sudo systemctl start ${id}` : `sudo systemctl stop ${id}`;
        exec(cmd, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Service ${id} ${action}ed` });
        });
        return;
    }

    // Windows Standalone logic
    if (id === 'nginx') {
        const nginxBase = `${PANEL_ROOT}\\bin\\web\\nginx`;
        const nginxExe = `${nginxBase}\\nginx.exe`;
        if (action === 'start') {
            exec(`start "" "${nginxExe}" -p "${nginxBase}"`, { cwd: nginxBase });
            res.json({ message: 'Nginx starting...' });
        } else {
            exec(`taskkill /F /IM nginx.exe`, () => res.json({ message: 'Nginx stopped' }));
        }
    } else if (id === 'apache') {
        const apacheExe = `${PANEL_ROOT}\\bin\\web\\apache\\bin\\httpd.exe`;
        if (action === 'start') {
            exec(`start "" "${apacheExe}"`);
            res.json({ message: 'Apache starting...' });
        } else {
            exec(`taskkill /F /IM httpd.exe`, () => res.json({ message: 'Apache stopped' }));
        }
    } else if (id === 'mariadb') {
        const mariaBase = `${PANEL_ROOT}\\bin\\database\\mariadb`;
        const mariaExe = `${mariaBase}\\bin\\mysqld.exe`;
        const dataDir = `${PANEL_ROOT}\\data\\mysql`;
        if (action === 'start') {
            // Ensure data dir exists
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            exec(`start "" "${mariaExe}" --datadir="${dataDir}" --console`);
            res.json({ message: 'MariaDB starting...' });
        } else {
            // For MariaDB, we might want to use mysqladmin for a clean shutdown
            exec(`taskkill /F /IM mysqld.exe`, () => res.json({ message: 'MariaDB stopped' }));
        }
    } else {
        res.status(400).json({ error: 'Unknown service' });
    }
});

module.exports = router;
