const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting Anycast Support Migration...');

        // Add PoP (Point of Presence) and Anycast flag to servers table
        await pool.promise().query(`
            ALTER TABLE servers 
            ADD COLUMN IF NOT EXISTS is_anycast BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS pop_region VARCHAR(10) DEFAULT 'GL' COMMENT 'Global, AS, EU, US, etc.'
        `);

        // Add 'anycast_enabled' to dns_zones to selectively announce/enable zones on anycast nodes if needed
        // (Optional, but good for granular control)
        await pool.promise().query(`
            ALTER TABLE dns_zones
            ADD COLUMN IF NOT EXISTS anycast_enabled BOOLEAN DEFAULT TRUE
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
