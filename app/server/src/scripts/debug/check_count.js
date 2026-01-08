const db = require('./src/config/db');

async function checkCount() {
    db.query('SELECT COUNT(*) as count FROM login_attempts', (err, results) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log('COUNT:', results[0].count);
        process.exit(0);
    });
}

checkCount();
