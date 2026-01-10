const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class Fail2BanService {
    constructor() {
        this.fail2banPath = 'C:/YumnaPanel/bin/security/fail2ban';
        this.configPath = 'C:/YumnaPanel/etc/fail2ban';
        this.logPath = 'C:/YumnaPanel/logs/fail2ban';
        this.jailsPath = path.join(this.configPath, 'jail.d');
    }

    /**
     * Initialize Fail2Ban configuration
     */
    async initialize() {
        try {
            // Create necessary directories
            await fs.mkdir(this.configPath, { recursive: true });
            await fs.mkdir(this.jailsPath, { recursive: true });
            await fs.mkdir(this.logPath, { recursive: true });

            // Create main configuration
            await this.createMainConfig();

            // Create default jails
            await this.createDefaultJails();

            console.log('[Fail2Ban] Initialized successfully');
            return { success: true };
        } catch (err) {
            console.error('[Fail2Ban] Initialization failed:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Create main fail2ban configuration
     */
    async createMainConfig() {
        const config = `# Fail2Ban Configuration for YumnaPanel
# Auto-generated - Do not edit manually

[DEFAULT]
# Ban settings
bantime = 3600
findtime = 600
maxretry = 5

# Action settings
banaction = iptables-multiport
action = %(action_mwl)s

# Email notifications
destemail = admin@localhost
sendername = Fail2Ban
mta = sendmail

# Log settings
logtarget = ${this.logPath}/fail2ban.log
loglevel = INFO
`;

        await fs.writeFile(path.join(this.configPath, 'fail2ban.conf'), config);
    }

    /**
     * Create default jail configurations
     */
    async createDefaultJails() {
        const jails = {
            'ssh': {
                enabled: true,
                port: 22,
                logpath: 'C:/YumnaPanel/logs/auth.log',
                maxretry: 3,
                bantime: 3600
            },
            'nginx-http-auth': {
                enabled: true,
                port: '80,443',
                logpath: 'C:/YumnaPanel/logs/nginx/*.error.log',
                maxretry: 5,
                bantime: 3600
            },
            'nginx-limit-req': {
                enabled: true,
                port: '80,443',
                logpath: 'C:/YumnaPanel/logs/nginx/*.error.log',
                maxretry: 10,
                bantime: 600
            },
            'phpmyadmin': {
                enabled: true,
                port: '80,443',
                logpath: 'C:/YumnaPanel/logs/nginx/*.access.log',
                maxretry: 3,
                bantime: 7200
            },
            'wordpress-auth': {
                enabled: false,
                port: '80,443',
                logpath: 'C:/YumnaPanel/logs/nginx/*.access.log',
                maxretry: 5,
                bantime: 3600
            }
        };

        for (const [name, config] of Object.entries(jails)) {
            await this.createJail(name, config);
        }
    }

    /**
     * Create or update a jail configuration
     */
    async createJail(name, config) {
        const jailConfig = `# Jail: ${name}
[${name}]
enabled = ${config.enabled}
port = ${config.port}
logpath = ${config.logpath}
maxretry = ${config.maxretry}
bantime = ${config.bantime}
findtime = ${config.findtime || 600}
`;

        const jailFile = path.join(this.jailsPath, `${name}.conf`);
        await fs.writeFile(jailFile, jailConfig);
    }

    /**
     * Get all configured jails
     */
    async getJails() {
        try {
            const files = await fs.readdir(this.jailsPath);
            const jails = [];

            for (const file of files) {
                if (file.endsWith('.conf')) {
                    const content = await fs.readFile(path.join(this.jailsPath, file), 'utf8');
                    const jail = this.parseJailConfig(content);
                    jail.name = file.replace('.conf', '');
                    jails.push(jail);
                }
            }

            return jails;
        } catch (err) {
            console.error('[Fail2Ban] Failed to get jails:', err);
            return [];
        }
    }

    /**
     * Parse jail configuration
     */
    parseJailConfig(content) {
        const config = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\w+)\s*=\s*(.+)$/);
            if (match) {
                const [, key, value] = match;
                config[key] = value.trim();
            }
        }

        return config;
    }

    /**
     * Get banned IPs
     */
    async getBannedIPs() {
        try {
            // In production, this would query actual fail2ban status
            // For now, we'll read from a ban list file
            const banFile = path.join(this.logPath, 'banned_ips.json');

            try {
                const content = await fs.readFile(banFile, 'utf8');
                return JSON.parse(content);
            } catch {
                return [];
            }
        } catch (err) {
            console.error('[Fail2Ban] Failed to get banned IPs:', err);
            return [];
        }
    }

    /**
     * Ban an IP manually
     */
    async banIP(ip, jail = 'manual', reason = 'Manual ban') {
        try {
            const banFile = path.join(this.logPath, 'banned_ips.json');
            let bans = [];

            try {
                const content = await fs.readFile(banFile, 'utf8');
                bans = JSON.parse(content);
            } catch {
                bans = [];
            }

            const ban = {
                ip,
                jail,
                reason,
                timestamp: new Date().toISOString(),
                expires: new Date(Date.now() + 3600000).toISOString() // 1 hour
            };

            bans.push(ban);
            await fs.writeFile(banFile, JSON.stringify(bans, null, 2));

            // In production, execute actual iptables/firewall command
            console.log(`[Fail2Ban] Banned IP: ${ip} (${reason})`);

            return { success: true, ban };
        } catch (err) {
            console.error('[Fail2Ban] Failed to ban IP:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Unban an IP
     */
    async unbanIP(ip) {
        try {
            const banFile = path.join(this.logPath, 'banned_ips.json');
            let bans = [];

            try {
                const content = await fs.readFile(banFile, 'utf8');
                bans = JSON.parse(content);
            } catch {
                return { success: false, error: 'No bans found' };
            }

            const newBans = bans.filter(ban => ban.ip !== ip);
            await fs.writeFile(banFile, JSON.stringify(newBans, null, 2));

            // In production, execute actual iptables/firewall command
            console.log(`[Fail2Ban] Unbanned IP: ${ip}`);

            return { success: true };
        } catch (err) {
            console.error('[Fail2Ban] Failed to unban IP:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get fail2ban statistics
     */
    async getStats() {
        try {
            const jails = await this.getJails();
            const bans = await this.getBannedIPs();

            const stats = {
                total_jails: jails.length,
                enabled_jails: jails.filter(j => j.enabled === 'true').length,
                total_bans: bans.length,
                active_bans: bans.filter(b => new Date(b.expires) > new Date()).length,
                jails_by_status: {
                    enabled: jails.filter(j => j.enabled === 'true').length,
                    disabled: jails.filter(j => j.enabled === 'false').length
                },
                recent_bans: bans.slice(-10).reverse()
            };

            return stats;
        } catch (err) {
            console.error('[Fail2Ban] Failed to get stats:', err);
            return null;
        }
    }

    /**
     * Update jail configuration
     */
    async updateJail(name, config) {
        try {
            await this.createJail(name, config);
            return { success: true };
        } catch (err) {
            console.error('[Fail2Ban] Failed to update jail:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Delete a jail
     */
    async deleteJail(name) {
        try {
            const jailFile = path.join(this.jailsPath, `${name}.conf`);
            await fs.unlink(jailFile);
            return { success: true };
        } catch (err) {
            console.error('[Fail2Ban] Failed to delete jail:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Clean expired bans
     */
    async cleanExpiredBans() {
        try {
            const banFile = path.join(this.logPath, 'banned_ips.json');
            let bans = [];

            try {
                const content = await fs.readFile(banFile, 'utf8');
                bans = JSON.parse(content);
            } catch {
                return { success: true, cleaned: 0 };
            }

            const now = new Date();
            const activeBans = bans.filter(ban => new Date(ban.expires) > now);
            const cleaned = bans.length - activeBans.length;

            await fs.writeFile(banFile, JSON.stringify(activeBans, null, 2));

            console.log(`[Fail2Ban] Cleaned ${cleaned} expired bans`);
            return { success: true, cleaned };
        } catch (err) {
            console.error('[Fail2Ban] Failed to clean bans:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new Fail2BanService();
