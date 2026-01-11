const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class FirewallService {
    static async sync(rules) {
        // rules: Array of { type, target }
        console.log(`[AGENT] Syncing ${rules.length} firewall rules...`);

        const isWin = process.platform === 'win32';

        if (isWin) {
            // On Windows, we might use netsh or just block in Nginx
            return this.syncNginxBlocks(rules);
        } else {
            // On Linux, use iptables + Nginx
            await this.syncIptables(rules);
            return this.syncNginxBlocks(rules);
        }
    }

    static async syncNginxBlocks(rules) {
        const ipRules = rules.filter(r => r.type === 'ip');
        let conf = '';
        ipRules.forEach(r => {
            conf += `deny ${r.target};\n`;
        });

        const isWin = process.platform === 'win32';
        const blockFile = isWin ? 'C:/YumnaPanel/agent/nginx/blocked_ips.conf' : '/etc/nginx/yumna_blocked_ips.conf';

        try {
            await fs.mkdir(path.dirname(blockFile), { recursive: true });
            await fs.writeFile(blockFile, conf);

            // Reload Nginx
            const reloadCmd = isWin ? 'nginx -s reload' : 'systemctl reload nginx';
            exec(reloadCmd, (err) => {
                if (err) console.warn('[AGENT] Nginx reload failed:', err.message);
            });

            return { success: true, count: ipRules.length };
        } catch (err) {
            console.error('[AGENT] Failed to sync Nginx blocks:', err.message);
            throw err;
        }
    }

    static async syncIptables(rules) {
        // Implement iptables logic here if needed
        // For now, Nginx block is enough for web level
    }
}

module.exports = FirewallService;
