const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');
const https = require('https');
const http = require('http'); // Add http module

const RAW_KEY = process.env.ENCRYPTION_KEY || 'Apakatadunia123456789012ILoveYouFull';
const ENCRYPTION_KEY = RAW_KEY.substring(0, 32); // Ensure exactly 32 chars for AES-256
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return text;
    }
}

const sanitizePath = (p) => {
    if (!p) return '/';
    // Remove null bytes
    let clean = p.replace(/\0/g, '');
    // Normalize slashes
    clean = clean.replace(/\\/g, '/').replace(/\/+/g, '/');
    // Block parent directory traversal
    if (clean.includes('..')) {
        clean = clean.split('/').filter(part => part !== '..').join('/');
    }
    return clean.replace(/\/$/, '') || '/';
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : (req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || '0.0.0.0');
    return ip.replace(/^.*:/, '');
};

const getLocalIp = (req) => {
    return (req.headers['x-local-ip'] || '0.0.0.0').replace(/^.*:/, '');
};

const verifySharePassword = async (share, password) => {
    if (!share.password) return { valid: true, needsRehash: false };

    // Check for Argon2 prefix
    if (share.password.startsWith('$argon2')) {
        try {
            const valid = await argon2.verify(share.password, password);
            return { valid, needsRehash: false };
        } catch (e) {
            console.error('Argon2 verify share error:', e);
            return { valid: false, needsRehash: false };
        }
    }

    // Fallback: Try decrypting (legacy)
    try {
        const decryptedSharePassword = decrypt(share.password);
        if (decryptedSharePassword === password) {
            return { valid: true, needsRehash: true };
        }
    } catch (e) {
        // Fallback: Plain text (rare)
        if (share.password === password) {
            return { valid: true, needsRehash: true };
        }
    }

    return { valid: false, needsRehash: false };
};

/**
 * Get Geo Info from IP using ip-api.com
 * Returns { country: string, lat: number|null, lon: number|null }
 * Note: Uses HTTP because free tier of ip-api.com does not support HTTPS
 */
const getGeoFromIP = async (ip) => {
    const defaultRes = { country: 'Unknown', lat: null, lon: null };

    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { ...defaultRes, country: 'Local' };
    }

    try {
        return new Promise((resolve) => {
            // Updated timeout to 5s and use HTTP
            const req = http.get(`http://ip-api.com/json/${ip}?fields=status,country,lat,lon`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status === 'success') {
                            resolve({
                                country: parsed.country || 'Unknown',
                                lat: parsed.lat || null,
                                lon: parsed.lon || null
                            });
                        } else {
                            resolve(defaultRes);
                        }
                    } catch {
                        resolve(defaultRes);
                    }
                });
            });

            req.on('error', () => resolve(defaultRes));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(defaultRes);
            });
        });
    } catch {
        return defaultRes;
    }
};

module.exports = {
    encrypt,
    decrypt,
    sanitizePath,
    getClientIp,
    getLocalIp,
    verifySharePassword,
    getGeoFromIP
};
