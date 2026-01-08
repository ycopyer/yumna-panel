const db = require('./src/config/db');

async function checkIndexes() {
    try {
        db.query('SHOW INDEX FROM login_attempts', (err, results) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log('INDEXES:', JSON.stringify(results, null, 2));
            process.exit(0);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkIndexes();
