const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const pool = require('../config/db');

class PowerDNSService {
    constructor() {
        this.isWindows = process.platform === 'win32';
        this.pdnsCommand = this.isWindows ? 'pdns_server' : 'pdns_server';
        this.pdnsControl = this.isWindows ? 'pdns_control' : 'pdns_control';
        this.initialized = false;
    }

    /**
     * Initialize PowerDNS service
     */
    async initialize() {
        try {
            // Check if PowerDNS is installed
            const installed = await this.checkInstallation();

            if (!installed) {
                console.warn('[PowerDNS] PowerDNS is not installed. DNS features will be limited.');
                return false;
            }

            // Verify database connection
            await this.verifyDatabase();

            this.initialized = true;
            console.log('[PowerDNS] Service initialized successfully');
            return true;
        } catch (error) {
            console.error('[PowerDNS] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Check if PowerDNS is installed
     */
    async checkInstallation() {
        try {
            const { stdout } = await execAsync(`${this.pdnsControl} version`);
            console.log('[PowerDNS] Version:', stdout.trim());
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verify PowerDNS database schema
     */
    async verifyDatabase() {
        try {
            // Check if PowerDNS tables exist
            const [tables] = await pool.promise().query(`
                SHOW TABLES LIKE 'domains'
            `);

            if (tables.length === 0) {
                console.log('[PowerDNS] Creating PowerDNS schema...');
                await this.createSchema();
            }

            return true;
        } catch (error) {
            console.error('[PowerDNS] Database verification error:', error.message);
            throw error;
        }
    }

    /**
     * Create PowerDNS database schema
     */
    async createSchema() {
        const schema = `
            CREATE TABLE IF NOT EXISTS domains (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                master VARCHAR(128) DEFAULT NULL,
                last_check INT DEFAULT NULL,
                type VARCHAR(6) NOT NULL,
                notified_serial INT DEFAULT NULL,
                account VARCHAR(40) DEFAULT NULL,
                INDEX name_index(name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                domain_id INT DEFAULT NULL,
                name VARCHAR(255) DEFAULT NULL,
                type VARCHAR(10) DEFAULT NULL,
                content VARCHAR(65535) DEFAULT NULL,
                ttl INT DEFAULT NULL,
                prio INT DEFAULT NULL,
                disabled TINYINT(1) DEFAULT 0,
                ordername VARCHAR(255) DEFAULT NULL,
                auth TINYINT(1) DEFAULT 1,
                INDEX nametype_index(name, type),
                INDEX domain_id(domain_id),
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS supermasters (
                ip VARCHAR(64) NOT NULL,
                nameserver VARCHAR(255) NOT NULL,
                account VARCHAR(40) NOT NULL,
                PRIMARY KEY (ip, nameserver)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                domain_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(10) NOT NULL,
                modified_at INT NOT NULL,
                account VARCHAR(40) DEFAULT NULL,
                comment TEXT NOT NULL,
                INDEX comments_domain_id_idx(domain_id),
                INDEX comments_name_type_idx(name, type),
                INDEX comments_order_idx(domain_id, modified_at),
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS domainmetadata (
                id INT AUTO_INCREMENT PRIMARY KEY,
                domain_id INT NOT NULL,
                kind VARCHAR(32),
                content TEXT,
                INDEX domainmetadata_idx(domain_id, kind),
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS cryptokeys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                domain_id INT NOT NULL,
                flags INT NOT NULL,
                active BOOL,
                published BOOL DEFAULT 1,
                content TEXT,
                INDEX domainidindex(domain_id),
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS tsigkeys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                algorithm VARCHAR(50),
                secret VARCHAR(255),
                UNIQUE KEY namealgoindex(name, algorithm)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        const statements = schema.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await pool.promise().query(statement);
            }
        }

        console.log('[PowerDNS] Database schema created successfully');
    }

    /**
     * Sync DNS zone from dns_zones to PowerDNS domains
     */
    async syncZone(zoneId) {
        try {
            // Get zone from dns_zones
            const [zones] = await pool.promise().query(
                'SELECT * FROM dns_zones WHERE id = ?',
                [zoneId]
            );

            if (zones.length === 0) {
                throw new Error('Zone not found');
            }

            const zone = zones[0];

            // Check if domain exists in PowerDNS
            const [existingDomains] = await pool.promise().query(
                'SELECT id FROM domains WHERE name = ?',
                [zone.domain]
            );

            let domainId;

            if (existingDomains.length === 0) {
                // Create domain in PowerDNS
                const [result] = await pool.promise().query(
                    'INSERT INTO domains (name, type) VALUES (?, ?)',
                    [zone.domain, 'NATIVE']
                );
                domainId = result.insertId;
            } else {
                domainId = existingDomains[0].id;
                // Delete existing records
                await pool.promise().query(
                    'DELETE FROM records WHERE domain_id = ?',
                    [domainId]
                );
            }

            // Get records from dns_records
            const [records] = await pool.promise().query(
                'SELECT * FROM dns_records WHERE zoneId = ?',
                [zoneId]
            );

            // Insert records into PowerDNS
            for (const record of records) {
                const recordName = record.name === '@'
                    ? zone.domain
                    : `${record.name}.${zone.domain}`;

                await pool.promise().query(
                    'INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        domainId,
                        recordName,
                        record.type,
                        record.content,
                        record.ttl || 3600,
                        record.priority || 0
                    ]
                );
            }

            // Add SOA record if not exists
            const [soaCheck] = await pool.promise().query(
                'SELECT id FROM records WHERE domain_id = ? AND type = ?',
                [domainId, 'SOA']
            );

            if (soaCheck.length === 0) {
                const soaContent = `ns1.yumnapanel.com. hostmaster.${zone.domain}. 1 10800 3600 604800 3600`;
                await pool.promise().query(
                    'INSERT INTO records (domain_id, name, type, content, ttl) VALUES (?, ?, ?, ?, ?)',
                    [domainId, zone.domain, 'SOA', soaContent, 3600]
                );
            }

            // Notify PowerDNS to reload the zone
            await this.notifyZone(zone.domain);

            console.log(`[PowerDNS] Zone ${zone.domain} synced successfully`);
            return { success: true, domainId };
        } catch (error) {
            console.error('[PowerDNS] Sync error:', error.message);
            throw error;
        }
    }

    /**
     * Notify PowerDNS to reload a zone
     */
    async notifyZone(zoneName) {
        if (!this.initialized) return;

        try {
            await execAsync(`${this.pdnsControl} notify ${zoneName}`);
            console.log(`[PowerDNS] Notified zone: ${zoneName}`);
        } catch (error) {
            console.warn('[PowerDNS] Notify warning:', error.message);
        }
    }

    /**
     * Delete zone from PowerDNS
     */
    async deleteZone(zoneName) {
        try {
            const [domains] = await pool.promise().query(
                'SELECT id FROM domains WHERE name = ?',
                [zoneName]
            );

            if (domains.length > 0) {
                await pool.promise().query(
                    'DELETE FROM domains WHERE id = ?',
                    [domains[0].id]
                );
                console.log(`[PowerDNS] Zone ${zoneName} deleted`);
            }

            return { success: true };
        } catch (error) {
            console.error('[PowerDNS] Delete error:', error.message);
            throw error;
        }
    }

    /**
     * Get PowerDNS statistics
     */
    async getStatistics() {
        if (!this.initialized) {
            return {
                status: 'not_installed',
                zones: 0,
                records: 0
            };
        }

        try {
            const [zones] = await pool.promise().query(
                'SELECT COUNT(*) as count FROM domains'
            );

            const [records] = await pool.promise().query(
                'SELECT COUNT(*) as count FROM records'
            );

            return {
                status: 'running',
                zones: zones[0].count,
                records: records[0].count
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Enable DNSSEC for a zone
     */
    async enableDNSSEC(zoneName) {
        if (!this.initialized) {
            throw new Error('PowerDNS is not initialized');
        }

        try {
            // Get domain ID
            const [domains] = await pool.promise().query(
                'SELECT id FROM domains WHERE name = ?',
                [zoneName]
            );

            if (domains.length === 0) {
                throw new Error('Domain not found');
            }

            const domainId = domains[0].id;

            // Enable DNSSEC using pdnsutil
            await execAsync(`pdnsutil secure-zone ${zoneName}`);

            // Get DNSSEC keys
            const { stdout } = await execAsync(`pdnsutil show-zone ${zoneName}`);

            return {
                success: true,
                enabled: true,
                keys: stdout
            };
        } catch (error) {
            console.error('[PowerDNS] DNSSEC error:', error.message);
            throw error;
        }
    }

    /**
     * Get service status
     */
    async getStatus() {
        try {
            if (!this.initialized) {
                return {
                    running: false,
                    message: 'PowerDNS not installed or initialized'
                };
            }

            const { stdout } = await execAsync(`${this.pdnsControl} ping`);

            return {
                running: stdout.includes('PONG') || stdout.includes('alive'),
                message: 'PowerDNS is running',
                version: await this.getVersion()
            };
        } catch (error) {
            return {
                running: false,
                message: error.message
            };
        }
    }

    /**
     * Get PowerDNS version
     */
    async getVersion() {
        try {
            const { stdout } = await execAsync(`${this.pdnsControl} version`);
            return stdout.trim();
        } catch (error) {
            return 'unknown';
        }
    }
}

module.exports = new PowerDNSService();
