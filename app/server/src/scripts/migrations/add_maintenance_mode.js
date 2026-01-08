const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        console.log('Adding maintenance_mode column to websites table...');

        // Check if column exists
        const [rows] = await connection.query(`SHOW COLUMNS FROM websites LIKE 'maintenance_mode'`);
        if (rows.length === 0) {
            await connection.query(`ALTER TABLE websites ADD COLUMN maintenance_mode BOOLEAN DEFAULT FALSE`);
            console.log('Column maintenance_mode added successfully.');
        } else {
            console.log('Column maintenance_mode already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
