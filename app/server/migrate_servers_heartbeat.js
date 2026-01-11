require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    };

    const conn = await mysql.createConnection(dbConfig);
    console.log('Migrating servers table for heartbeat...');

    try {
        await conn.query(`ALTER TABLE servers ADD COLUMN last_seen DATETIME NULL AFTER status`);
        console.log('Added last_seen column');
    } catch (e) { console.log('last_seen column might already exist'); }

    try {
        await conn.query(`ALTER TABLE servers ADD COLUMN cpu_usage FLOAT DEFAULT 0 AFTER last_seen`);
        await conn.query(`ALTER TABLE servers ADD COLUMN ram_usage FLOAT DEFAULT 0 AFTER cpu_usage`);
        await conn.query(`ALTER TABLE servers ADD COLUMN disk_usage FLOAT DEFAULT 0 AFTER ram_usage`);
        console.log('Added usage columns');
    } catch (e) { console.log('Usage columns might already exist'); }

    try {
        await conn.query(`ALTER TABLE servers ADD COLUMN uptime INT DEFAULT 0 AFTER disk_usage`);
        console.log('Added uptime column');
    } catch (e) { console.log('Uptime column might already exist'); }

    await conn.end();
    console.log('Migration done.');
}

migrate().catch(console.error);
