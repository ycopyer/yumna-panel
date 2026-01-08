require('dotenv').config();
const mysql = require('mysql2');
const { decrypt } = require('./crypto');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.query('SELECT id, username, password FROM users WHERE username = "admin"', (err, results) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (results.length === 0) {
        console.log('Admin user not found!');
        process.exit(1);
    }

    const admin = results[0];
    console.log('Admin user found:');
    console.log('ID:', admin.id);
    console.log('Username:', admin.username);
    console.log('Encrypted password:', admin.password);

    try {
        const decrypted = decrypt(admin.password);
        console.log('Decrypted password:', decrypted);
    } catch (e) {
        console.log('Password is not encrypted or decryption failed:', e.message);
        console.log('Raw password value:', admin.password);
    }

    process.exit();
});
