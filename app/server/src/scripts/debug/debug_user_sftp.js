const db = require('./src/config/db');
db.query('SELECT name FROM sftp_configs WHERE userId = 1', (err, results) => {
    console.log(results);
    process.exit();
});
