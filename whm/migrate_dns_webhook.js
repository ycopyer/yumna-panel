const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting DNS Webhook Migration...');

        await pool.promise().query(`
            ALTER TABLE dns_zones 
            ADD COLUMN IF NOT EXISTS webhook_url TEXT DEFAULT NULL
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
