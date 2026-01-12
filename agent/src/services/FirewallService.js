const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class FirewallService {
    static async sync(rules, patterns = []) {
        console.log(`[AGENT] Syncing ${rules.length} rules and ${patterns?.length || 0} patterns...`);

        const isWin = process.platform === 'win32';
        const nginxPath = isWin ? 'C:/YumnaPanel/bin/nginx/nginx' : '/etc/nginx'; // Adjust path as needed

        const blockFile = isWin
            ? 'C:/YumnaPanel/agent/nginx/security_rules.conf'
            : '/etc/nginx/yumna_security_rules.conf';

        // 1. Process Rules
        let conf = '# Yumna Panel Automated Security Rules\n\n';

        const whitelist = rules.filter(r => r.type === 'whitelist');
        const blacklist = rules.filter(r => r.type === 'blacklist' || r.type === 'block_ip'); // Legacy 'ip'
        const geoblock = rules.filter(r => r.type === 'geoblock');

        // Whitelist (Allow these, stop processing)
        if (whitelist.length > 0) {
            conf += '# Whitelist\n';
            whitelist.forEach(r => {
                conf += `allow ${r.target};\n`;
            });
            conf += '\n';
        }

        // Blacklist (Deny these)
        if (blacklist.length > 0) {
            conf += '# Blacklist\n';
            blacklist.forEach(r => {
                conf += `deny ${r.target};\n`;
            });
            conf += '\n';
        }

        // GeoBlock (Simplified - Nginx needs GeoIP module for real Country Code blocking)
        // If we supply target="ALL" and country="CN", we assume Nginx has GeoIP setup.
        // For now, we will add comment as placeholder or advanced implementations.
        if (geoblock.length > 0) {
            conf += '# GeoBlock (Requires Nginx GeoIP)\n';
            geoblock.forEach(r => {
                // Example: if ($geoip_country_code = CN) { return 403; }
                conf += `# Block ${r.country || r.target}\n`;
            });
            conf += '\n';
        }

        // 2. Process Patterns (Basic WAF)
        if (patterns && patterns.length > 0) {
            conf += '# Security Patterns (Basic WAF)\n';
            patterns.forEach(p => {
                if (p.isActive) {
                    // Safety check for pattern validity to avoid breaking Nginx
                    // We escape quotes
                    const safePattern = p.pattern.replace(/"/g, '\\"');
                    conf += `if ($request_uri ~* "${safePattern}") { return 403; }\n`;
                    conf += `if ($args ~* "${safePattern}") { return 403; }\n`;
                    conf += `if ($http_user_agent ~* "${safePattern}") { return 403; }\n`;
                }
            });
        }

        try {
            await fs.mkdir(path.dirname(blockFile), { recursive: true });
            await fs.writeFile(blockFile, conf);

            console.log('[AGENT] Written security config to', blockFile);

            // Reload Nginx
            return new Promise((resolve, reject) => {
                const reloadCmd = isWin
                    ? 'tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL && nginx -s reload' // Only reload if running
                    : 'systemctl reload nginx';

                exec(reloadCmd, (err) => {
                    if (err) {
                        // It's okay if nginx is not running yet
                        console.warn('[AGENT] Nginx reload warning:', err.message);
                    }
                    resolve({ success: true, rules: rules.length, patterns: patterns?.length || 0 });
                });
            });

        } catch (err) {
            console.error('[AGENT] Failed to sync security rules:', err.message);
            throw err;
        }
    }
}

module.exports = FirewallService;
