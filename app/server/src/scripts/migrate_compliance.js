const db = require('../config/db');

const queries = [
    // 1. Add compliance columns to activity_history
    `ALTER TABLE activity_history 
     ADD COLUMN IF NOT EXISTS event_id VARCHAR(64) UNIQUE,
     ADD COLUMN IF NOT EXISTS hash VARCHAR(64),
     ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64)`,

    // 2. Add event_id to threat_logs
    `ALTER TABLE threat_logs 
     ADD COLUMN IF NOT EXISTS event_id VARCHAR(64) UNIQUE`,

    // 2b. Allow NULL userId for guest logs
    `ALTER TABLE activity_history MODIFY userId INT NULL`,

    // 3. Create compliance_settings table
    `CREATE TABLE IF NOT EXISTS compliance_settings (
        key_name VARCHAR(255) PRIMARY KEY,
        value_text TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // 4. Create files_compliance table (for legal hold and retention)
    `CREATE TABLE IF NOT EXISTS files_compliance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filePath TEXT NOT NULL,
        userId INT,
        legal_hold TINYINT DEFAULT 0,
        retention_until DATETIME DEFAULT NULL,
        policy_id VARCHAR(50),
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_path (filePath(255))
    )`,

    // 5. Seed default compliance settings
    `INSERT IGNORE INTO compliance_settings (key_name, value_text) VALUES 
     ('retention_days_logs', '90'),
     ('retention_days_threats', '365'),
     ('legal_hold_global', '0'),
     ('compliance_mode', 'standard')`
];

async function migrate() {
    console.log('[COMPLIANCE] Starting migration...');
    for (const q of queries) {
        try {
            await new Promise((resolve, reject) => {
                db.query(q, (err) => {
                    if (err) {
                        // Ignore duplicate column errors for older MySQL versions
                        if (err.errno === 1060) return resolve();
                        console.error('Migration error:', err.message);
                        return reject(err);
                    }
                    resolve();
                });
            });
        } catch (e) {
            console.error('Query failed:', q.substring(0, 100));
        }
    }
    console.log('[COMPLIANCE] Migration completed successfully.');
    process.exit(0);
}

migrate();
