const db = require('../config/db');

async function migrate() {
    console.log('[MIGRATION] Creating push_subscriptions table...');

    const query = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            userId INT NOT NULL, 
            endpoint TEXT NOT NULL, 
            p256dh VARCHAR(255) NOT NULL, 
            auth VARCHAR(255) NOT NULL, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            UNIQUE KEY unique_endpoint (endpoint(255))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        await db.promise().query(query);
        console.log('✅ Migration successful: push_subscriptions table created.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
