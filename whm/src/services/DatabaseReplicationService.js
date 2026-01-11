const mysql = require('mysql2/promise');

/**
 * Database Replication Service
 * Manages MySQL master-slave replication
 */
class DatabaseReplicationService {
    constructor() {
        this.masterConfig = null;
        this.slaveConfigs = [];
        this.initialized = false;
    }

    /**
     * Initialize replication service
     */
    async initialize() {
        try {
            await this.loadReplicationConfig();
            this.initialized = true;
            console.log('[DB Replication] Service initialized');
            return true;
        } catch (error) {
            console.error('[DB Replication] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Load replication configuration
     */
    async loadReplicationConfig() {
        try {
            this.masterConfig = {
                host: process.env.DB_MASTER_HOST || process.env.DB_HOST || 'localhost',
                port: process.env.DB_MASTER_PORT || process.env.DB_PORT || 3306,
                user: process.env.DB_MASTER_USER || process.env.DB_USER || 'root',
                password: process.env.DB_MASTER_PASSWORD || process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'yumna_panel'
            };

            // Load slave configurations from environment
            const slaveCount = parseInt(process.env.DB_SLAVE_COUNT || '0');
            this.slaveConfigs = [];

            for (let i = 1; i <= slaveCount; i++) {
                this.slaveConfigs.push({
                    host: process.env[`DB_SLAVE${i}_HOST`] || 'localhost',
                    port: process.env[`DB_SLAVE${i}_PORT`] || 3306,
                    user: process.env[`DB_SLAVE${i}_USER`] || 'root',
                    password: process.env[`DB_SLAVE${i}_PASSWORD`] || '',
                    database: process.env.DB_NAME || 'yumna_panel'
                });
            }

            console.log(`[DB Replication] Master: ${this.masterConfig.host}`);
            console.log(`[DB Replication] Slaves: ${this.slaveConfigs.length}`);

        } catch (error) {
            console.error('[DB Replication] Config load error:', error.message);
            throw error;
        }
    }

    /**
     * Setup master for replication
     */
    async setupMaster() {
        let connection;
        try {
            connection = await mysql.createConnection(this.masterConfig);

            // Enable binary logging
            await connection.query(`
                SET GLOBAL binlog_format = 'ROW'
            `);

            // Create replication user
            await connection.query(`
                CREATE USER IF NOT EXISTS 'repl'@'%' IDENTIFIED BY 'replication_password'
            `);

            await connection.query(`
                GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%'
            `);

            await connection.query('FLUSH PRIVILEGES');

            // Get master status
            const [status] = await connection.query('SHOW MASTER STATUS');

            console.log('[DB Replication] Master configured');
            console.log('[DB Replication] Binary log:', status[0].File);
            console.log('[DB Replication] Position:', status[0].Position);

            return {
                success: true,
                binlogFile: status[0].File,
                binlogPosition: status[0].Position
            };

        } catch (error) {
            console.error('[DB Replication] Master setup error:', error.message);
            throw error;
        } finally {
            if (connection) await connection.end();
        }
    }

    /**
     * Setup slave for replication
     */
    async setupSlave(slaveConfig, masterStatus) {
        let connection;
        try {
            connection = await mysql.createConnection(slaveConfig);

            // Stop slave if running
            await connection.query('STOP SLAVE');

            // Configure slave
            await connection.query(`
                CHANGE MASTER TO
                MASTER_HOST = ?,
                MASTER_PORT = ?,
                MASTER_USER = 'repl',
                MASTER_PASSWORD = 'replication_password',
                MASTER_LOG_FILE = ?,
                MASTER_LOG_POS = ?
            `, [
                this.masterConfig.host,
                this.masterConfig.port,
                masterStatus.binlogFile,
                masterStatus.binlogPosition
            ]);

            // Start slave
            await connection.query('START SLAVE');

            // Check slave status
            const [status] = await connection.query('SHOW SLAVE STATUS');

            console.log(`[DB Replication] Slave configured: ${slaveConfig.host}`);

            return {
                success: true,
                ioRunning: status[0].Slave_IO_Running === 'Yes',
                sqlRunning: status[0].Slave_SQL_Running === 'Yes'
            };

        } catch (error) {
            console.error('[DB Replication] Slave setup error:', error.message);
            throw error;
        } finally {
            if (connection) await connection.end();
        }
    }

    /**
     * Check replication status
     */
    async checkReplicationStatus() {
        try {
            const slaveStatuses = [];

            for (const slaveConfig of this.slaveConfigs) {
                const connection = await mysql.createConnection(slaveConfig);

                try {
                    const [status] = await connection.query('SHOW SLAVE STATUS');

                    if (status.length > 0) {
                        slaveStatuses.push({
                            host: slaveConfig.host,
                            ioRunning: status[0].Slave_IO_Running === 'Yes',
                            sqlRunning: status[0].Slave_SQL_Running === 'Yes',
                            secondsBehindMaster: status[0].Seconds_Behind_Master,
                            lastError: status[0].Last_Error || null
                        });
                    }
                } finally {
                    await connection.end();
                }
            }

            return {
                master: this.masterConfig.host,
                slaves: slaveStatuses,
                healthy: slaveStatuses.every(s => s.ioRunning && s.sqlRunning)
            };

        } catch (error) {
            console.error('[DB Replication] Status check error:', error.message);
            return {
                master: this.masterConfig.host,
                slaves: [],
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Promote slave to master (failover)
     */
    async promoteSlave(slaveConfig) {
        let connection;
        try {
            connection = await mysql.createConnection(slaveConfig);

            // Stop slave
            await connection.query('STOP SLAVE');

            // Reset slave
            await connection.query('RESET SLAVE ALL');

            // Enable binary logging (if not already)
            await connection.query(`
                SET GLOBAL binlog_format = 'ROW'
            `);

            // Create replication user
            await connection.query(`
                CREATE USER IF NOT EXISTS 'repl'@'%' IDENTIFIED BY 'replication_password'
            `);

            await connection.query(`
                GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%'
            `);

            await connection.query('FLUSH PRIVILEGES');

            console.log(`[DB Replication] Slave promoted to master: ${slaveConfig.host}`);

            // Update master config
            this.masterConfig = { ...slaveConfig };

            return { success: true };

        } catch (error) {
            console.error('[DB Replication] Promotion error:', error.message);
            throw error;
        } finally {
            if (connection) await connection.end();
        }
    }

    /**
     * Get connection pool (read/write split)
     */
    getConnectionPool(readOnly = false) {
        if (readOnly && this.slaveConfigs.length > 0) {
            // Round-robin slave selection
            const slaveIndex = Math.floor(Math.random() * this.slaveConfigs.length);
            return mysql.createPool(this.slaveConfigs[slaveIndex]);
        }

        // Use master for writes
        return mysql.createPool(this.masterConfig);
    }
}

module.exports = new DatabaseReplicationService();
