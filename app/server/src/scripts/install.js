require('dotenv').config();
const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const path = require('path');
const fs = require('fs');

async function install() {
    console.log('---------------------------------------------------------');
    console.log('🚀 YUMNA PANEL - FRESH INSTALLATION SCRIPT');
    console.log('---------------------------------------------------------');

    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
    };

    const dbName = process.env.DB_NAME || 'filemanager_db';

    let connection;

    try {
        // 1. Koneksi awal tanpa database untuk memastikan DB ada
        console.log(`📡 Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
        connection = await mysql.createConnection(dbConfig);

        console.log(`🛠️ Ensuring database "${dbName}" exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        // 2. Daftar Query Tabel (Diambil dari init.js)
        console.log('🏗️ Creating tables...');
        const queries = [
            // Core Tables
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                email VARCHAR(255),
                avatar VARCHAR(255),
                two_factor_enabled TINYINT DEFAULT 0,
                recent_cleared_at DATETIME DEFAULT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS sftp_configs (
                userId INT PRIMARY KEY,
                host VARCHAR(255),
                port INT DEFAULT 22,
                username VARCHAR(255),
                password TEXT,
                name VARCHAR(255),
                rootPath VARCHAR(255),
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS shares (
                id VARCHAR(45) PRIMARY KEY,
                filePath TEXT NOT NULL,
                fileName VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                expiresAt DATETIME,
                password VARCHAR(255),
                permissions VARCHAR(50) NOT NULL,
                isFolder TINYINT DEFAULT 0,
                userId INT,
                recipientUserId INT DEFAULT NULL,
                sftpConfig TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS settings (
                key_name VARCHAR(255) PRIMARY KEY,
                value_text TEXT,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            // Security Tables
            `CREATE TABLE IF NOT EXISTS firewall (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('ip', 'user') NOT NULL,
                target VARCHAR(255) NOT NULL,
                reason TEXT,
                country VARCHAR(100),
                reputation_score INT DEFAULT 0,
                expiresAt DATETIME DEFAULT NULL,
                auto_unblock_at DATETIME DEFAULT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY (type, target)
            )`,
            `CREATE TABLE IF NOT EXISTS security_patterns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('sqli', 'xss', 'bot') NOT NULL,
                pattern TEXT NOT NULL,
                description VARCHAR(255),
                isActive TINYINT DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS threat_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip VARCHAR(45),
                threat_type VARCHAR(50),
                severity VARCHAR(20),
                score INT,
                details TEXT,
                is_blocked TINYINT(1) DEFAULT 0,
                request_path VARCHAR(255),
                request_method VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // Hosting Tables
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
            ")"
        ];

        for (const q of queries) {
            await connection.query(q);
        }
        console.log('✅ All tables verified/created.');

        // 3. Seed Admin User dengan Argon2id
        console.log('👤 Checking admin user...');
        const [admins] = await connection.query('SELECT * FROM users WHERE username = "admin"');
        if (admins.length === 0) {
            console.log('🗝️ Creating default admin (admin / admin123)...');
            const hashedPass = await argon2.hash('admin123', { type: argon2.argon2id });
            await connection.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPass, 'admin']
            );
            console.log('✅ Admin user created with Argon2id.');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // 4. Seed Security Patterns
        const [patterns] = await connection.query('SELECT COUNT(*) as count FROM security_patterns');
        if (patterns[0].count === 0) {
            console.log('🛡️ Seeding security patterns...');
            const rules = [
                ['sqli', '(\\b(UNION([\\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\\b)', 'Common SQL Keywords'],
                ['xss', '<script\\b[^>]*>|<\\/script>', 'Script Tags'],
                ['xss', 'on\\w+\\s*=', 'Event Handlers']
            ];
            await connection.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [rules]);
            console.log('✅ Security patterns seeded.');
        }

        console.log('---------------------------------------------------------');
        console.log('🎉 INSTALLATION SUCCESSFUL!');
        console.log('---------------------------------------------------------');
        console.log('You can now log in with:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('---------------------------------------------------------');

    } catch (err) {
        console.error('❌ Installation failed:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

install();
