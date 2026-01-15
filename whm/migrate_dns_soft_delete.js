const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting DNS Soft Delete Migration...');

        // Update ENUM to include 'deleted'
        await pool.promise().query(`
            ALTER TABLE dns_records 
            MODIFY COLUMN status ENUM('active', 'pending_create', 'pending_delete', 'pending_update', 'deleted') DEFAULT 'active'
        `);

        // Add deleted_at column
        await pool.promise().query(`
            ALTER TABLE dns_records 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
