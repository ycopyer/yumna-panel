require('dotenv').config();
const mysql = require('mysql2');
const { getSftpConnection, listDirectoryRecursive } = require('./sftp');
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

    console.log('Searching for restored files...');
    const list = await listDirectoryRecursive(sftp, '/home/testklaim');
    const targetFiles = [
        '0138R0140525V000123_NURJANAH.pdf',
        '0138R0140525V000012_NURBAYINAH.pdf',
        '0138R0140525V000010_SITI RUBIYAH.pdf'
    ];

    list.forEach(item => {
        if (targetFiles.includes(item.name)) {
            console.log(`FOUND: ${item.name} at ${item.path}`);
        }
    });

    // Also check the root trash
    try {
        const trashList = await listDirectoryRecursive(sftp, '/trash');
        trashList.forEach(item => {
            if (targetFiles.some(t => item.name.startsWith(t))) {
                console.log(`STILL IN TRASH: ${item.name} at ${item.path}`);
            }
        });
    } catch (e) { }

    conn.end();
    db.end();
});
