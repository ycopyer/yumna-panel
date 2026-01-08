require('dotenv').config();
const mysql = require('mysql2/promise');

async function initHostingDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('✅ Connected to database for hosting migration.');

    const queries = [
        `CREATE TABLE IF NOT EXISTS websites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            rootPath TEXT NOT NULL,
            phpVersion VARCHAR(10) DEFAULT '8.2',
            status ENUM('active', 'suspended') DEFAULT 'active',
            \`ssl\` TINYINT DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        "CREATE TABLE IF NOT EXISTS `databases` (" +
        "    id INT AUTO_INCREMENT PRIMARY KEY," +
        "    userId INT NOT NULL," +
        "    name VARCHAR(255) UNIQUE NOT NULL," +
        "    user VARCHAR(255) NOT NULL," +
        "    password TEXT NOT NULL," +
        "    host VARCHAR(255) DEFAULT 'localhost'," +
        "    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP," +
        "    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE" +
        ")",
        `CREATE TABLE IF NOT EXISTS dns_zones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS dns_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            zoneId INT NOT NULL,
            type ENUM('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV') NOT NULL,
            name VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            priority INT DEFAULT 0,
            ttl INT DEFAULT 3600,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (zoneId) REFERENCES dns_zones(id) ON DELETE CASCADE
        )`
    ];

    for (const query of queries) {
        try {
            await connection.query(query);
            console.log(`✅ Table checked/created.`);
        } catch (err) {
            console.error('❌ Error executing query:', err.message);
        }
    }

    // Seed some mock data if empty
    try {
        const [existingWebs] = await connection.query('SELECT COUNT(*) as count FROM websites');
        if (existingWebs[0].count === 0) {
            console.log('🚀 Seeding mock hosting data...');
            await connection.query('INSERT INTO websites (userId, domain, rootPath, phpVersion, `ssl`) VALUES (1, "yumnapanel.com", "/var/www/yumnapanel.com", "8.2", 1)');
            await connection.query('INSERT INTO `databases` (userId, name, user, password) VALUES (1, "yumna_app", "yumna_user", "password123")');
            await connection.query('INSERT INTO dns_zones (userId, domain) VALUES (1, "yumnapanel.com")');
            const [zone] = await connection.query('SELECT id FROM dns_zones LIMIT 1');
            if (zone.length > 0) {
                await connection.query('INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, "A", "@", "192.168.1.100")', [zone[0].id]);
                await connection.query('INSERT INTO dns_records (zoneId, type, name, content) VALUES (?, "CNAME", "www", "yumnapanel.com")', [zone[0].id]);
            }
            console.log('✅ Mock data seeded.');
        } else {
            console.log('ℹ️ Mock data already exists.');
        }
    } catch (err) {
        console.error('❌ Error during seeding:', err.message);
    }

    await connection.end();
    console.log('🏁 Hosting database initialization complete.');
}

initHostingDB().catch(console.error);
