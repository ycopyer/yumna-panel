const db = require('./src/config/db');
db.query('SELECT * FROM sftp_configs WHERE userId = 1', (err, results) => {
    console.log(results[0]);
    process.exit();
});
