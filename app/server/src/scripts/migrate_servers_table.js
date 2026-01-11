const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('🚀 Starting Server Node Migration...');

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS servers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                hostname VARCHAR(255) NOT NULL,
                ip VARCHAR(45) NOT NULL,
                ssh_user VARCHAR(255) DEFAULT 'root',
                ssh_password TEXT,
                ssh_port INT DEFAULT 22,
                status ENUM('active', 'offline', 'maintenance') DEFAULT 'active',
                is_local TINYINT DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Servers table created/verified.');

        // Seed with Local Node if empty
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM servers');
        if (rows[0].count === 0) {
            await connection.query('INSERT INTO servers (name, hostname, ip, is_local) VALUES (?, ?, ?, ?)', [
                'Local Node',
                require('os').hostname(),
                '127.0.0.1',
                1
            ]);
            console.log('✅ Seeded Local Node.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
