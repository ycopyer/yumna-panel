require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateFooter() {
    const dbs = ['filemanager_db2', 'filemanager_sftp', 'filemanager_db', 'yumna_db'];

    for (const dbName of dbs) {
        const dbConfig = {
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: dbName
        };

        let connection;
        try {
            console.log(`📡 Connecting to ${dbName}...`);
            connection = await mysql.createConnection(dbConfig);

            const newFooter = 'Advanced Hosting & Server Control Panel';

            await connection.query(
                'INSERT INTO settings (key_name, value_text) VALUES ("footer_text", ?) ON DUPLICATE KEY UPDATE value_text = ?',
                [newFooter, newFooter]
            );

            console.log(`✅ [${dbName}] Footer text updated.`);
            await connection.end();
        } catch (err) {
            console.log(`❌ [${dbName}] Skip: ${err.message}`);
        }
    }
    process.exit(0);
}

updateFooter();
