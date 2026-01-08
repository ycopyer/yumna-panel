const crypto = require('crypto');
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'v-p-s-f-t-p-m-a-n-a-g-e-r-s-e-c-r-e-t';
// Ensure key is 32 bytes by hashing it
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    let textParts = text.split(':');
    if (textParts.length < 2) return null;
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = { encrypt, decrypt };
