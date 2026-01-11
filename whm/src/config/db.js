const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

const connectWithRetry = (retryCount = 0, maxRetries = 10) => {
    const setupDb = mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        connectTimeout: 20000
    });

    setupDb.connect((err) => {
        if (err) {
            if (retryCount < maxRetries) {
                console.log(`[DB] Waiting for MariaDB... Attempt ${retryCount + 1}/${maxRetries}`);
                setTimeout(() => connectWithRetry(retryCount + 1), 3000);
            } else {
                console.error('[CRITICAL] Failed to connect to MySQL after several retries:', err.message);
            }
            return;
        }

        console.log('[DB] Connected to MariaDB. Verifying database...');
        setupDb.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``, (queryErr) => {
            if (queryErr) console.error('[ERROR] Error creating database:', queryErr.message);
            console.log(`[DB] Database "${process.env.DB_NAME}" confirmed.`);
            setupDb.end();
        });
    });
};

connectWithRetry();

const pool = mysql.createPool(poolConfig);

module.exports = pool;
