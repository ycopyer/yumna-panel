const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../config/db');
const { exec } = require('child_process');

class FirewallService {
    constructor() {
        this.isWin = os.platform() === 'win32';
        this.nginxBlockFile = this.isWin ? 'C:\\YumnaPanel\\etc\\nginx\\blocked_ips.conf' : '/etc/nginx/blocked_ips.conf';
        this.apacheBlockFile = this.isWin ? 'C:\\YumnaPanel\\etc\\apache2\\blocked_ips.conf' : '/etc/apache2/blocked_ips.conf';

        // Ensure directories exist
        const nginxDir = path.dirname(this.nginxBlockFile);
        if (!fs.existsSync(nginxDir)) fs.mkdirSync(nginxDir, { recursive: true });

        const apacheDir = path.dirname(this.apacheBlockFile);
        if (!fs.existsSync(apacheDir)) fs.mkdirSync(apacheDir, { recursive: true });
    }

    /**
     * Sync database blocks with web server configuration files
     */
    async sync() {
        console.log('[FIREWALL] Syncing blocked IPs to web server configs...');

        try {
            db.query(
                `SELECT target FROM firewall 
                 WHERE type = 'ip' 
                 AND (expiresAt IS NULL OR expiresAt > NOW())`,
                (err, results) => {
                    if (err) {
                        console.error('[FIREWALL] DB Sync Error:', err.message);
                        return;
                    }

                    const ips = results.map(r => r.target);
                    this.writeNginxConfig(ips);
                    this.writeApacheConfig(ips);
                    this.reloadWebServers();
                }
            );
        } catch (e) {
            console.error('[FIREWALL] Sync Failed:', e.message);
        }
    }

    /**
     * Write Nginx blocklist
     */
    writeNginxConfig(ips) {
        let content = '# Yumna Panel Blocked IPs\n';
        content += '# Automatically generated. Do not edit manually.\n\n';

        ips.forEach(ip => {
            if (this.isValidIP(ip)) {
                content += `deny ${ip};\n`;
            }
        });

        fs.writeFileSync(this.nginxBlockFile, content);
        console.log(`[FIREWALL] Updated Nginx blocklist (${ips.length} IPs)`);
    }

    /**
     * Write Apache blocklist
     */
    writeApacheConfig(ips) {
        // Apache 2.4+ Require syntax
        let content = '# Yumna Panel Blocked IPs\n';

        ips.forEach(ip => {
            if (this.isValidIP(ip)) {
                content += `Require not ip ${ip}\n`;
            }
        });

        fs.writeFileSync(this.apacheBlockFile, content);
        console.log(`[FIREWALL] Updated Apache blocklist (${ips.length} IPs)`);
    }

    /**
     * Reload Nginx and Apache to apply changes
     */
    reloadWebServers() {
        const WebServerService = require('./webserver');
        const configs = WebServerService.getConfigs();

        // Reload Nginx
        exec(configs.nginx.reload, (err) => {
            if (err) console.error('[FIREWALL] Nginx reload failed');
        });

        // Reload Apache
        exec(configs.apache.reload, (err) => {
            if (err) console.error('[FIREWALL] Apache reload failed');
        });
    }

    isValidIP(ip) {
        // Simple regex for IPv4/IPv6
        const ipv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        const ipv6 = /^[0-9a-fA-F:]+$/;
        return ipv4.test(ip) || ipv6.test(ip);
    }
}

module.exports = new FirewallService();
