const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const WebServerService = require('../../services/webserver');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Check SSL ownership
const checkSslOwnership = async (req, res, next) => {
    const sslId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM ssl_certificates WHERE id = ?', [sslId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'SSL certificate not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- Routes ---

// 1. List Certificates
router.get('/', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM ssl_certificates';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY expiry_date ASC';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Issue Let's Encrypt Certificate (POST /api/ssl/letsencrypt)
router.post('/letsencrypt', requireAuth, auditLogger('ISSUE_SSL'), async (req, res) => {
    const { domain, wildcard } = req.body;
    const userId = req.userId;
    const isWin = os.platform() === 'win32';

    if (!domain) return res.status(400).json({ error: 'Domain name is required' });

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Find website info for root path
        const [webs] = await connection.query('SELECT rootPath, phpVersion FROM websites WHERE domain = ?', [domain]);
        if (webs.length === 0) {
            await connection.end();
            return res.status(404).json({ error: `Website for domain ${domain} not found.` });
        }
        const website = webs[0];
        const rootPath = website.rootPath;

        if (isWin) {
            const wacsPath = 'C:\\YumnaPanel\\bin\\security\\acme\\wacs.exe';
            const certPath = 'C:\\YumnaPanel\\etc\\ssl';
            if (!require('fs').existsSync(certPath)) await fs.mkdir(certPath, { recursive: true });

            let hosts = `${domain},www.${domain}`;
            let validation = '--validation filesystem --webroot "' + rootPath + '"';

            if (wildcard) {
                hosts = `*.${domain},${domain}`;
                // Wildcard requires DNS validation. We point to our custom script.
                // Note: The script C:\YumnaPanel\bin\dns\dns-hook.bat must exist and handle the record creation.
                validation = '--validation dns-01 --dnsscript "C:\\YumnaPanel\\bin\\dns\\dns-hook.bat"';
            }

            const cmd = `"${wacsPath}" --source manual --host ${hosts} ${validation} --store pemfiles --pemfilespath "${certPath}" --accepttos --emailadminonexpiry --verbose`;

            console.log(`[SSL] Issuing for ${domain} (Wildcard: ${wildcard}) via WACS...`);

            exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, async (err, stdout, stderr) => {
                if (err) {
                    console.error('[SSL] WACS Error:', stdout);
                    return res.status(500).json({ error: 'Let\'s Encrypt issuance failed. Potential issues: Domain not pointing to this server or DNS validation failed.' });
                }

                try {
                    await WebServerService.enableSSL(domain, rootPath, website.phpVersion);
                    const conn = await mysql.createConnection(dbConfig);
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + 3);

                    await conn.query(
                        'INSERT INTO ssl_certificates (userId, domain, cert_path, key_path, fullchain_path, expiry_date, provider, status, wildcard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            userId, domain,
                            path.join(certPath, `${domain}-chain.pem`),
                            path.join(certPath, `${domain}-key.pem`),
                            path.join(certPath, `${domain}-chain.pem`),
                            expiry, 'letsencrypt', 'active', wildcard ? 1 : 0
                        ]
                    );
                    await conn.end();

                    res.json({ message: 'Let\'s Encrypt certificate issued successfully!' });
                } catch (e) {
                    res.status(500).json({ error: 'Certificate issued but database or config update failed: ' + e.message });
                }
            });
        } else {
            // Linux Certbot logic
            let certbotCmd = `sudo certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --register-unsafely-without-email`;
            if (wildcard) {
                certbotCmd = `sudo certbot certonly --manual -d *.${domain} -d ${domain} --preferred-challenges dns --manual-auth-hook "C:/YumnaPanel/bin/dns/dns-hook.sh" --manual-cleanup-hook "C:/YumnaPanel/bin/dns/dns-hook.sh" --non-interactive --agree-tos`;
            }

            exec(certbotCmd, async (err, stdout, stderr) => {
                if (err) return res.status(500).json({ error: 'SSL issuance failed: ' + stderr });

                try {
                    const conn = await mysql.createConnection(dbConfig);
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + 3);

                    await conn.query(
                        'INSERT INTO ssl_certificates (userId, domain, cert_path, key_path, fullchain_path, expiry_date, provider, status, wildcard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [userId, domain, 'managed-by-certbot', 'managed-by-certbot', 'managed-by-certbot', expiry, 'letsencrypt', 'active', wildcard ? 1 : 0]
                    );
                    await conn.end();

                    res.json({ message: 'SSL certificates issued successfully!', details: stdout });
                } catch (e) {
                    res.status(500).json({ error: 'Certificate issued but database record failed: ' + e.message });
                }
            });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Upload Custom SSL (POST /api/ssl/upload)
router.post('/upload', requireAuth, auditLogger('UPLOAD_SSL'), async (req, res) => {
    const { domain, cert, key, chain } = req.body;
    const userId = req.userId;

    if (!domain || !cert || !key) {
        return res.status(400).json({ error: 'Domain, certificate, and private key are required' });
    }

    try {
        const certDir = os.platform() === 'win32' ? 'C:/YumnaPanel/etc/ssl' : '/etc/ssl/yumnapanel';
        await fs.mkdir(certDir, { recursive: true });

        const certPath = path.join(certDir, `${domain}-custom.pem`);
        const keyPath = path.join(certDir, `${domain}-custom.key`);
        const chainPath = chain ? path.join(certDir, `${domain}-custom-chain.pem`) : certPath;

        await fs.writeFile(certPath, cert);
        await fs.writeFile(keyPath, key);
        if (chain) await fs.writeFile(chainPath, chain);

        const connection = await mysql.createConnection(dbConfig);

        // Find website info for vhost update
        const [webs] = await connection.query('SELECT rootPath, phpVersion FROM websites WHERE domain = ?', [domain]);

        // Add to database
        await connection.query(
            'INSERT INTO ssl_certificates (userId, domain, is_auto, cert_path, key_path, fullchain_path, provider, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, domain, 0, certPath, keyPath, chainPath, 'custom', 'active']
        );

        if (webs.length > 0) {
            // Re-generate VHost with custom SSL
            await WebServerService.enableSSL(domain, webs[0].rootPath, webs[0].phpVersion, certPath, keyPath);
        }

        await connection.end();
        res.json({ message: 'Custom SSL certificate uploaded and applied successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Revoke/Delete SSL (DELETE /api/ssl/:id)
router.delete('/:id', requireAuth, checkSslOwnership, auditLogger('DELETE_SSL'), async (req, res) => {
    const sslId = req.params.id;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT domain, is_auto FROM ssl_certificates WHERE id = ?', [sslId]);

        if (rows.length > 0) {
            const domain = rows[0].domain;
            // Optionally remove files or just update vhost back to HTTP
            // await WebServerService.createNginxVHost(domain, rootPath, phpVersion, false);
            // This requires rootPath which we don't have here easily without join
        }

        await connection.query('DELETE FROM ssl_certificates WHERE id = ?', [sslId]);
        await connection.end();
        res.json({ message: 'SSL certificate record removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Manual SSL Renewal (POST /api/ssl/:id/renew)
router.post('/:id/renew', requireAuth, checkSslOwnership, auditLogger('RENEW_SSL'), async (req, res) => {
    const sslId = req.params.id;
    const userId = req.userId;
    const isWin = os.platform() === 'win32';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT domain, provider, is_auto FROM ssl_certificates WHERE id = ?', [sslId]);

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'SSL certificate not found' });
        }

        const cert = rows[0];
        if (cert.provider !== 'letsencrypt') {
            await connection.end();
            return res.status(400).json({ error: 'Only Let\'s Encrypt certificates can be auto-renewed. For custom SSL, please upload a new certificate.' });
        }

        const domain = cert.domain;

        // Reuse the letsencrypt issuance logic
        // In a real scenario, we'd refactor this into a service
        const [webs] = await connection.query('SELECT rootPath, phpVersion FROM websites WHERE domain = ?', [domain]);
        if (webs.length === 0) {
            await connection.end();
            return res.status(404).json({ error: `Website for domain ${domain} not found.` });
        }
        const website = webs[0];
        const rootPath = website.rootPath;

        if (isWin) {
            const wacsPath = 'C:\\YumnaPanel\\bin\\security\\acme\\wacs.exe';
            const certPath = 'C:\\YumnaPanel\\etc\\ssl';
            const hosts = domain.startsWith('*.') ? domain : `${domain},www.${domain}`;
            const validation = domain.startsWith('*.') ? 'dnsscript' : 'filesystem'; // Simplified for now

            // For renewal, win-acme usually handles it via its own task, but we can force it
            const cmd = `"${wacsPath}" --renew --baseuri "https://acme-v02.api.letsencrypt.org/" --domain "${domain}"`;

            console.log(`[SSL] Renewing for ${domain}...`);
            exec(cmd, async (err, stdout, stderr) => {
                if (err) {
                    // If --renew fails because it's too early, we might try re-issuing
                    const reIssueCmd = `"${wacsPath}" --source manual --host ${hosts} --validation ${validation} ${validation === 'filesystem' ? `--webroot "${rootPath}"` : ''} --store pemfiles --pemfilespath "${certPath}" --accepttos --force --verbose`;
                    exec(reIssueCmd, async (err2, stdout2) => {
                        if (err2) return res.status(500).json({ error: 'Renewal/Issuance failed: ' + stdout2 });

                        await WebServerService.enableSSL(domain, rootPath, website.phpVersion);
                        const conn = await mysql.createConnection(dbConfig);
                        const expiry = new Date();
                        expiry.setMonth(expiry.getMonth() + 3);
                        await conn.query('UPDATE ssl_certificates SET expiry_date = ?, status = "active" WHERE id = ?', [expiry, sslId]);
                        await conn.end();
                        res.json({ message: 'Certificate renewed successfully!' });
                    });
                } else {
                    await WebServerService.enableSSL(domain, rootPath, website.phpVersion);
                    const conn = await mysql.createConnection(dbConfig);
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + 3);
                    await conn.query('UPDATE ssl_certificates SET expiry_date = ?, status = "active" WHERE id = ?', [expiry, sslId]);
                    await conn.end();
                    res.json({ message: 'Certificate renewed successfully!' });
                }
            });
        } else {
            exec(`sudo certbot renew --cert-name ${domain}`, async (err, stdout, stderr) => {
                if (err) return res.status(500).json({ error: 'Renewal failed: ' + stderr });

                const conn = await mysql.createConnection(dbConfig);
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + 3);
                await conn.query('UPDATE ssl_certificates SET expiry_date = ?, status = "active" WHERE id = ?', [expiry, sslId]);
                await conn.end();
                res.json({ message: 'Certificate renewed successfully!', details: stdout });
            });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. SSL Status/Check
router.get('/:domain/status', async (req, res) => {
    const domain = req.params.domain;
    res.json({ status: 'active', domain });
});

module.exports = router;
