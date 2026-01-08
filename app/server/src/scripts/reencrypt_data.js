const db = require('../config/db');
const crypto = require('crypto');

// Keys
const OLD_KEY = 'vpsftpmanagersecrets123456789012'; // 32 chars
const RAW_NEW_KEY = process.env.ENCRYPTION_KEY || 'Apakatadunia123456789012ILoveYouFull';
const NEW_KEY = RAW_NEW_KEY.substring(0, 32); // 32 chars

const IV_LENGTH = 16;

// Helper functions with specific keys
function decrypt(text, key) {
    if (!text) return null;
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return null; // Return null on failure logic
    }
}

function encrypt(text, key) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function reEncryptData() {
    console.log('Starting Data Re-Encryption...');
    console.log(`Old Key: ${OLD_KEY}`);
    console.log(`New Key: ${NEW_KEY}`);

    // 1. Re-encrypt SFTP Configs
    console.log('\n--- Processing SFTP Configs ---');
    const sftpConfigs = await new Promise((resolve, reject) => {
        db.query('SELECT userId, password FROM sftp_configs WHERE password IS NOT NULL', (err, res) => {
            if (err) reject(err); else resolve(res);
        });
    });

    for (const conf of sftpConfigs) {
        if (!conf.password) continue;

        // Try decrypt with old key
        let plain = decrypt(conf.password, OLD_KEY);

        // If failed, maybe it's already new key? Try decrypt with new key
        if (!plain) {
            const checkNew = decrypt(conf.password, NEW_KEY);
            if (checkNew) {
                console.log(`Config for User ${conf.userId} already encrypted with new key. Skipping.`);
                continue;
            } else {
                // Determine if it was plain text (legacy legacy) or corrupted
                console.warn(`WARN: Could not decrypt SFTP password for User ${conf.userId}. Skipping.`);
                continue;
            }
        }

        // Encrypt with new key
        const newCypher = encrypt(plain, NEW_KEY);

        await new Promise((resolve, reject) => {
            db.query('UPDATE sftp_configs SET password = ? WHERE userId = ?', [newCypher, conf.userId], (err) => {
                if (err) reject(err); else resolve();
            });
        });
        console.log(`Updated SFTP Config for User ${conf.userId}`);
    }


    // 2. Re-encrypt Share SFTP Configs
    console.log('\n--- Processing Shares SFTP Data ---');
    const shares = await new Promise((resolve, reject) => {
        db.query('SELECT id, sftpConfig FROM shares WHERE sftpConfig IS NOT NULL', (err, res) => {
            if (err) reject(err); else resolve(res);
        });
    });

    for (const share of shares) {
        if (!share.sftpConfig) continue;

        let plainConfigStr = decrypt(share.sftpConfig, OLD_KEY);

        if (!plainConfigStr) {
            const checkNew = decrypt(share.sftpConfig, NEW_KEY);
            if (checkNew) {
                console.log(`Share ${share.id} already encrypted with new key. Skipping.`);
                continue;
            } else {
                console.warn(`WARN: Could not decrypt Share SFTP Config for share ${share.id}. Skipping.`);
                continue;
            }
        }

        // Encrypt with new key
        const newCypher = encrypt(plainConfigStr, NEW_KEY);

        await new Promise((resolve, reject) => {
            db.query('UPDATE shares SET sftpConfig = ? WHERE id = ?', [newCypher, share.id], (err) => {
                if (err) reject(err); else resolve();
            });
        });
        console.log(`Updated Share ${share.id} SFTP config`);
    }

    console.log('\nRe-encryption Complete.');
    process.exit(0);
}

reEncryptData();
