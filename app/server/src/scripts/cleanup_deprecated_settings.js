const db = require('../config/db');

console.log('Cleaning up deprecated security settings...');

const query = `DELETE FROM settings WHERE key_name IN ('security_sqli_patterns', 'security_xss_patterns')`;

db.query(query, (err, result) => {
    if (err) {
        console.error('Error deleting deprecated settings:', err.message);
        process.exit(1);
    }

    console.log(`Successfully removed ${result.affectedRows} deprecated entries from settings table.`);
    process.exit(0);
});
