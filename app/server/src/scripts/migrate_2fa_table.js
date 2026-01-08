require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'filemanager'
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }
    console.log('Running 2FA Table Migration...');

    const query = `
        CREATE TABLE IF NOT EXISTS pending_2fa (
            id VARCHAR(36) PRIMARY KEY,
            user_id INT NOT NULL,
            code VARCHAR(10) NOT NULL,
            expires_at BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (user_id),
            INDEX idx_expires (expires_at)
        )
    `;

    db.query(query, (err) => {
        if (err) {
            console.error('Migration Failed:', err);
            process.exit(1);
        }
        console.log('pending_2fa table created successfully.');
        db.end();
        process.exit(0);
    });
});
