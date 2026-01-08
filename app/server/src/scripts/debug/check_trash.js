require('dotenv').config();
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'filemanager_sftp'
});
db.connect();
db.query('SELECT * FROM trash', (err, results) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(results, null, 2));
    db.end();
});
