require('dotenv').config();
const mysql = require('mysql2');

const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
};

const db = mysql.createConnection(connectionConfig);

db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL server.');

    db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``, (err) => {
        if (err) {
            console.error('❌ Error creating database:', err.message);
            process.exit(1);
        }
        console.log(`✅ Database "${process.env.DB_NAME}" ensured.`);

        db.query(`USE \`${process.env.DB_NAME}\``, (err) => {
            if (err) {
                console.error('❌ Error switching database:', err.message);
                process.exit(1);
            }

            const queries = [
                `CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS sftp_configs (
                    userId INT PRIMARY KEY,
                    host VARCHAR(255),
                    port INT DEFAULT 22,
                    username VARCHAR(255),
                    password TEXT,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                )`,
                `CREATE TABLE IF NOT EXISTS shares (
                    id VARCHAR(45) PRIMARY KEY,
                    filePath TEXT NOT NULL,
                    fileName VARCHAR(255) NOT NULL,
                    expiresAt DATETIME,
                    password VARCHAR(255),
                    permissions VARCHAR(50) NOT NULL,
                    isFolder TINYINT DEFAULT 0,
                    sftpConfig TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];

            let completed = 0;
            queries.forEach(q => {
                db.query(q, (err) => {
                    if (err) {
                        console.error('❌ Error creating table:', err.message);
                    } else {
                        completed++;
                    }

                    if (completed === queries.length) {
                        console.log('✅ All tables created successfully.');

                        // Seed/Reset admin with encrypted password
                        const { encrypt } = require('../utils/crypto');
                        const adminPass = encrypt('admin');
                        db.query('SELECT * FROM users WHERE username = "admin"', (err, results) => {
                            if (!err && results.length === 0) {
                                db.query('INSERT INTO users (username, password) VALUES (?, ?)', ["admin", adminPass], (err) => {
                                    if (err) console.error('❌ Error seeding admin:', err.message);
                                    else console.log('✅ Default admin user created (admin/admin) with AES-256 encryption.');
                                    db.end();
                                    process.exit(0);
                                });
                            } else {
                                // Update existing admin to use encrypted password if needed
                                db.query('UPDATE users SET password = ? WHERE username = "admin"', [adminPass], (err) => {
                                    if (err) console.error('❌ Error updating admin:', err.message);
                                    else console.log('✅ Admin password updated with AES-256 encryption.');
                                    db.end();
                                    process.exit(0);
                                });
                            }
                        });
                    }
                });
            });
        });
    });
});
