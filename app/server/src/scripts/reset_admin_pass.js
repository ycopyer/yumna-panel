require('dotenv').config();
const mysql = require('mysql2');
const { encrypt } = require('./crypto');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

const newPassword = 'admin';
const encryptedPassword = encrypt(newPassword);

db.query('UPDATE users SET password = ? WHERE username = "admin"', [encryptedPassword], (err, results) => {
    if (err) {
        console.error('Error updating password:', err);
        process.exit(1);
    }

    console.log('✓ Admin password successfully reset to: admin');
    console.log('Affected rows:', results.affectedRows);
    process.exit();
});
