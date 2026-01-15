const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting DNS Safety Migration...');

        // Add status column to dns_records
        // active: live
        // pending_create: newly added, not publish
        // pending_delete: marked for deletion, not published
        // pending_update: modified, not published (requires original values to stay live)

        await pool.promise().query(`
            ALTER TABLE dns_records 
            ADD COLUMN IF NOT EXISTS status ENUM('active', 'pending_create', 'pending_delete', 'pending_update') DEFAULT 'active'
        `);

        // To support pending_update properly without breaking live site, 
        // a common pattern is to have a shadow record or store draft data in JSON.
        // For simplicity in Yumna Panel, we'll use a shadow record approach or just mark for update.
        // Actually, let's add draft_data JSON column for updates
        await pool.promise().query(`
            ALTER TABLE dns_records 
            ADD COLUMN IF NOT EXISTS draft_data JSON DEFAULT NULL
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
