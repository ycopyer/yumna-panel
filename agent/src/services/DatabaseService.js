const mysql = require('mysql2/promise');

class DatabaseService {
    static getDBConfig() {
        return {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASS
        };
    }

    static async getAdminConnection() {
        return await mysql.createConnection(this.getDBConfig());
    }

    static async createDatabase(name, user, password) {
        let adminConn;
        try {
            adminConn = await this.getAdminConnection();

            // 1. Create Database
            await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);

            // 2. Create User
            try {
                await adminConn.query(`CREATE USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
            } catch (e) {
                if (e.code === 'ER_CANNOT_USER') {
                    // User might exist, update password
                    await adminConn.query(`ALTER USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
                } else {
                    throw e;
                }
            }

            // 3. Grant Privileges
            await adminConn.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${user}'@'localhost'`);
            await adminConn.query('FLUSH PRIVILEGES');

            return { success: true };
        } finally {
            if (adminConn) await adminConn.end();
        }
    }

    static async dropDatabase(name, user) {
        let adminConn;
        try {
            adminConn = await this.getAdminConnection();

            // 1. Drop Database
            await adminConn.query(`DROP DATABASE IF EXISTS \`${name}\``);

            // 2. Drop User if not used elsewhere (This part is tricky on Agent alone without a global view, 
            // but WHM should tell the Agent whether to drop the user or not).
            // For now, let's keep it simple: WHM decides.
            if (user) {
                // Check if user has other DBs? 
                // mysql.db table can tell us.
                const [usage] = await adminConn.query(`SELECT COUNT(*) as count FROM mysql.db WHERE User = ?`, [user]);
                if (usage[0].count === 0) {
                    await adminConn.query(`DROP USER IF EXISTS '${user}'@'localhost'`);
                }
            }

            return { success: true };
        } finally {
            if (adminConn) await adminConn.end();
        }
    }

    static async cloneDatabase(source, target, user, password) {
        let adminConn;
        try {
            adminConn = await this.getAdminConnection();

            // 1. Create Target DB
            await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${target}\``);

            // 2. Copy Tables
            const [tables] = await adminConn.query(`SHOW TABLES FROM \`${source}\``);
            for (const row of tables) {
                const tableName = Object.values(row)[0];
                await adminConn.query(`CREATE TABLE \`${target}\`.\`${tableName}\` LIKE \`${source}\`.\`${tableName}\``);
                await adminConn.query(`INSERT INTO \`${target}\`.\`${tableName}\` SELECT * FROM \`${source}\`.\`${tableName}\``);
            }

            // 3. Setup User
            if (user) {
                await adminConn.query(`GRANT ALL PRIVILEGES ON \`${target}\`.* TO '${user}'@'localhost'`);
                await adminConn.query('FLUSH PRIVILEGES');
            }

            return { success: true };
        } finally {
            if (adminConn) await adminConn.end();
        }
    }

    static async getStats(name) {
        let adminConn;
        try {
            adminConn = await this.getAdminConnection();
            const [rows] = await adminConn.query(`
                SELECT 
                    table_schema AS name, 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                    COUNT(*) AS table_count 
                FROM information_schema.tables 
                WHERE table_schema = ? 
                GROUP BY table_schema`, [name]);

            if (rows.length > 0) {
                return rows[0];
            }
            return { name, size_mb: 0, table_count: 0 };
        } catch (e) {
            return { name, size_mb: 0, table_count: 0, error: e.message };
        } finally {
            if (adminConn) await adminConn.end();
        }
    }
}

module.exports = DatabaseService;
