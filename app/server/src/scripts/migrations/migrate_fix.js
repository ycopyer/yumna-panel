require('dotenv').config();
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) AFTER role', (err) => {
    if (err) console.error('Email error:', err.message);
    else console.log('Email added');

    db.query('ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT DEFAULT 0 AFTER email', (err) => {
        if (err) console.error('2FA error:', err.message);
        else console.log('2FA added');
        process.exit();
    });
});
