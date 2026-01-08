const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const LOCAL_STORAGE_BASE = process.env.LOCAL_STORAGE_PATH || path.join(__dirname, '../../storage');

const getDirectorySize = async (dirPath) => {
    let totalSize = 0;
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                totalSize += await getDirectorySize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('Error calculating size:', err);
    }
    return totalSize;
};

const runMigration = async () => {
    console.log('Starting Quota Migration...');

    // 1. Add Columns
    try {
        await db.promise().query(`
            ALTER TABLE users 
            ADD COLUMN storage_quota BIGINT DEFAULT 1073741824, 
            ADD COLUMN used_storage BIGINT DEFAULT 0
        `);
        console.log('Added storage_quota and used_storage columns.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist, skipping ALTER TABLE.');
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    }

    // 2. Calculate and Update Usage
    try {
        const [users] = await db.promise().query('SELECT id, username FROM users');

        for (const user of users) {
            const userPath = path.join(LOCAL_STORAGE_BASE, String(user.id));
            const size = await getDirectorySize(userPath);

            await db.promise().query('UPDATE users SET used_storage = ? WHERE id = ?', [size, user.id]);
            console.log(`Updated user ${user.username} (ID: ${user.id}): ${size} bytes used.`);
        }

        console.log('Quota Migration Completed Successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating usage:', err);
        process.exit(1);
    }
};

runMigration();
