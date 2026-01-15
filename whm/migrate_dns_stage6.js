const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting Stage 6 Migration (GeoDNS & High Availability)...');

        // 1. Scoped API Tokens (Stage 5 item, implemented now)
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS api_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                scopes TEXT DEFAULT NULL, -- JSON array of scopes ['dns:read', 'dns:write']
                last_used_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 2. DNS Advanced Features (GeoDNS, Failover, Weight)
        // We add routing_policy JSON column to store all these rules
        await pool.promise().query(`
            ALTER TABLE dns_records 
            ADD COLUMN IF NOT EXISTS routing_policy JSON DEFAULT NULL
        `);
        // Example routing_policy:
        // { 
        //    "type": "weighted", "weight": 10 
        //    or 
        //    "type": "geo", "region": "AS" 
        //    or 
        //    "type": "failover", "health_check_url": "http://..", "backup_record_id": 12 
        // }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
