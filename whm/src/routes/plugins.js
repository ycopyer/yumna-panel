const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

/**
 * PLUGIN MARKETPLACE ROUTES
 */

// List Plugins
router.get('/', requireAuth, async (req, res) => {
    try {
        // In a real scenario, this might merge DB state with a remote marketplace catalog
        // For now, we use a curated list + DB installed status
        const [installed] = await pool.promise().query('SELECT name FROM plugins WHERE status = "active"');
        const installedNames = installed.map(p => p.name);

        const availablePlugins = [
            {
                id: 'phpmyadmin',
                name: 'phpMyAdmin',
                description: 'The most popular web-based MySQL/MariaDB management tool.',
                version: '5.2.1',
                icon: 'Database',
                category: 'Databases',
                installed: installedNames.includes('phpmyadmin')
            },
            {
                id: 'roundcube',
                name: 'Roundcube Mail',
                description: 'Free and open-source webmail client with a desktop-like interface.',
                version: '1.6.0',
                icon: 'Box',
                category: 'Email',
                installed: installedNames.includes('roundcube')
            },
            {
                id: 'terminal',
                name: 'Advanced Web Terminal',
                description: 'Full-featured XTerm.js terminal with multi-tab support.',
                version: '2.0.0',
                icon: 'Terminal',
                category: 'System',
                installed: installedNames.includes('terminal')
            },
            {
                id: 'docker-ui',
                name: 'Docker Management UI',
                description: 'Visual dashboard for container lifecycle and image management.',
                version: '1.2.4',
                icon: 'Package',
                category: 'Virtualization',
                installed: installedNames.includes('docker-ui')
            }
        ];

        res.json(availablePlugins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Install Plugin
router.post('/install', requirePrivileged, async (req, res) => {
    const { id } = req.body;
    try {
        // Logic to "Install" - For now just record in DB
        await pool.promise().query(
            'INSERT INTO plugins (name, status, version) VALUES (?, "active", ?) ON DUPLICATE KEY UPDATE status = "active"',
            [id, 'latest']
        );

        console.log(`[PLUGINS] Plugin '${id}' installed/activated.`);
        res.json({ success: true, message: `Plugin ${id} installed successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Uninstall Plugin
router.post('/uninstall', requirePrivileged, async (req, res) => {
    const { id } = req.body;
    try {
        await pool.promise().query('UPDATE plugins SET status = "inactive" WHERE name = ?', [id]);
        console.log(`[PLUGINS] Plugin '${id}' uninstalled/deactivated.`);
        res.json({ success: true, message: `Plugin ${id} uninstalled successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
