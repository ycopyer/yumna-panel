require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function checkSchema() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    };

    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.query('DESCRIBE servers');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
}

checkSchema().catch(console.error);
