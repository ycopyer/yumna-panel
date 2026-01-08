const db = require('../config/db');
const { decrypt } = require('../utils/helpers');
const argon2 = require('argon2');

async function migrateAll() {
    console.log('Starting Mass Password Migration to Argon2id...');

    // 1. Migrate Users
    console.log('\n--- Migrating Users ---');
    const users = await new Promise((resolve, reject) => {
        db.query('SELECT id, username, password FROM users', (err, res) => {
            if (err) reject(err); else resolve(res);
        });
    });

    let userCount = 0;
    for (const user of users) {
        // Skip if already Argon2
        if (user.password && user.password.startsWith('$argon2')) continue;

        try {
            // Decrypt old password
            const plain = decrypt(user.password);

            // Should match raw if decryption fails/returns same (rare fallback) or if it was plain
            // But verify: decrypt returns null if fail usually or original text if try-catch
            // helpers.js decrypt returns original text on error.

            if (plain) {
                const hash = await argon2.hash(plain, { type: argon2.argon2id });
                await new Promise((resolve, reject) => {
                    db.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id], (err) => {
                        if (err) reject(err); else resolve();
                    });
                });
                console.log(`Migrated User: ${user.username}`);
                userCount++;
            }
        } catch (e) {
            console.error(`Failed to migrate user ${user.username}:`, e.message);
        }
    }
    console.log(`User Migration Complete. Updated: ${userCount} users.`);


    // 2. Migrate Shares
    console.log('\n--- Migrating Shares ---');
    const shares = await new Promise((resolve, reject) => {
        db.query('SELECT id, fileName, password FROM shares WHERE password IS NOT NULL', (err, res) => {
            if (err) reject(err); else resolve(res);
        });
    });

    let shareCount = 0;
    for (const share of shares) {
        if (share.password && share.password.startsWith('$argon2')) continue;
        if (!share.password) continue; // Should be filtered by query but double check

        try {
            const plain = decrypt(share.password);
            if (plain) {
                const hash = await argon2.hash(plain, { type: argon2.argon2id });
                await new Promise((resolve, reject) => {
                    db.query('UPDATE shares SET password = ? WHERE id = ?', [hash, share.id], (err) => {
                        if (err) reject(err); else resolve();
                    });
                });
                console.log(`Migrated Share: ${share.fileName} (ID: ${share.id})`);
                shareCount++;
            }
        } catch (e) {
            console.error(`Failed to migrate share ${share.id}:`, e.message);
        }
    }
    console.log(`Share Migration Complete. Updated: ${shareCount} shares.`);

    console.log('\nAll Done! Exiting...');
    process.exit(0);
}

migrateAll().catch(err => {
    console.error('Migration Fatal Error:', err);
    process.exit(1);
});
