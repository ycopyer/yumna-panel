const pool = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

class IPAccessControlService {
    constructor() {
        this.configPath = 'C:/YumnaPanel/etc/nginx/ip-access';
    }

    /**
     * Get a connection from the pool
     */
    async getConnection() {
        return pool.promise();
    }

    /**
     * Initialize IP access control
     */
    async initialize() {
        try {
            await fs.mkdir(this.configPath, { recursive: true });

            // Create database table if not exists (Handled by initTables now, but keeping for safety)
            const db = await this.getConnection();
            await db.query(`
                CREATE TABLE IF NOT EXISTS ip_access_rules (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    website_id INT NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    rule_type ENUM('whitelist', 'blacklist') NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INT,
                    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
                    INDEX idx_website (website_id),
                    INDEX idx_ip (ip_address)
                )
            `);
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly, but service was using createConnection before.


            console.log('[IP Access Control] Initialized successfully');
            return { success: true };
        } catch (err) {
            console.error('[IP Access Control] Initialization failed:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get IP access rules for a website
     */
    async getRules(websiteId) {
        const db = await this.getConnection();
        try {
            const [rules] = await db.query(
                `SELECT r.*, u.username as created_by_username
                 FROM ip_access_rules r
                 LEFT JOIN users u ON r.created_by = u.id
                 WHERE r.website_id = ?
                 ORDER BY r.created_at DESC`,
                [websiteId]
            );
            return rules;
        } catch (err) {
            console.error('[IP Access Control] Get rules failed:', err);
            throw err;
        }
    }

    /**
     * Add IP access rule
     */
    async addRule(websiteId, ipAddress, ruleType, description, userId) {
        const db = await this.getConnection();
        try {
            // Validate IP address
            if (!this.isValidIP(ipAddress)) {
                return { success: false, error: 'Invalid IP address format' };
            }

            // Check if rule already exists
            const [existing] = await db.query(
                'SELECT * FROM ip_access_rules WHERE website_id = ? AND ip_address = ? AND rule_type = ?',
                [websiteId, ipAddress, ruleType]
            );

            if (existing.length > 0) {
                return { success: false, error: 'Rule already exists for this IP' };
            }

            // Insert rule
            const [result] = await db.query(
                'INSERT INTO ip_access_rules (website_id, ip_address, rule_type, description, created_by) VALUES (?, ?, ?, ?, ?)',
                [websiteId, ipAddress, ruleType, description, userId]
            );

            // Generate Nginx config
            await this.generateNginxConfig(websiteId);

            return { success: true, id: result.insertId };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Delete IP access rule
     */
    async deleteRule(ruleId, userId, isAdmin) {
        const db = await this.getConnection();
        try {
            // Get rule details
            const [rules] = await db.query(
                'SELECT * FROM ip_access_rules WHERE id = ?',
                [ruleId]
            );

            if (rules.length === 0) {
                return { success: false, error: 'Rule not found' };
            }

            const rule = rules[0];

            // Verify ownership if not admin
            if (!isAdmin) {
                const [websites] = await db.query(
                    'SELECT * FROM websites WHERE id = ? AND userId = ?',
                    [rule.website_id, userId]
                );

                if (websites.length === 0) {
                    return { success: false, error: 'Access denied' };
                }
            }

            // Delete rule
            await db.query('DELETE FROM ip_access_rules WHERE id = ?', [ruleId]);

            // Regenerate Nginx config
            await this.generateNginxConfig(rule.website_id);

            return { success: true };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Generate Nginx configuration for IP access control
     */
    async generateNginxConfig(websiteId) {
        const db = await this.getConnection();
        try {
            // Get website details
            const [websites] = await db.query(
                'SELECT * FROM websites WHERE id = ?',
                [websiteId]
            );

            if (websites.length === 0) {
                return { success: false, error: 'Website not found' };
            }

            const website = websites[0];

            // Get all rules for this website
            const [rules] = await db.query(
                'SELECT * FROM ip_access_rules WHERE website_id = ?',
                [websiteId]
            );

            // Generate config content
            let config = `# IP Access Control for ${website.domain}\n`;
            config += `# Generated: ${new Date().toISOString()}\n\n`;

            const whitelists = rules.filter(r => r.rule_type === 'whitelist');
            const blacklists = rules.filter(r => r.rule_type === 'blacklist');

            if (whitelists.length > 0) {
                config += `# Whitelist - Only these IPs are allowed\n`;
                whitelists.forEach(rule => {
                    config += `allow ${rule.ip_address}; # ${rule.description || 'No description'}\n`;
                });
                config += `deny all; # Deny all other IPs\n\n`;
            }

            if (blacklists.length > 0) {
                config += `# Blacklist - These IPs are blocked\n`;
                blacklists.forEach(rule => {
                    config += `deny ${rule.ip_address}; # ${rule.description || 'No description'}\n`;
                });
            }

            // Write config file
            const configFile = path.join(this.configPath, `${website.domain}_ip_access.conf`);
            await fs.writeFile(configFile, config);

            console.log(`[IP Access Control] Generated config for ${website.domain}`);
            return { success: true, configFile };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Get statistics for a website
     */
    async getStats(websiteId) {
        const db = await this.getConnection();
        try {
            const [stats] = await db.query(
                `SELECT 
                    COUNT(*) as total_rules,
                    SUM(CASE WHEN rule_type = 'whitelist' THEN 1 ELSE 0 END) as whitelist_count,
                    SUM(CASE WHEN rule_type = 'blacklist' THEN 1 ELSE 0 END) as blacklist_count
                 FROM ip_access_rules
                 WHERE website_id = ?`,
                [websiteId]
            );

            return stats[0] || {
                total_rules: 0,
                whitelist_count: 0,
                blacklist_count: 0
            };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Bulk import IP rules from file
     */
    async bulkImport(websiteId, ipList, ruleType, userId) {
        const db = await this.getConnection();
        try {
            const ips = ipList.split('\n').map(ip => ip.trim()).filter(ip => ip && this.isValidIP(ip));
            const imported = [];
            const failed = [];

            for (const ip of ips) {
                try {
                    // Check if exists
                    const [existing] = await db.query(
                        'SELECT * FROM ip_access_rules WHERE website_id = ? AND ip_address = ? AND rule_type = ?',
                        [websiteId, ip, ruleType]
                    );

                    if (existing.length === 0) {
                        await db.query(
                            'INSERT INTO ip_access_rules (website_id, ip_address, rule_type, description, created_by) VALUES (?, ?, ?, ?, ?)',
                            [websiteId, ip, ruleType, 'Bulk imported', userId]
                        );
                        imported.push(ip);
                    } else {
                        failed.push({ ip, reason: 'Already exists' });
                    }
                } catch (err) {
                    failed.push({ ip, reason: err.message });
                }
            }

            // Regenerate config
            await this.generateNginxConfig(websiteId);

            return {
                success: true,
                imported: imported.length,
                failed: failed.length,
                details: { imported, failed }
            };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Validate IP address format
     */
    isValidIP(ip) {
        // Support IPv4, IPv6, and CIDR notation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    /**
     * Clear all rules for a website
     */
    async clearRules(websiteId, ruleType = null) {
        const db = await this.getConnection();
        try {
            let query = 'DELETE FROM ip_access_rules WHERE website_id = ?';
            const params = [websiteId];

            if (ruleType) {
                query += ' AND rule_type = ?';
                params.push(ruleType);
            }

            await db.query(query, params);

            // Regenerate config
            await this.generateNginxConfig(websiteId);

            return { success: true };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }

    /**
     * Export rules to text format
     */
    async exportRules(websiteId, ruleType = null) {
        const db = await this.getConnection();
        try {
            let query = 'SELECT * FROM ip_access_rules WHERE website_id = ?';
            const params = [websiteId];

            if (ruleType) {
                query += ' AND rule_type = ?';
                params.push(ruleType);
            }

            const [rules] = await db.query(query, params);

            const export_text = rules.map(r =>
                `${r.ip_address} # ${r.rule_type} - ${r.description || 'No description'}`
            ).join('\n');

            return { success: true, export_text, count: rules.length };
        } finally {
            // await connection.end(); // Don't end pool connection manually like this if using pool.promise() directly

        }
    }
}

module.exports = new IPAccessControlService();
