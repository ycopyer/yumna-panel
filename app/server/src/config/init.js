const db = require('./db');
const { encrypt } = require('../utils/helpers');

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
        storage_quota BIGINT DEFAULT 1073741824,
        used_storage BIGINT DEFAULT 0,
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
        expiresAt DATETIME DEFAULT NULL,
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
        INDEX idx_status (status),
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
    "    host VARCHAR(255) DEFAULT 'localhost', " +
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
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_settings (
        key_name VARCHAR(255) PRIMARY KEY,
        value_text TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS files_compliance (
        filePath VARCHAR(512) PRIMARY KEY,
        legal_hold TINYINT DEFAULT 0,
        userId INT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS threat_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50),
        source_ip VARCHAR(45),
        target_user VARCHAR(255),
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (userId, endpoint(255)),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255),
        ip VARCHAR(45),
        country VARCHAR(100),
        lat DOUBLE,
        lon DOUBLE,
        user_agent TEXT,
        success TINYINT(1) DEFAULT 0,
        failure_reason VARCHAR(255),
        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS active_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        ip VARCHAR(45),
        country VARCHAR(100),
        user_agent TEXT,
        login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS firewall_whitelist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) UNIQUE NOT NULL,
        description VARCHAR(255),
        added_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS firewall_geoblock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_code VARCHAR(10) UNIQUE NOT NULL,
        country_name VARCHAR(100),
        is_active TINYINT DEFAULT 1,
        added_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS firewall_ratelimit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        endpoint VARCHAR(255) DEFAULT '*',
        max_requests INT DEFAULT 60,
        window_seconds INT DEFAULT 60,
        is_active TINYINT DEFAULT 1,
        added_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (ip, endpoint)
    )`
];

const initTables = async () => {
    for (const q of queries) {
        await new Promise(resolve => db.query(q, (err) => {
            if (err) console.error('Error creating table:', err.message);
            resolve();
        }));
    }

    // Add column if not exists (Migration: users.recent_cleared_at)
    await new Promise(resolve => db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_cleared_at DATETIME DEFAULT NULL', (err) => {
        if (err && !err.message.includes('Duplicate column name')) {
            // Older MySQL fallback
            if (err.code === 'ER_PARSE_ERROR' || err.errno === 1064) {
                db.query('ALTER TABLE users ADD COLUMN recent_cleared_at DATETIME DEFAULT NULL', (e) => {
                    if (e && !e.message.includes('Duplicate column name')) console.error('Migration (users) error:', e.message);
                    resolve();
                });
                return;
            }
            console.error('Migration error (recent_cleared_at):', err.message);
        }
        resolve();
    }));

    // Add column if not exists (Migration: firewall.country, lat, lon)
    await new Promise(resolve => db.query('ALTER TABLE firewall ADD COLUMN IF NOT EXISTS country VARCHAR(100)', (err) => resolve()));
    await new Promise(resolve => db.query('ALTER TABLE firewall ADD COLUMN IF NOT EXISTS lat DOUBLE', (err) => resolve()));
    await new Promise(resolve => db.query('ALTER TABLE firewall ADD COLUMN IF NOT EXISTS lon DOUBLE', (err) => resolve()));

    // Add storage columns if not exists
    await new Promise(resolve => db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota BIGINT DEFAULT 1073741824', (err) => {
        if (err && !err.message.includes('Duplicate column name')) {
            if (err.code === 'ER_PARSE_ERROR') {
                db.query('ALTER TABLE users ADD COLUMN storage_quota BIGINT DEFAULT 1073741824', () => resolve());
                return;
            }
        }
        resolve();
    }));

    await new Promise(resolve => db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS used_storage BIGINT DEFAULT 0', (err) => {
        if (err && !err.message.includes('Duplicate column name')) {
            if (err.code === 'ER_PARSE_ERROR') {
                db.query('ALTER TABLE users ADD COLUMN used_storage BIGINT DEFAULT 0', () => resolve());
                return;
            }
        }
        resolve();
    }));

    // Compliance Migrations for activity_history
    const complianceCols = [
        { name: 'event_id', type: 'VARCHAR(100)' },
        { name: 'hash', type: 'VARCHAR(255)' },
        { name: 'prev_hash', type: 'VARCHAR(255)' }
    ];

    for (const col of complianceCols) {
        await new Promise(resolve => db.query(`ALTER TABLE activity_history ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`, (err) => {
            if (err && !err.message.includes('Duplicate column name')) {
                // Older MySQL fallback
                if (err.code === 'ER_PARSE_ERROR' || err.errno === 1064) {
                    db.query(`ALTER TABLE activity_history ADD COLUMN ${col.name} ${col.type}`, (e) => {
                        resolve();
                    });
                    return;
                }
            }
            resolve();
        }));
    }

    // Seed admin
    db.query('SELECT * FROM users WHERE username = "admin"', (err, results) => {
        if (!err && results.length === 0) {
            db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ["admin", encrypt("admin"), "admin"]);
        }
    });

    // Seed Security Patterns (New Table)
    db.query('SELECT COUNT(*) as count FROM security_patterns', (err, results) => {
        if (!err && results[0].count === 0) {
            const rules = [
                // SQL Injection Rules
                { type: 'sqli', pattern: String.raw`(\b(UNION([\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\b)`, description: 'Common SQL Keywords' },
                { type: 'sqli', pattern: String.raw`[;]\s*(DECLARE|SET|DROP|EXEC)`, description: 'Stacked Queries' },
                { type: 'sqli', pattern: String.raw`(--\s)|(#\s)|(\/\*[\s\S]*?\*\/)`, description: 'SQL Comments' },
                { type: 'sqli', pattern: String.raw`('[\s]*OR[\s]*'1'[\s]*=[\s]*'1)|('[\s]*OR[\s]*1[\s]*=[\s]*1)|(1[\s]*=[\s]*1)`, description: 'Tautologies (OR 1=1)' },
                { type: 'sqli', pattern: String.raw`(BENCHMARK\()|(SLEEP\()|(WAITFOR\s+DELAY)`, description: 'Time-based Injection' },

                // XSS Rules
                { type: 'xss', pattern: String.raw`<script\b[^>]*>|<\/script>`, description: 'Script Tags' },
                { type: 'xss', pattern: String.raw`<iframe\b[^>]*>|<object\b[^>]*>|<embed\b[^>]*>|<style\b[^>]*>|<svg\b[^>]*>`, description: 'Dangerous HTML Tags' },
                { type: 'xss', pattern: String.raw`javascript:|vbscript:|data:text\/html`, description: 'Dangerous Protocols' },
                { type: 'xss', pattern: String.raw`on\w+\s*=`, description: 'Event Handlers' },
                { type: 'xss', pattern: String.raw`alert\(|confirm\(|prompt\(|eval\(`, description: 'Dangerous JS Functions' },
                { type: 'xss', pattern: String.raw`document\.cookie|document\.domain`, description: 'DOM Access' }
            ];

            const values = rules.map(r => [r.type, r.pattern, r.description]);
            db.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [values], (e) => {
                if (e) console.error('Error seeding security patterns:', e.message);
                else console.log('[INIT] Security patterns seeded.');
            });
        }
    });

    console.log('[INIT] Database tables verified/created');
};

module.exports = initTables;
