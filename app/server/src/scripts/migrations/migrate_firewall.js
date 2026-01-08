const db = require('./src/config/db');

const run = async () => {
    console.log('Migrating Firewall table...');

    // 1. Add country column
    await new Promise(resolve => {
        db.query("ALTER TABLE firewall ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL", (err) => {
            if (err && !err.message.includes('Duplicate column')) console.error('Col Error:', err.message);
            else console.log("Added 'country' column.");
            resolve();
        });
    });

    // 2. Add Settings Defaults
    const defaults = [
        ['firewall_threshold', '40'], // 40 requests
        ['firewall_window', '60'],    // 1 minute
        ['firewall_codes', '404,403,500,401,301,302,201,505'] // Monitored codes
    ];

    for (const [k, v] of defaults) {
        await new Promise(resolve => {
            db.query("INSERT IGNORE INTO settings (key_name, value_text) VALUES (?, ?)", [k, v], (err) => {
                if (err) console.error(`Setting ${k} error:`, err.message);
                resolve();
            });
        });
    }

    console.log('Migration Complete.');
    process.exit(0);
};

run();
