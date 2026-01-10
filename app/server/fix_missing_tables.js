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
    console.log('Connected to database to create missing tables...');

    const queries = [
        `CREATE TABLE IF NOT EXISTS domains (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            domain VARCHAR(255) NOT NULL,
            registrar VARCHAR(255),
            registration_date DATE,
            expiry_date DATE,
            auto_renew TINYINT(1) DEFAULT 0,
            whois_privacy TINYINT(1) DEFAULT 0,
            nameservers TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS domain_forwarding (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain_id INT NOT NULL,
            target_url TEXT NOT NULL,
            type VARCHAR(10) DEFAULT '301',
            preserve_path TINYINT(1) DEFAULT 0,
            enabled TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
            UNIQUE KEY (domain_id)
        )`,
        `CREATE TABLE IF NOT EXISTS git_repos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            websiteId INT,
            name VARCHAR(255) NOT NULL,
            repoUrl VARCHAR(255) NOT NULL,
            branch VARCHAR(100) DEFAULT 'main',
            deployPath VARCHAR(500) NOT NULL,
            status ENUM('active', 'deploying', 'error') DEFAULT 'active',
            lastDeploy DATETIME,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS ip_access_rules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            rule_type ENUM('whitelist', 'blacklist') NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INT,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
            INDEX idx_website (website_id),
            INDEX idx_ip (ip_address)
        )`,
        `CREATE TABLE IF NOT EXISTS website_team_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            user_id INT NOT NULL,
            permissions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS website_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            user_id INT,
            action VARCHAR(100) NOT NULL,
            description TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS website_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            user_id INT NOT NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id INT NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS website_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            website_id INT NOT NULL,
            created_by INT NOT NULL,
            assigned_to INT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
            due_date DATETIME,
            status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
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
