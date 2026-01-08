require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'filemanager'
});

const TARGET_IP = '192.168.10.69';

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }
    console.log(`Unblocking IP: ${TARGET_IP}...`);

    db.query('DELETE FROM firewall WHERE target = ? AND type = "ip"', [TARGET_IP], (err, result) => {
        if (err) {
            console.error('Failed to unblock:', err.message);
        } else {
            console.log(`Unblocked successfully. Affected rows: ${result.affectedRows}`);
        }
        db.end();
    });
});
