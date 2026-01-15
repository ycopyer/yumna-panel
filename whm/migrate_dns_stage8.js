const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting Stage 8 Migration (DNS Security & Firewall)...');

        // 1. DNS Firewall / RPZ Rules
        // Stores rules for Response Policy Zones or blocking access
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS dns_firewall_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                priority INT DEFAULT 100,
                rule_type ENUM('domain', 'client_ip', 'qtype', 'rpz') NOT NULL,
                pattern VARCHAR(255) NOT NULL, -- e.g., "*.malware.com" or "1.2.3.4/24"
                action ENUM('drop', 'truncate', 'noerror', 'nxdomain', 'redirect') NOT NULL,
                redirect_data VARCHAR(255) DEFAULT NULL, -- if action is redirect
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Anomaly Detection Settings (Per Zone or Global)
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS dns_anomaly_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                zoneId INT NULL, -- NULL for Global Policy
                detect_tunneling BOOLEAN DEFAULT TRUE,
                tunnel_threshold INT DEFAULT 50, -- e.g. score or packet size
                rate_limit_qps INT DEFAULT 1000,
                block_duration INT DEFAULT 300, -- seconds
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (zoneId) REFERENCES dns_zones(id) ON DELETE CASCADE
            )
        `);

        // 3. Anomaly Logs (Events)
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS dns_anomaly_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                zoneId INT NULL,
                event_type ENUM('tunneling', 'ddos', 'query_flood', 'suspicious_query') NOT NULL,
                source_ip VARCHAR(45) NOT NULL,
                details JSON,
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
