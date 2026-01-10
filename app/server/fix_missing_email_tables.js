require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function run() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    };

    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected to database to create missing email tables...');

    const queries = [
        `CREATE TABLE IF NOT EXISTS email_domains (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) NOT NULL UNIQUE,
            spam_enabled TINYINT DEFAULT 1,
            spam_score DECIMAL(3,1) DEFAULT 5.0,
            spam_marking_method VARCHAR(20) DEFAULT 'subject',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domainId INT NOT NULL,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            quota_bytes BIGINT DEFAULT 1073741824,
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
            UNIQUE(domainId, source),
            FOREIGN KEY (domainId) REFERENCES email_domains(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_autoresponders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            email VARCHAR(255) NOT NULL,
            subject VARCHAR(255),
            body TEXT,
            active TINYINT DEFAULT 1,
            startDate DATETIME,
            endDate DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_mailing_lists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domainId INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            address VARCHAR(255) NOT NULL UNIQUE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (domainId) REFERENCES email_domains(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_mailing_list_subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            listId INT NOT NULL,
            email VARCHAR(255) NOT NULL,
            subscribedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(listId, email),
            FOREIGN KEY (listId) REFERENCES email_mailing_lists(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS email_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender VARCHAR(255),
            recipient VARCHAR(255),
            subject VARCHAR(255),
            size INT,
            status VARCHAR(50),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const query of queries) {
        try {
            await conn.query(query);
            console.log('Query successful');
        } catch (e) {
            console.error('Query failed:', e.message);
        }
    }

    await conn.end();
    console.log('Done.');
    process.exit(0);
}

run();
