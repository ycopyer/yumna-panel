const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const fs = require('fs').promises;
const path = require('path');

router.post('/setup', async (req, res) => {
    const { dbHost, dbPort, dbUser, dbPass, dbName, adminUser, adminPass } = req.body;

    let connection;
    try {
        // 0. Create necessary directories
        const rootDir = path.join(__dirname, '../../');
        await fs.mkdir(path.join(rootDir, 'data'), { recursive: true });
        await fs.mkdir(path.join(rootDir, 'uploads'), { recursive: true });

        // 1. Test Connection & Create DB
        connection = await mysql.createConnection({
            host: dbHost,
            port: parseInt(dbPort),
            user: dbUser,
            password: dbPass
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        // 2. Create Tables (Full Comprehensive List)
        const queries = [
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
            `CREATE TABLE IF NOT EXISTS activity_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT,
                action VARCHAR(50) NOT NULL,
                description TEXT,
                ipAddress VARCHAR(45),
                ipLocal VARCHAR(45),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_userId (userId),
                INDEX idx_createdAt (createdAt)
            )`,
            `CREATE TABLE IF NOT EXISTS trash (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                filePath TEXT NOT NULL,
                trashPath TEXT,
                fileName VARCHAR(255) NOT NULL,
                fileType VARCHAR(50) NOT NULL,
                fileSize BIGINT DEFAULT 0,
                deletedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_userId (userId)
            )`,
            `CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                filePath VARCHAR(512) NOT NULL,
                fileName VARCHAR(255) NOT NULL,
                fileType VARCHAR(50) NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY (userId, filePath)
            )`,
            `CREATE TABLE IF NOT EXISTS user_sessions (
                sessionId VARCHAR(64) PRIMARY KEY,
                userId INT NOT NULL,
                deviceInfo TEXT,
                ipAddress VARCHAR(45),
                lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS firewall (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('ip', 'user') NOT NULL,
                target VARCHAR(255) NOT NULL,
                reason TEXT,
                country VARCHAR(100),
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
            `CREATE TABLE IF NOT EXISTS subdomains (
                id INT AUTO_INCREMENT PRIMARY KEY,
                websiteId INT NOT NULL,
                domain VARCHAR(255) UNIQUE NOT NULL,
                rootPath TEXT NOT NULL,
                phpVersion VARCHAR(10) DEFAULT '8.2',
                status ENUM('active', 'suspended') DEFAULT 'active',
                \`ssl\` TINYINT DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (websiteId) REFERENCES websites(id) ON DELETE CASCADE
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

        for (const q of queries) {
            await connection.query(q);
        }

        // 3. Create Admin
        const hashedPass = await argon2.hash(adminPass, { type: argon2.argon2id });
        await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [adminUser, hashedPass, 'admin']
        );

        // 4. Seed Security Patterns
        const rules = [
            // SQL Injection Rules
            ['sqli', '(\\b(UNION([\\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\\b)', 'Common SQL Keywords'],
            ['sqli', '[;]\\s*(DECLARE|SET|DROP|EXEC)', 'Stacked Queries'],
            ['sqli', '(--\\s)|(#\\s)|(\\/\\*[\\s\\S]*?\\*\\/)', 'SQL Comments'],
            ['sqli', "(' [\\s]*OR[\\s]*'1'[\\s]*=[\\s]*'1)|(' [\\s]*OR[\\s]*1[\\s]*=[\\s]*1)|(1[\\s]*=[\\s]*1)", 'Tautologies (OR 1=1)'],
            ['sqli', '(BENCHMARK\\()|(SLEEP\\()|(WAITFOR\\s+DELAY)', 'Time-based Injection'],

            // XSS Rules
            ['xss', '<script\\b[^>]*>|<\\/script>', 'Script Tags'],
            ['xss', '<iframe\\b[^>]*>|<object\\b[^>]*>|<embed\\b[^>]*>|<style\\b[^>]*>|<svg\\b[^>]*>', 'Dangerous HTML Tags'],
            ['xss', 'javascript:|vbscript:|data:text\\/html', 'Dangerous Protocols'],
            ['xss', 'on\\w+\\s*=', 'Event Handlers'],
            ['xss', 'alert\\(|confirm\\(|prompt\\(|eval\\(', 'Dangerous JS Functions'],
            ['xss', 'document\\.cookie|document\\.domain', 'DOM Access']
        ];

        await connection.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [rules]);

        // 5. Update .env file
        const envPath = path.join(__dirname, '../../.env');
        const envContent = `DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_USER=${dbUser}
DB_PASS=${dbPass}
DB_NAME=${dbName}
PORT=5000
ENCRYPTION_KEY=${require('crypto').randomBytes(32).toString('hex')}
CORS_ORIGIN=http://localhost:3000
APP_VERSION=1.5.3

# SMTP Settings for 2FA
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rosnfs25@gmail.com
SMTP_PASS=lijhmhdllcqtcxoe
SMTP_FROM_NAME="Yumna Panel"

# Security Intelligence
ABUSE_IPDB_KEY=85170f9b5d74e632defd8c0bf0d39b29b2cda0e902b9a8472591a597fa7ccf73c58b3542370ffcc2
VAPID_PUBLIC_KEY=BHu_n_99sKUICdx3dOyKF_BzadvY_Rz9w62mEt3tiE9S0vyxaGkE8oQ-wc2lJxfAaGYff7ZYa5NvXi830mmAk3s
VAPID_PRIVATE_KEY=39QBSY9AAl3yKfH5g6_v15gyztZxUczxad6dzS8NoFI
`;
        await fs.writeFile(envPath, envContent);

        res.json({ success: true, message: 'Installation completed successfully!' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

module.exports = router;
