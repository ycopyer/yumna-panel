const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
// This is primarily used for PowerDNS backend interaction if configured
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'yumna_agent',
    password: process.env.DB_PASSWORD || 'yumna_agent_password',
    database: process.env.DB_NAME || 'pdns',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert it to use promises
const promisePool = pool.promise();

// Check connection
pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'ECONNREFUSED') {
            console.warn('[WARN] Database connection failed (PowerDNS). Some DNS features may be unavailable.');
        } else {
            console.error('[DB] Database connection error:', err.message);
        }
    } else {
        if (connection) connection.release();
        // console.log('[DB] Connected to database.');
    }
});

module.exports = promisePool;
