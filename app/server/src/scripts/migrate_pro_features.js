require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateProFeatures() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log('🚀 Starting Pro Features Migration...');

    const queries = [
        // 1. Enhance Users Table
        `ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role ENUM('admin', 'reseller', 'user') DEFAULT 'user',
            ADD COLUMN IF NOT EXISTS status ENUM('active', 'suspended') DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS shell VARCHAR(50) DEFAULT '/bin/bash',
            ADD COLUMN IF NOT EXISTS storage_quota BIGINT DEFAULT 1073741824, -- 1GB
            ADD COLUMN IF NOT EXISTS used_storage BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS cpu_quota INT DEFAULT 100, -- 100%
            ADD COLUMN IF NOT EXISTS ram_quota BIGINT DEFAULT 536870912, -- 512MB
            ADD COLUMN IF NOT EXISTS api_key VARCHAR(255),
            ADD COLUMN IF NOT EXISTS two_factor_enabled TINYINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)`,

        // 2. Email Server Tables
        `CREATE TABLE IF NOT EXISTS email_domains (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            dkim_private TEXT,
            dkim_public TEXT,
            spf_record TEXT,
            status ENUM('active', 'disabled') DEFAULT 'active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domainId INT NOT NULL,
            username VARCHAR(255) NOT NULL,
            password TEXT NOT NULL,
            quota_bytes BIGINT DEFAULT 1073741824, -- 1GB
            used_bytes BIGINT DEFAULT 0,
            status ENUM('active', 'suspended') DEFAULT 'active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(domainId, username),
            FOREIGN KEY (domainId) REFERENCES email_domains(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_aliases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domainId INT NOT NULL,
            source VARCHAR(255) NOT NULL,
            destination TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (domainId) REFERENCES email_domains(id) ON DELETE CASCADE
        )`,

        // 3. Backup Table
        `CREATE TABLE IF NOT EXISTS backups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            type ENUM('manual', 'scheduled') DEFAULT 'manual',
            target ENUM('full', 'files', 'database', 'email') DEFAULT 'full',
            filePath TEXT,
            size BIGINT,
            storage_type ENUM('local', 's3', 'sftp') DEFAULT 'local',
            status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // 4. Activity Logs (Enriched)
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            action VARCHAR(255) NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        )`
    ];

    for (const query of queries) {
        try {
            await connection.query(query);
            console.log('✅ Query executed successfully.');
        } catch (err) {
            console.error('❌ Error executing query:', err.message);
        }
    }

    await connection.end();
    console.log('🏁 Pro Features Migration Complete.');
}

migrateProFeatures().catch(console.error);
