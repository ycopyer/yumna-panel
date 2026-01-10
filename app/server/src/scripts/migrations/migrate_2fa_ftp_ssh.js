require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    };

    const connection = await mysql.createConnection(config);
    console.log('Migrating 2FA for FTP/SSH...');

    try {
        // SSH Accounts
        await connection.query(`
            ALTER TABLE ssh_accounts 
            ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0,
            ADD COLUMN two_factor_secret VARCHAR(255) DEFAULT NULL
        `).catch(err => console.log('SSH table already updated or error:', err.message));

        // FTP Accounts
        await connection.query(`
            ALTER TABLE ftp_accounts 
            ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0,
            ADD COLUMN two_factor_secret VARCHAR(255) DEFAULT NULL
        `).catch(err => console.log('FTP table already updated or error:', err.message));

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
