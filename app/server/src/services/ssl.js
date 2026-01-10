const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const WebServerService = require('./webserver');
const EmailService = require('./email');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

class SSLService {
    /**
     * Run daily check for all certificates
     * - Auto-renewal for Let's Encrypt (if < 30 days left)
     * - Status monitoring
     * - Expiry notifications
     */
    static async dailyCheck() {
        console.log('[SSL-SERVICE] Running daily certificate checks...');
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [certs] = await connection.query('SELECT * FROM ssl_certificates');

            for (const cert of certs) {
                const expiry = new Date(cert.expiry_date);
                const now = new Date();
                const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

                // 1. Auto-renewal for Let's Encrypt
                if (cert.provider === 'letsencrypt' && cert.auto_renew && daysLeft <= 30) {
                    console.log(`[SSL-SERVICE] Certificate for ${cert.domain} is expiring in ${daysLeft} days. Attempting auto-renewal...`);
                    await this.renewCertificate(cert);
                }

                // 2. Expiry Notifications
                if (daysLeft === 14 || daysLeft === 7 || daysLeft === 1) {
                    console.log(`[SSL-SERVICE] Notification sent for ${cert.domain} (${daysLeft} days remaining)`);
                    await this.sendExpiryNotification(cert, daysLeft);
                }

                // 3. Mark as inactive if expired
                if (daysLeft <= 0 && cert.status !== 'expired') {
                    await connection.query('UPDATE ssl_certificates SET status = "expired" WHERE id = ?', [cert.id]);
                }
            }

            await connection.end();
        } catch (err) {
            console.error('[SSL-SERVICE] Check failed:', err.message);
        }
    }

    static async renewCertificate(cert) {
        const isWin = os.platform() === 'win32';
        const domain = cert.domain;

        try {
            const connection = await mysql.createConnection(dbConfig);
            const [webs] = await connection.query('SELECT rootPath, phpVersion FROM websites WHERE domain = ?', [domain]);
            await connection.end();

            if (webs.length === 0) return;
            const website = webs[0];

            if (isWin) {
                const wacsPath = 'C:\\YumnaPanel\\bin\\security\\acme\\wacs.exe';
                // Force renewal attempt
                const cmd = `"${wacsPath}" --renew --baseuri "https://acme-v02.api.letsencrypt.org/" --domain "${domain}"`;

                exec(cmd, async (err) => {
                    if (!err) {
                        console.log(`[SSL-SERVICE] Auto-renewal success for ${domain}`);
                        const conn = await mysql.createConnection(dbConfig);
                        const newExpiry = new Date();
                        newExpiry.setMonth(newExpiry.getMonth() + 3);
                        await conn.query('UPDATE ssl_certificates SET expiry_date = ?, status = "active" WHERE id = ?', [newExpiry, cert.id]);
                        await conn.end();
                    }
                });
            } else {
                exec(`sudo certbot renew --cert-name ${domain}`, async (err) => {
                    if (!err) {
                        console.log(`[SSL-SERVICE] Auto-renewal success for ${domain}`);
                        const conn = await mysql.createConnection(dbConfig);
                        const newExpiry = new Date();
                        newExpiry.setMonth(newExpiry.getMonth() + 3);
                        await conn.query('UPDATE ssl_certificates SET expiry_date = ?, status = "active" WHERE id = ?', [newExpiry, cert.id]);
                        await conn.end();
                    }
                });
            }
        } catch (e) {
            console.error(`[SSL-SERVICE] Renewal failed for ${domain}:`, e.message);
        }
    }

    static async sendExpiryNotification(cert, daysLeft) {
        try {
            // Find owner email
            const connection = await mysql.createConnection(dbConfig);
            const [users] = await connection.query('SELECT email FROM users WHERE id = ?', [cert.userId]);
            await connection.end();

            if (users.length > 0 && users[0].email) {
                const email = users[0].email;
                const subject = `[YumnaPanel] SSL Certificate Expiry Alert: ${cert.domain}`;
                const body = `
                    <h3>SSL Certificate Expiry Alert</h3>
                    <p>The SSL certificate for <strong>${cert.domain}</strong> will expire in ${daysLeft} days (${new Date(cert.expiry_date).toDateString()}).</p>
                    ${cert.provider === 'letsencrypt'
                        ? '<p>YumnaPanel will attempt to auto-renew this certificate. Please ensure your domain is still pointing to this server.</p>'
                        : '<p>This is a custom SSL certificate. Please upload a new certificate via the SSL Hub to avoid website downtime.</p>'}
                    <p>Best Regards,<br>YumnaPanel Team</p>
                `;
                await EmailService.sendEmail(email, subject, body);
            }
        } catch (e) {
            console.error('[SSL-SERVICE] Notification error:', e.message);
        }
    }

    /**
     * Start the periodic checker (every day)
     */
    static start() {
        // Run every 24 hours
        setInterval(() => this.dailyCheck(), 24 * 60 * 60 * 1000);
        // Also run once on startup after 1 minute
        setTimeout(() => this.dailyCheck(), 60000);
    }
}

module.exports = SSLService;
