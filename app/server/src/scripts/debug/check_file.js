require('dotenv').config();
const mysql = require('mysql2');
const { getSftpConnection, getFileStats } = require('./sftp');
const { decrypt } = require('./crypto');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.query('SELECT * FROM sftp_configs WHERE userId = 1', async (err, results) => {
    const config = results[0];
    const password = decrypt(config.password);
    const { conn, sftp } = await getSftpConnection({ host: config.host, port: config.port, username: config.username, password: password });

    // Check the specific file the user mentioned in history
    const targetPath = '/home/testklaim/2/0138R0140525V000012_NURBAYINAH.pdf';
    console.log(`Checking: ${targetPath}`);

    try {
        const stats = await getFileStats(sftp, targetPath);
        console.log('FILE_EXISTS:', JSON.stringify(stats));
    } catch (e) {
        console.log('FILE_NOT_FOUND:', e.message);

        // Try without leading home
        const altPath = '/2/0138R0140525V000012_NURBAYINAH.pdf';
        console.log(`Trying alternative: ${altPath}`);
        try {
            const stats2 = await getFileStats(sftp, altPath);
            console.log('ALT_FILE_EXISTS:', JSON.stringify(stats2));
        } catch (e2) {
            console.log('ALT_FILE_NOT_FOUND:', e2.message);
        }
    }

    conn.end();
    db.end();
});
