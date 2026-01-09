const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

const checkWebsiteOwnership = async (req, res, next) => {
    const websiteId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM websites WHERE id = ?', [websiteId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'Website not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const WebServerService = require('../../services/webserver');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// --- Defaults ---
router.get('/websites/defaults', (req, res) => {
    const isWin = require('os').platform() === 'win32';
    // Use forward slashes even on Windows for consistency in web config
    const baseDir = isWin ? 'C:/YumnaPanel/www' : '/var/www';
    res.json({ baseDir });
});

router.get('/websites', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';


    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM websites';
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


router.post('/websites', requireAuth, auditLogger('CREATE_WEBSITE'), async (req, res) => {
    let { domain, rootPath, phpVersion, targetUserId } = req.body;
    let userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    // If admin provides a target user, use it
    if (isAdmin && targetUserId) {
        userId = targetUserId;
    }



    const serverIp = process.env.SERVER_IP || '127.0.0.1';

    // Auto-detect Root Path if not provided
    if (!rootPath) {
        const isWin = require('os').platform() === 'win32';
        // Use standard paths based on OS
        const baseDir = isWin ? 'C:/YumnaPanel/www' : '/var/www';
        rootPath = `${baseDir}/${domain}`;
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // --- QUOTA CHECK ---
        if (!isAdmin) {
            const [userResolves] = await connection.query('SELECT max_websites FROM users WHERE id = ?', [userId]);
            // Default to 3 if not set
            const maxWebsites = userResolves[0]?.max_websites ?? 3;

            const [countResolves] = await connection.query('SELECT COUNT(*) as count FROM websites WHERE userId = ?', [userId]);
            const currentCount = countResolves[0].count;

            if (currentCount >= maxWebsites) {
                await connection.end();
                return res.status(403).json({
                    error: `You have reached your limit of ${maxWebsites} websites. Please upgrade your plan to create more.`
                });
            }
        }
        // -------------------

        await connection.beginTransaction();

        // 1. Create Website Entry
        const [webResult] = await connection.query(
            'INSERT INTO websites (userId, domain, rootPath, phpVersion, status) VALUES (?, ?, ?, ?, ?)',
            [userId, domain, rootPath, phpVersion || '8.2', 'active']
        );
        const websiteId = webResult.insertId;

        // 2. Create DNS Zone if not exists
        const [existingZones] = await connection.query('SELECT id FROM dns_zones WHERE domain = ?', [domain]);
        let zoneId;
        if (existingZones.length === 0) {
            const [zoneResult] = await connection.query('INSERT INTO dns_zones (userId, domain) VALUES (?, ?)', [userId, domain]);
            zoneId = zoneResult.insertId;

            // 3. Create Default DNS Records
            const defaultRecords = [
                { type: 'A', name: '@', content: serverIp },
                { type: 'A', name: '*', content: serverIp },
                { type: 'CNAME', name: 'www', content: domain },
                { type: 'CNAME', name: 'ftp', content: domain },
                { type: 'MX', name: '@', content: `mail.${domain}`, priority: 10 },
                { type: 'A', name: 'mail', content: serverIp },
                { type: 'NS', name: '@', content: 'ns1.yumnapanel.com' },
                { type: 'NS', name: '@', content: 'ns2.yumnapanel.com' }
            ];

            for (const rec of defaultRecords) {
                await connection.query(
                    'INSERT INTO dns_records (zoneId, type, name, content, priority) VALUES (?, ?, ?, ?, ?)',
                    [zoneId, rec.type, rec.name, rec.content, rec.priority || 0]
                );
            }
        }

        await connection.commit();

        // 3a. Create Document Root & Default Page
        try {
            await fs.mkdir(rootPath, { recursive: true });
            const indexPath = path.join(rootPath, 'index.html');
            const indexPhpPath = path.join(rootPath, 'index.php');

            // Only create default index.html if no index file exists
            try {
                // Check if files exist using access (throws if not exists)
                await fs.access(indexPath);
            } catch (noIndexHtml) {
                try {
                    await fs.access(indexPhpPath);
                } catch (noIndexPhp) {
                    // Neither exists, create default index.html
                    const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${domain}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #fff; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
        .container { text-align: center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; width: 90%; }
        h1 { margin-bottom: 15px; font-weight: 800; }
        p { opacity: 0.6; line-height: 1.6; }
        .badge { background: #6366f1; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="container">
        <span class="badge">Yumna Panel Managed</span>
        <h1>Welcome to ${domain}</h1>
        <p>This website has been successfully created and is ready for content.</p>
        <p style="font-size: 12px; margin-top: 30px; opacity: 0.4;">Generated by Yumna Panel v1.5</p>
    </div>
</body>
</html>`;
                    await fs.writeFile(indexPath, defaultHtml);
                }
            }
        } catch (fsErr) {
            console.error('[FS ERROR] Failed to create website root/index:', fsErr);
            // Don't fail the request, just log it. The site entry is created.
        }

        // Initialize PHP CGI process for Windows
        if (require('os').platform() === 'win32' && phpVersion) {
            const { findPHPDir } = require('./php');
            const phpDir = findPHPDir(phpVersion);
            if (phpDir) {
                const vPart = phpVersion.replace(/[^0-9]/g, '');
                const phpPort = vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000';
                await WebServerService.ensurePHPProcess(phpDir, phpPort);
            }
        }

        // Generate Web Server VHosts
        try {
            await WebServerService.createNginxVHost(domain, rootPath, phpVersion);
            await WebServerService.createApacheVHost(domain, rootPath);
        } catch (vErr) {
            console.error('[VHOST ERROR]', vErr);
        }

        res.status(201).json({
            message: 'Website and DNS configuration created successfully',
            websiteId,
            dnsZoneId: zoneId
        });
    } catch (err) {
        if (connection) await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(409).json({ error: `Domain '${domain}' already exists.` });
        }
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

router.put('/websites/:id', requireAuth, checkWebsiteOwnership, async (req, res) => {

    const { rootPath, phpVersion } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(
            'UPDATE websites SET rootPath = ?, phpVersion = ? WHERE id = ?',
            [rootPath, phpVersion, req.params.id]
        );
        await connection.end();

        // Update PHP process if version changed
        if (require('os').platform() === 'win32' && phpVersion) {
            const { findPHPDir } = require('./php');
            const phpDir = findPHPDir(phpVersion);
            if (phpDir) {
                const vPart = phpVersion.replace(/[^0-9]/g, '');
                const phpPort = vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000';
                await WebServerService.ensurePHPProcess(phpDir, phpPort);
            }
        }

        // Refresh VHosts for the updated site
        try {
            const mysql = require('mysql2/promise');
            const connection = await mysql.createConnection(dbConfig);
            const [sites] = await connection.query('SELECT domain FROM websites WHERE id = ?', [req.params.id]);
            await connection.end();

            if (sites.length > 0) {
                const domain = sites[0].domain;
                await WebServerService.createNginxVHost(domain, rootPath, phpVersion);
                await WebServerService.createApacheVHost(domain, rootPath);
            }
        } catch (vErr) {
            console.error('[VHOST UPDATE ERROR]', vErr);
        }

        res.json({ message: 'Website settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/websites/:id/status', requireAuth, checkWebsiteOwnership, async (req, res) => {

    const { status } = req.body; // 'active' or 'suspended'
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('UPDATE websites SET status = ? WHERE id = ?', [status, req.params.id]);
        await connection.end();
        res.json({ message: `Website ${status === 'suspended' ? 'suspended' : 'activated'} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/websites/:id/maintenance', requireAuth, checkWebsiteOwnership, async (req, res) => {

    const { enabled } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('UPDATE websites SET maintenance_mode = ? WHERE id = ?', [enabled, req.params.id]);
        await connection.end();
        res.json({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Website Owner (Admin Only)
router.put('/websites/:id/owner', requireAdmin, async (req, res) => {
    const { targetUserId } = req.body;
    const websiteId = req.params.id;

    if (!targetUserId) return res.status(400).json({ error: 'Target User ID required' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('UPDATE websites SET userId = ? WHERE id = ?', [targetUserId, websiteId]);

        // Also update DNS zone ownership if it exists
        const [webs] = await connection.query('SELECT domain FROM websites WHERE id = ?', [websiteId]);
        if (webs.length > 0) {
            await connection.query('UPDATE dns_zones SET userId = ? WHERE domain = ?', [targetUserId, webs[0].domain]);
        }

        await connection.end();
        res.json({ message: 'Owner updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/websites/:id', requireAuth, checkWebsiteOwnership, async (req, res) => {


    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query('DELETE FROM websites WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Website deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// One-Click App Installer
router.post('/websites/:id/install', requireAuth, checkWebsiteOwnership, async (req, res) => {
    const { appType } = req.body; // 'WordPress', 'Laravel', etc.
    const crypto = require('crypto');
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // 1. Validate Website
        const [webs] = await connection.query('SELECT * FROM websites WHERE id = ?', [req.params.id]);
        if (webs.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Website not found' });
        }
        const website = webs[0];
        const userId = website.userId;

        // 2. Generate Random DB Credentials
        const dbSuffix = crypto.randomBytes(3).toString('hex');
        const newDbName = `wp_${dbSuffix}`;
        const newDbUser = `u_${dbSuffix}`;
        const newDbPass = crypto.randomBytes(8).toString('hex') + 'Aa1!';

        // 3. Create Database & User in MySQL
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${newDbName}\``);
        await connection.query(`CREATE USER '${newDbUser}'@'localhost' IDENTIFIED BY '${newDbPass}'`);
        await connection.query(`GRANT ALL PRIVILEGES ON \`${newDbName}\`.* TO '${newDbUser}'@'localhost'`);
        await connection.query('FLUSH PRIVILEGES');

        // 4. Register DB in Panel
        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [userId, newDbName, newDbUser, newDbPass]
        );

        // 5. Deploy Files
        const targetDir = website.rootPath;
        if (!fsSync.existsSync(targetDir)) {
            fsSync.mkdirSync(targetDir, { recursive: true });
        }

        if (appType === 'WordPress') {
            const axios = require('axios');
            const AdmZip = require('adm-zip');
            const downloadUrl = 'https://wordpress.org/latest.zip';
            const tempZipPath = path.join(targetDir, 'temp_wp_install.zip');

            console.log(`[Installer] Downloading WordPress from ${downloadUrl}...`);
            const writer = fsSync.createWriteStream(tempZipPath);
            const response = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream'
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`[Installer] Extracting to ${targetDir}...`);
            const zip = new AdmZip(tempZipPath);
            zip.extractAllTo(targetDir, true);

            // Move files from 'wordpress' subfolder to root
            const wpSubDir = path.join(targetDir, 'wordpress');
            if (fsSync.existsSync(wpSubDir)) {
                const files = fsSync.readdirSync(wpSubDir);
                for (const file of files) {
                    const srcPath = path.join(wpSubDir, file);
                    const destPath = path.join(targetDir, file);
                    if (fsSync.existsSync(destPath)) {
                        fsSync.rmSync(destPath, { recursive: true, force: true });
                    }
                    fsSync.renameSync(srcPath, destPath);
                }
                fsSync.rmdirSync(wpSubDir);
            }

            // Cleanup Zip
            fsSync.unlinkSync(tempZipPath);

            // Generate Keys/Salts
            const generateSalt = () => crypto.randomBytes(64).toString('base64');

            const wpConfigContent = `<?php
define( 'DB_NAME',     '${newDbName}' );
define( 'DB_USER',     '${newDbUser}' );
define( 'DB_PASSWORD', '${newDbPass}' );
define( 'DB_HOST',     'localhost' );
define( 'DB_CHARSET',  'utf8' );
define( 'DB_COLLATE',  '' );

/** Authentication Unique Keys and Salts. */
define('AUTH_KEY',         '${generateSalt()}');
define('SECURE_AUTH_KEY',  '${generateSalt()}');
define('LOGGED_IN_KEY',    '${generateSalt()}');
define('NONCE_KEY',        '${generateSalt()}');
define('AUTH_SALT',        '${generateSalt()}');
define('SECURE_AUTH_SALT', '${generateSalt()}');
define('LOGGED_IN_SALT',   '${generateSalt()}');
define('NONCE_SALT',       '${generateSalt()}');

$table_prefix = 'wp_';

define( 'WP_DEBUG', false );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
`;
            fsSync.writeFileSync(path.join(targetDir, 'wp-config.php'), wpConfigContent);

        } else if (appType === 'Laravel') {
            const { exec } = require('child_process');

            // Clean directory completely - Composer requires empty directory
            console.log(`[Installer] Cleaning directory ${targetDir}...`);
            const files = fsSync.readdirSync(targetDir);
            for (const file of files) {
                const filePath = path.join(targetDir, file);
                const stat = fsSync.statSync(filePath);
                if (stat.isDirectory()) {
                    fsSync.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fsSync.unlinkSync(filePath);
                }
            }

            // Windows Composer Path
            const isWin = require('os').platform() === 'win32';
            const composerCmd = isWin ? 'C:\\YumnaPanel\\bin\\php\\composer.bat' : 'composer';

            // Enable required Laravel extensions
            console.log(`[Installer] 🔧 Ensuring required PHP extensions are enabled...`);
            const { findPHPDir } = require('./php');
            const phpDir = findPHPDir(website.phpVersion || '8.2');

            if (phpDir && isWin) {
                const phpIniPath = path.join(phpDir, 'php.ini');
                const requiredExtensions = ['fileinfo', 'openssl', 'pdo_mysql', 'mbstring', 'tokenizer', 'xml', 'ctype', 'json', 'bcmath', 'curl'];

                try {
                    let phpIni = fsSync.readFileSync(phpIniPath, 'utf8');
                    let modified = false;

                    for (const ext of requiredExtensions) {
                        const commentedLine = `;extension=${ext}`;
                        const activeLine = `extension=${ext}`;

                        if (phpIni.includes(commentedLine)) {
                            phpIni = phpIni.replace(new RegExp(`;extension=${ext}`, 'g'), activeLine);
                            console.log(`[Installer] ✅ Enabled extension: ${ext}`);
                            modified = true;
                        } else if (!phpIni.includes(activeLine)) {
                            // Extension not found, add it
                            phpIni += `\n${activeLine}\n`;
                            console.log(`[Installer] ✅ Added extension: ${ext}`);
                            modified = true;
                        }
                    }

                    if (modified) {
                        fsSync.writeFileSync(phpIniPath, phpIni);
                        console.log(`[Installer] 📝 Updated php.ini with required extensions`);
                    } else {
                        console.log(`[Installer] ✅ All required extensions already enabled`);
                    }
                } catch (err) {
                    console.error(`[Installer] ⚠️ Could not modify php.ini:`, err.message);
                }
            }

            console.log(`[Installer] ⏳ Starting Laravel installation...`);
            console.log(`[Installer] 📦 Running Composer in: ${targetDir}`);

            await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');

                // Find PHP directory and add to PATH
                const { findPHPDir } = require('./php');
                const phpDir = findPHPDir(website.phpVersion || '8.2');

                // Prepare environment with PHP in PATH
                const env = { ...process.env };
                if (phpDir && isWin) {
                    env.PATH = `${phpDir};${env.PATH}`;
                    console.log(`[Installer] 🔧 Added PHP to PATH: ${phpDir}`);
                }

                // Use spawn for real-time output
                const composerProcess = spawn(composerCmd, [
                    'create-project',
                    'laravel/laravel',
                    '.',
                    '--prefer-dist',
                    '--no-interaction'
                ], {
                    cwd: targetDir,
                    shell: true,
                    env: env
                });

                let output = '';
                let errorOutput = '';

                composerProcess.stdout.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    // Log progress in real-time
                    console.log(`[Laravel] ${text.trim()}`);
                });

                composerProcess.stderr.on('data', (data) => {
                    const text = data.toString();
                    errorOutput += text;
                    console.error(`[Laravel Error] ${text.trim()}`);
                });

                composerProcess.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`[Laravel Install Failed] Exit code: ${code}`);
                        reject(new Error(`Composer failed with exit code ${code}: ${errorOutput || 'Unknown error'}`));
                    } else {
                        console.log(`[Laravel Install] ✅ Installation completed successfully!`);
                        resolve(output);
                    }
                });

                composerProcess.on('error', (err) => {
                    console.error(`[Laravel Install] Process error:`, err);
                    reject(err);
                });
            });

            // Post-Install: Configure .env
            console.log(`[Installer] 🔧 Configuring Laravel .env file...`);
            const envPath = path.join(targetDir, '.env');
            if (fsSync.existsSync(envPath)) {
                let envContent = fsSync.readFileSync(envPath, 'utf8');
                envContent = envContent.replace(/DB_DATABASE=laravel/, `DB_DATABASE=${newDbName}`);
                envContent = envContent.replace(/DB_USERNAME=root/, `DB_USERNAME=${newDbUser}`);
                envContent = envContent.replace(/DB_PASSWORD=/, `DB_PASSWORD=${newDbPass}`);
                envContent = envContent.replace(/APP_URL=http:\/\/localhost/, `APP_URL=http://${website.domain}`);
                fsSync.writeFileSync(envPath, envContent);
                console.log(`[Installer] ✅ Database credentials configured in .env`);
            }
        }

        await connection.commit();
        res.json({
            message: `${appType} installed successfully!`,
            details: {
                database: newDbName,
                user: newDbUser,
                path: targetDir,
                login: 'Visit your domain to see the default page.'
            }
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Installation failed:", err);
        // Clean up partial downloads?
        res.status(500).json({ error: 'Installation failed: ' + err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Raw Config Management ---
router.get('/websites/:id/config', requireAuth, checkWebsiteOwnership, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [webs] = await connection.query('SELECT domain FROM websites WHERE id = ?', [req.params.id]);
        await connection.end();

        if (webs.length === 0) return res.status(404).json({ error: 'Website not found' });
        const domain = webs[0].domain;

        const { nginx, apache, isWin } = WebServerService.getConfigs();

        // Try Nginx first, then Apache
        const nginxPath = path.join(nginx.available, isWin ? `${domain}.conf` : domain);
        const apachePath = path.join(apache.available, `${domain}.conf`);

        let config = '';
        let type = 'nginx';

        try {
            config = await fs.readFile(nginxPath, 'utf8');
            type = 'nginx';
        } catch (e) {
            try {
                config = await fs.readFile(apachePath, 'utf8');
                type = 'apache';
            } catch (e2) {
                return res.status(404).json({ error: 'Configuration file not found' });
            }
        }

        res.json({ config, type });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/websites/:id/config', requireAuth, checkWebsiteOwnership, async (req, res) => {
    const { config, type } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [webs] = await connection.query('SELECT domain FROM websites WHERE id = ?', [req.params.id]);
        await connection.end();

        if (webs.length === 0) return res.status(404).json({ error: 'Website not found' });
        const domain = webs[0].domain;

        const configs = WebServerService.getConfigs();
        const info = type === 'nginx' ? configs.nginx : configs.apache;
        const filePath = path.join(info.available, type === 'nginx' && configs.isWin ? `${domain}.conf` : (type === 'apache' ? `${domain}.conf` : domain));

        await fs.writeFile(filePath, config);

        // Reload server
        const { exec } = require('child_process');
        exec(info.reload, (err) => {
            if (err) return res.status(500).json({ error: 'Config saved but reload failed: ' + err.message });
            res.json({ message: 'Configuration updated and server reloaded' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Site Logs ---
router.get('/websites/:id/logs', requireAuth, checkWebsiteOwnership, async (req, res) => {
    const { logType } = req.query; // 'access' or 'error'
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [webs] = await connection.query('SELECT domain FROM websites WHERE id = ?', [req.params.id]);
        await connection.end();

        if (webs.length === 0) return res.status(404).json({ error: 'Website not found' });

        // In a real Linux environment with Nginx/Apache set up by our deploy script:
        // Logs are usually in /var/log/nginx/access.log or /var/log/apache2/error.log
        // For professional panels, we usually set custom log paths per site.
        // For now, let's mock or read system logs if available.

        const isWin = require('os').platform() === 'win32';
        let logPath = '';

        if (isWin) {
            const nginxBase = 'C:\\YumnaPanel\\bin\\web\\nginx';
            logPath = logType === 'error'
                ? `${nginxBase}\\logs\\error.log`
                : `${nginxBase}\\logs\\access.log`;
        } else {

            logPath = logType === 'error' ? '/var/log/nginx/error.log' : '/var/log/nginx/access.log';
        }

        const { exec } = require('child_process');
        exec(`tail -n 100 "${logPath}"`, (err, stdout) => {
            if (err) return res.json({ logs: 'No logs found or access denied.' });
            res.json({ logs: stdout });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SSL Issuance (Certbot) ---
router.post('/websites/:id/ssl', requireAuth, checkWebsiteOwnership, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [webs] = await connection.query('SELECT domain, rootPath, phpVersion FROM websites WHERE id = ?', [req.params.id]);
        await connection.end();

        if (webs.length === 0) return res.status(404).json({ error: 'Website not found' });
        const domain = webs[0].domain;

        const isWin = require('os').platform() === 'win32';

        // --- Windows Standalone (Win-ACME) ---
        if (isWin) {
            const wacsPath = 'C:\\YumnaPanel\\bin\\security\\acme\\wacs.exe';
            if (!require('fs').existsSync(wacsPath)) {
                return res.status(500).json({ error: 'SSL Client (win-acme) not found. Please run online.bat provisioning.' });
            }

            const certPath = 'C:\\YumnaPanel\\etc\\ssl';
            if (!require('fs').existsSync(certPath)) require('fs').mkdirSync(certPath, { recursive: true });

            const webroot = webs[0].rootPath || `C:\\YumnaPanel\\www\\${domain}`;

            // Construct WACS command (Manual Source, Filesystem Validation, PEM Store)
            // --host domain,www.domain
            const hosts = `${domain},www.${domain}`;
            const cmd = `"${wacsPath}" --source manual --host ${hosts} --validation filesystem --webroot "${webroot}" --store pemfiles --pemfilespath "${certPath}" --accepttos --emailadminonexpiry --verbose`;

            const { exec } = require('child_process');
            console.log(`[SSL] Executing: ${cmd}`);

            exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, async (err, stdout, stderr) => {
                if (err) {
                    console.error('[SSL] WACS Error:', stdout); // WACS often prints error details to stdout
                    return res.status(500).json({ error: 'SSL issuance failed. Check server logs.' });
                }

                // If successful, update WebServer Config to use SSL
                try {
                    // Re-generate VHost with SSL enabled
                    const WebServerService = require('../../services/webserver');
                    // We need to know which server is active. Assuming both or Nginx primary.
                    // WebServerService can handle this if we pass ssl: true
                    // But we need to update createNginxVHost signature or logic.
                    // For now, let's just claim success and tell them to functionality is basic.
                    // Ideally: await WebServerService.enableSSL(domain, webroot);

                    // Let's implement enableSSL in WebServerService
                    await WebServerService.enableSSL(domain, webroot, webs[0].phpVersion);

                    res.json({ message: 'SSL certificate issued and applied successfully!', details: 'HTTPS is now active.' });
                } catch (configErr) {
                    res.status(500).json({ error: 'Certificate issued but config update failed: ' + configErr.message });
                }
            });
            return;
        }

        // --- Linux Logic (Certbot) ---
        const { exec } = require('child_process');
        exec(`sudo certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --register-unsafely-without-email`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: 'SSL issuance failed: ' + stderr });
            res.json({ message: 'SSL certificates issued successfully!', details: stdout });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

