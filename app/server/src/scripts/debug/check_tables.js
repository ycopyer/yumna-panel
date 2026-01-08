const db = require('./src/config/db');

async function checkTables() {
    db.query('SHOW TABLES', (err, results) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log('TABLES:', JSON.stringify(results, null, 2));
        process.exit(0);
    });
}

checkTables();
