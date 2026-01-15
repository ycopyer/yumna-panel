const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting Stage 7 Migration (Provider Integration)...');

        // Table to store external DNS configurations
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS dns_providers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('route53', 'powerdns', 'cloudflare', 'other') NOT NULL,
                config JSON DEFAULT NULL, -- credentials, api_url, keys
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add provider_id to dns_zones if we want to map specific zones to specific providers
        // For now, assume global sync or per-zone manual sync.

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
