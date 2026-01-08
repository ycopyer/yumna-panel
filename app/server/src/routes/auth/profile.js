const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { encrypt } = require('../../utils/helpers');
const { requireAuth } = require('../../middleware/auth');
const { uploadAvatar } = require('../../middleware/upload');

const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

router.put('/profile', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
    const userId = req.userId; // Use userId from session set by requireAuth
    let { password, email, sftp } = req.body;

    if (typeof sftp === 'string') {
        try { sftp = JSON.parse(sftp); } catch (e) { sftp = null; }
    }

    let avatar = undefined;
    if (req.file) {
        try {
            const uploadDir = path.join(__dirname, '../../uploads');
            await fs.mkdir(uploadDir, { recursive: true });

            const filename = `avatar-${userId}-${Date.now()}.webp`;
            const fullPath = path.join(uploadDir, filename);

            await sharp(req.file.buffer)
                .resize(200, 200, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(fullPath);

            avatar = `/uploads/${filename}`;
        } catch (sharpErr) {
            console.error('[AVATAR ERROR]', sharpErr);
            return res.status(400).json({ error: 'Failed to process image. Make sure it is a valid image file.' });
        }
    }

    // Prepare profile update
    let query = 'UPDATE users SET email = ?';
    let params = [email || ''];
    if (password) { query += ', password = ?'; params.push(encrypt(password)); }
    if (avatar) { query += ', avatar = ?'; params.push(avatar); }
    query += ' WHERE id = ?';
    params.push(userId);

    db.query(query, params, (err) => {
        if (err) {
            console.error('[PROFILE UPDATE ERROR]', err);
            return res.status(500).json({ error: 'Database error while updating profile' });
        }

        // Handle SFTP Config if provided
        if (sftp && sftp.host) {
            const encryptedSftpPass = sftp.password ? encrypt(sftp.password) : null;
            const port = parseInt(sftp.port) || 22;

            if (encryptedSftpPass) {
                db.query(
                    `INSERT INTO sftp_configs(userId, host, port, username, password, name, rootPath) 
                     VALUES(?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE host=VALUES(host), port=VALUES(port), username=VALUES(username), password=VALUES(password), name=VALUES(name), rootPath=VALUES(rootPath)`,
                    [userId, sftp.host, port, sftp.username || '', encryptedSftpPass, sftp.name || 'Server', sftp.rootPath || '/'],
                    (sftpErr) => {
                        if (sftpErr) {
                            console.error('[SFTP CONFIG ERROR]', sftpErr);
                            return res.status(500).json({ error: 'Profile updated, but failed to save SFTP settings' });
                        }
                        res.json({ success: true, avatar });
                    }
                );
            } else {
                // If password not provided, check if record exists to decide between INSERT or UPDATE (preserving old password)
                db.query('SELECT * FROM sftp_configs WHERE userId = ?', [userId], (checkErr, checkRes) => {
                    if (checkErr) return res.status(500).json({ error: 'Database error checking SFTP config' });

                    let sQuery, sParams;
                    if (checkRes.length === 0) {
                        sQuery = 'INSERT INTO sftp_configs(userId, host, port, username, password, name, rootPath) VALUES(?, ?, ?, ?, ?, ?, ?)';
                        sParams = [userId, sftp.host, port, sftp.username || '', '', sftp.name || 'Server', sftp.rootPath || '/'];
                    } else {
                        sQuery = 'UPDATE sftp_configs SET host=?, port=?, username=?, name=?, rootPath=? WHERE userId=?';
                        sParams = [sftp.host, port, sftp.username || '', sftp.name || 'Server', sftp.rootPath || '/', userId];
                    }

                    db.query(sQuery, sParams, (finalErr) => {
                        if (finalErr) return res.status(500).json({ error: 'Failed to update SFTP configuration' });
                        res.json({ success: true, avatar });
                    });
                });
            }
        } else {
            res.json({ success: true, avatar });
        }
    });
});

// Test SFTP Connection
router.post('/test-sftp-connection', requireAuth, async (req, res) => {
    const { host, port, username, password } = req.body;

    if (!host || !username || !password) {
        return res.status(400).json({ error: 'Host, username, and password are required' });
    }

    try {
        const { getSftpConnection } = require('../../core/sftp');

        console.log(`[SFTP TEST] Testing connection to ${host}:${port} for user ${username}`);

        // Set a timeout for the connection test
        const connectionPromise = getSftpConnection({
            host,
            port: parseInt(port) || 22,
            username,
            password
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout (30s)')), 30000)
        );

        const result = await Promise.race([connectionPromise, timeoutPromise]);

        // Test successful - close the connection
        if (result.conn) {
            result.conn.end();
        }

        console.log(`[SFTP TEST] Connection successful to ${host}`);
        res.json({
            success: true,
            message: `Successfully connected to ${host}:${port}`
        });

    } catch (err) {
        console.error('[SFTP TEST] Connection failed:', err.message);

        let errorMessage = 'Connection failed';
        if (err.message.includes('timeout')) {
            errorMessage = 'Connection timeout. Server may be unreachable.';
        } else if (err.message.includes('authentication')) {
            errorMessage = 'Authentication failed. Check username and password.';
        } else if (err.message.includes('ENOTFOUND')) {
            errorMessage = 'Host not found. Check the hostname.';
        } else if (err.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused. Check host and port.';
        } else {
            errorMessage = err.message;
        }

        res.status(400).json({ error: errorMessage });
    }
});

module.exports = router;
