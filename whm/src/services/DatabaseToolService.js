const pool = require('../config/db');
const redis = require('redis');

/**
 * Database Tools Service
 * Advanced database management, query builder, and Redis manager
 */
class DatabaseToolService {
    constructor() {
        this.redisClient = null;
        this.redisConnected = false;
    }

    /**
     * Execute custom SQL query (Admin only)
     */
    async executeQuery(sql, params = []) {
        try {
            // Safety check: prohibit destructive commands on system tables
            const forbiddenTables = ['users', 'roles', 'permissions'];
            const lowerSql = sql.toLowerCase();

            if (forbiddenTables.some(t => lowerSql.includes(t)) &&
                (lowerSql.includes('drop') || lowerSql.includes('truncate') || lowerSql.includes('delete'))) {
                throw new Error('Destructive operations on system tables are restricted');
            }

            const [results, fields] = await pool.promise().query(sql, params);
            return { results, fields: fields.map(f => f.name) };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get table statistics
     */
    async getTableStats(dbName) {
        try {
            const sql = `
                SELECT table_name, table_rows, data_length, index_length, 
                       (data_length + index_length) as total_size
                FROM information_schema.TABLES 
                WHERE table_schema = ?
            `;
            const [stats] = await pool.promise().query(sql, [dbName]);
            return stats;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Optimize table
     */
    async optimizeTable(dbName, tableName) {
        try {
            await pool.promise().query(`OPTIMIZE TABLE \`${dbName}\`.\`${tableName}\``);
            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Repair table
     */
    async repairTable(dbName, tableName) {
        try {
            await pool.promise().query(`REPAIR TABLE \`${dbName}\`.\`${tableName}\``);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // --- REDIS TOOLS ---

    /**
     * Connect to Redis
     */
    async connectRedis() {
        if (this.redisClient && this.redisConnected) return;

        try {
            this.redisClient = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });

            this.redisClient.on('error', (err) => console.error('Redis Client Error', err));
            this.redisClient.on('connect', () => this.redisConnected = true);

            await this.redisClient.connect();
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
        }
    }

    /**
     * Get Redis stats
     */
    async getRedisStats() {
        await this.connectRedis();
        if (!this.redisConnected) throw new Error('Redis not connected');

        const info = await this.redisClient.info();
        return info;
    }

    /**
     * Flush Redis DB
     */
    async flushRedis() {
        await this.connectRedis();
        if (!this.redisConnected) throw new Error('Redis not connected');

        await this.redisClient.flushDb();
        return true;
    }
}

module.exports = new DatabaseToolService();
