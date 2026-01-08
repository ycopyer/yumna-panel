const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Database connected.');

    const queries = [
        "ALTER TABLE sftp_configs ADD COLUMN name VARCHAR(255) DEFAULT 'SFTP Server';",
        "ALTER TABLE sftp_configs ADD COLUMN rootPath VARCHAR(255) DEFAULT '/';"
    ];

    let completed = 0;
    queries.forEach(query => {
        db.query(query, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log('Column already exists, skipping.');
                } else {
                    console.error('Error adding column:', err.message);
                }
            } else {
                console.log('Column added successfully.');
            }
            completed++;
            if (completed === queries.length) db.end();
        });
    });
});
