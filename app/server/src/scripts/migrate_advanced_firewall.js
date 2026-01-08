require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'filemanager'
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }
    console.log('Connected to DB. Running Advanced Firewall Migration...\n');
    runMigration();
});

const runMigration = async () => {
    const migrations = [
        {
            name: 'Add custom_message and expires_in to firewall table',
            query: `
                ALTER TABLE firewall 
                ADD COLUMN IF NOT EXISTS custom_message TEXT NULL AFTER reason,
                ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 0 AFTER lon,
                ADD COLUMN IF NOT EXISTS auto_unblock_at DATETIME NULL AFTER expiresAt
            `
        },
        {
            name: 'Create firewall_whitelist table',
            query: `
                CREATE TABLE IF NOT EXISTS firewall_whitelist (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ip VARCHAR(45) NOT NULL UNIQUE,
                    description TEXT,
                    added_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip (ip)
                )
            `
        },
        {
            name: 'Create firewall_geoblock table',
            query: `
                CREATE TABLE IF NOT EXISTS firewall_geoblock (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    country_code VARCHAR(2) NOT NULL UNIQUE,
                    country_name VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    added_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_country (country_code, is_active)
                )
            `
        },
        {
            name: 'Create firewall_ratelimit table',
            query: `
                CREATE TABLE IF NOT EXISTS firewall_ratelimit (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ip VARCHAR(45) NOT NULL,
                    endpoint VARCHAR(255) DEFAULT '*',
                    max_requests INT DEFAULT 60,
                    window_seconds INT DEFAULT 60,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_ip_endpoint (ip, endpoint),
                    INDEX idx_ip_active (ip, is_active)
                )
            `
        },
        {
            name: 'Create login_attempts table',
            query: `
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(100),
                    ip VARCHAR(45),
                    country VARCHAR(100),
                    lat FLOAT,
                    lon FLOAT,
                    user_agent TEXT,
                    success BOOLEAN DEFAULT FALSE,
                    failure_reason VARCHAR(255),
                    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip (ip),
                    INDEX idx_username (username),
                    INDEX idx_attempted (attempted_at)
                )
            `
        },
        {
            name: 'Create active_sessions table',
            query: `
                CREATE TABLE IF NOT EXISTS active_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL UNIQUE,
                    user_id INT NOT NULL,
                    ip VARCHAR(45),
                    country VARCHAR(100),
                    user_agent TEXT,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user (user_id),
                    INDEX idx_session (session_id),
                    INDEX idx_activity (last_activity)
                )
            `
        },
        {
            name: 'Create ip_reputation_cache table',
            query: `
                CREATE TABLE IF NOT EXISTS ip_reputation_cache (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ip VARCHAR(45) NOT NULL UNIQUE,
                    abuse_score INT DEFAULT 0,
                    is_whitelisted BOOLEAN DEFAULT FALSE,
                    is_tor BOOLEAN DEFAULT FALSE,
                    usage_type VARCHAR(50),
                    isp VARCHAR(255),
                    domain VARCHAR(255),
                    total_reports INT DEFAULT 0,
                    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip (ip),
                    INDEX idx_score (abuse_score)
                )
            `
        }
    ];

    for (const migration of migrations) {
        try {
            console.log(`Running: ${migration.name}...`);
            await new Promise((resolve, reject) => {
                db.query(migration.query, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log(`✓ ${migration.name}\n`);
        } catch (err) {
            console.error(`✗ Failed: ${migration.name}`);
            console.error(`  Error: ${err.message}\n`);
        }
    }

    console.log('Migration completed!');
    db.end();
    process.exit(0);
};
