const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting DNS Security Stage 4 Migration...');

        // 1. Zone Lock & IP Restriction columns
        await pool.promise().query(`
            ALTER TABLE dns_zones 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS allowed_ips TEXT DEFAULT NULL
        `);

        // 2. Record Lock (Per-record protection/permission sim)
        await pool.promise().query(`
            ALTER TABLE dns_records 
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
