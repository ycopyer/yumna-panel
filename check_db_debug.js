const mysql = require('mysql2/promise');
require('dotenv').config({ path: './app/server/.env' });

async function checkDbs() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.query('SELECT * FROM `databases`');
        console.log('Total databases:', rows.length);
        console.log('Sample rows:', rows.slice(0, 5).map(r => ({ id: r.id, userId: r.userId, name: r.name })));

        const [users] = await connection.query('SELECT id, username, role FROM users');
        console.log('Users:', users.map(u => ({ id: u.id, username: u.username, role: u.role })));
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkDbs();
