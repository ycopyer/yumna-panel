const express = require('express');
const router = express.Router();
const svgCaptcha = require('svg-captcha');
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');
const db = require('../config/db');
const { encrypt, decrypt, getClientIp } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');
const { captchaStore, twoFactorStore, lastSentStore } = require('../services/authStore');
const { send2FAEmail } = require('../services/email');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logLoginAttempt, trackSession } = require('../services/securityMonitor');
const fraudGuard = require('../services/FraudGuardService');


// --- 2FA DB Helpers ---
const save2FA = (id, userId, code, expiresAt) => {
    return new Promise((resolve, reject) => {
        db.query('INSERT INTO pending_2fa (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)',
            [id, userId, code, expiresAt], (err) => err ? reject(err) : resolve());
    });
};

const get2FA = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM pending_2fa WHERE id = ?', [id], (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? results[0] : null);
        });
    });
};

const update2FA = (id, newCode, newExpiresAt) => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE pending_2fa SET code = ?, expires_at = ? WHERE id = ?',
            [newCode, newExpiresAt, id], (err) => err ? reject(err) : resolve());
    });
};

const delete2FA = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM pending_2fa WHERE id = ?', [id], (err) => err ? reject(err) : resolve());
    });
};

// Clean old 2FA records occasionally
setInterval(() => {
    db.query('DELETE FROM pending_2fa WHERE expires_at < ?', [Date.now()], (err) => {
        if (err) console.error('Failed to clean pending_2fa:', err);
    });
}, 60 * 60 * 1000); // 1 hour


router.get('/captcha', (req, res) => {
    // Log visit to login page for Threat Map visualization
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    // Success=true translates to a normal 'Authorized' indicator on the map
    logLoginAttempt('Login Portal', ip, userAgent, true, 'Page Visit');

    const captcha = svgCaptcha.create({
        size: 5, noise: 2, color: true, background: '#242f41',
        charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    });
    const id = uuidv4();
    const expiresAt = Date.now() + 1 * 60 * 1000; // 1 minute
    captchaStore.set(id, { text: captcha.text.toUpperCase(), expiresAt });

    console.log(`[AUTH] Captcha created: ${id} (expires at ${new Date(expiresAt).toLocaleTimeString()})`);

    // Prevent caching with multiple headers for maximum compatibility
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.json({ id, svg: captcha.data });
});


const createSession = (userId, req, callback) => {
    const sessionId = uuidv4();
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    // Simplified IP extraction
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    db.query('INSERT INTO user_sessions (sessionId, userId, deviceInfo, ipAddress) VALUES (?, ?, ?, ?)',
        [sessionId, userId, deviceInfo, ipAddress],
        (err) => {
            if (err) console.error('Failed to create session:', err);
            callback(sessionId);
        }
    );
};

router.post('/login', async (req, res) => {
    const { username, password, captchaId, captchaText } = req.body;

    // Validate required fields
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Fraud Prevention: Check Blacklist
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const isBlocked = await fraudGuard.isBlacklisted(ip);
    if (isBlocked) {
        console.warn(`[AUTH] Blocked login attempt from blacklisted IP: ${ip}`);
        return res.status(403).json({ error: 'Your IP has been flagged for suspicious activity. Access denied.' });
    }

    if (!captchaId || !captchaText) {
        return res.status(400).json({ error: 'Captcha is required' });
    }

    const storedCaptcha = captchaStore.get(captchaId);
    if (!storedCaptcha) {
        console.warn(`[AUTH] Login failed: Captcha ID ${captchaId} not found in store (Expired or Invalid ID)`);
        return res.status(400).json({ error: 'Captcha expired or invalid. Please refresh the page.' });
    }

    const now = Date.now();
    if (storedCaptcha.expiresAt < now) {
        captchaStore.delete(captchaId);
        console.warn(`[AUTH] Login failed: Captcha ID ${captchaId} expired at ${new Date(storedCaptcha.expiresAt).toLocaleTimeString()}`);
        return res.status(400).json({ error: 'Captcha expired. Please refresh the page.' });
    }

    // Validate captcha text (but don't delete yet)
    if (storedCaptcha.text.toLowerCase() !== captchaText.trim().toLowerCase()) {
        console.warn(`[AUTH] Invalid captcha text for ID ${captchaId}. Expected: ${storedCaptcha.text}, Got: ${captchaText}`);
        // Delete only on invalid captcha to prevent brute force
        captchaStore.delete(captchaId);
        return res.status(400).json({ error: 'Invalid captcha code. Please try again.' });
    }

    console.log(`[AUTH] Captcha validated for user: ${username}`);

    // Now check user credentials
    db.query('SELECT id, username, password, role, email, two_factor_enabled FROM users WHERE username = ? OR email = ?', [username, username], async (err, results) => {

        if (err) {
            console.error('[AUTH] Database error during login:', err);
            return res.status(500).json({ error: 'Server error. Please try again.' });
        }

        if (results.length === 0) {
            // Log failed attempt
            const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
            const userAgent = req.headers['user-agent'] || 'Unknown';
            logLoginAttempt(username, ip, userAgent, false, 'User not found');

            // Delete captcha on failed login to prevent brute force
            captchaStore.delete(captchaId);
            return res.status(401).json({ error: 'Username atau email tidak ditemukan' });
        }

        const user = results[0];
        let passwordIsValid = false;
        let needsRehash = false;

        try {
            // Check if password is using Argon2 (starts with $argon2)
            if (user.password.startsWith('$argon2')) {
                passwordIsValid = await argon2.verify(user.password, password);
            } else {
                // Fallback to old decryption method
                try {
                    const decryptedStoredPassword = decrypt(user.password);
                    if (decryptedStoredPassword === password) {
                        passwordIsValid = true;
                        needsRehash = true; // Mark for migration
                    }
                } catch (decErr) {
                    console.error('[AUTH] Password decryption failed (legacy):', decErr);
                    // If decryption fails, it might be a plain password (unlikely but safe fallback) or corrupted
                    if (user.password === password) {
                        passwordIsValid = true;
                        needsRehash = true;
                    }
                }
            }
        } catch (err) {
            console.error('[AUTH] Password verification error:', err);
            return res.status(500).json({ error: 'Internal auth error' });
        }

        if (!passwordIsValid) {
            // Log failed attempt
            const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
            const userAgent = req.headers['user-agent'] || 'Unknown';
            logLoginAttempt(username, ip, userAgent, false, 'Invalid password');

            // Delete captcha on failed login
            captchaStore.delete(captchaId);
            return res.status(401).json({ error: 'Password salah' });
        }

        // --- MIGRATION: Auto-update to Argon2id if needed ---
        if (needsRehash) {
            try {
                const newHash = await argon2.hash(password, { type: argon2.argon2id });
                db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id], (upErr) => {
                    if (upErr) console.error('[AUTH] Failed to migrate password for user ' + user.username, upErr);
                    else console.log('[AUTH] Seamlessly migrated password to Argon2id for user: ' + user.username);
                });
            } catch (hashErr) {
                console.error('[AUTH] Failed to hash new password during migration:', hashErr);
            }
        }

        // Validated, now delete captcha
        captchaStore.delete(captchaId);
        console.log(`[AUTH] Login successful for user: ${username}`);

        if (user.two_factor_enabled && user.email) {
            const now = Date.now();
            const lastSent = lastSentStore.get(user.id) || 0;
            const throttleWindow = 30000;

            if (now - lastSent < throttleWindow) {
                console.log(`[AUTH] 2FA Throttle: Checking duplicates for user ${user.username}`);
                try {
                    const existing = await new Promise((resolve) => {
                        db.query('SELECT id FROM pending_2fa WHERE user_id = ? AND expires_at > ? LIMIT 1', [user.id, now], (e, r) => resolve(r && r.length > 0 ? r[0] : null));
                    });
                    if (existing) {
                        return res.json({ requires2FA: true, twoFactorId: existing.id });
                    }
                } catch (e) { console.error('2FA Duplicate check error:', e); }
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const twoFactorId = uuidv4();

            try {
                await save2FA(twoFactorId, user.id, code, Date.now() + 2 * 60 * 1000);
                lastSentStore.set(user.id, now);

                db.query('SELECT key_name, value_text FROM settings WHERE key_name IN ("site_title", "footer_text", "logo_url", "primary_color")', async (settingsErr, settingsResults) => {
                    const settings = {};
                    if (settingsResults) settingsResults.forEach(row => settings[row.key_name] = row.value_text);

                    try {
                        await send2FAEmail(user, code, settings, req);
                        res.json({ requires2FA: true, twoFactorId });
                    } catch (emailErr) {
                        console.error('[AUTH] SMTP Error:', emailErr.message);
                        res.status(500).json({ error: 'Failed to send verification code' });
                    }
                });
            } catch (saveErr) {
                console.error('Failed to save 2FA session:', saveErr);
                return res.status(500).json({ error: 'Database error' });
            }
            return;
        }

        createSession(user.id, req, (sessionId) => {
            // Log successful login
            const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
            const userAgent = req.headers['user-agent'] || 'Unknown';
            logLoginAttempt(username, ip, userAgent, true);
            trackSession(sessionId, user.id, ip, userAgent);

            logActivity(user.id, 'login', `User ${user.username} logged in`, req);
            res.json({ userId: user.id, username: user.username, role: user.role, sessionId });
        });
    });
});

router.post('/verify-2fa', async (req, res) => {
    const { twoFactorId, code } = req.body;

    if (!twoFactorId || !code) {
        return res.status(400).json({ error: 'Kode verifikasi diperlukan' });
    }

    try {
        const storedData = await get2FA(twoFactorId);
        if (!storedData) {
            console.warn(`[AUTH] 2FA failed: ID ${twoFactorId} not found in DB`);
            return res.status(400).json({ error: 'Sesi tidak ditemukan atau sudah kadaluarsa. Silakan login ulang.' });
        }

        // Check expiry
        const now = Date.now();
        if (storedData.expires_at < now) {
            await delete2FA(twoFactorId); // Cleanup
            console.warn(`[AUTH] 2FA failed: Code expired at ${new Date(Number(storedData.expires_at)).toLocaleTimeString()}`);
            return res.status(400).json({ error: 'Kode sudah kadaluarsa. Silakan login ulang.' });
        }

        // Validate code
        if (storedData.code.trim() !== code.trim()) {
            console.warn(`[AUTH] 2FA failed: Invalid code`);
            return res.status(400).json({ error: 'Kode verifikasi salah' });
        }

        console.log(`[AUTH] 2FA code validated successfully for user ID: ${storedData.user_id}`);

        // Get user details
        db.query('SELECT username, role, email FROM users WHERE id = ?', [storedData.user_id], (err, results) => {
            if (err || results.length === 0) return res.status(500).json({ error: 'User lookup failed' });
            const user = results[0];

            createSession(storedData.user_id, req, async (sessionId) => {
                await delete2FA(twoFactorId); // Cleanup

                logActivity(storedData.user_id, 'login_2fa', `User ${user.username} logged in via 2FA`, req);
                res.json({ userId: storedData.user_id, username: user.username, role: user.role, sessionId });
            });
        });

    } catch (err) {
        console.error('[AUTH] Verify 2FA DB Error:', err);
        return res.status(500).json({ error: 'Server error verifying code' });
    }
});

// Session Management Endpoints
router.get('/sessions', requireAuth, (req, res) => {
    const userId = req.headers['x-user-id'];
    const currentSessionId = req.headers['x-session-id'];

    db.query('SELECT * FROM user_sessions WHERE userId = ? ORDER BY lastActive DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const sessions = results.map(s => ({
            ...s,
            isCurrent: s.sessionId === currentSessionId
        }));
        res.json(sessions);
    });
});

router.delete('/sessions/:sessionId', requireAuth, (req, res) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'];

    db.query('DELETE FROM user_sessions WHERE sessionId = ? AND userId = ?', [sessionId, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});



// Admin Session Management
router.get('/admin/users/:userId/sessions', requireAdmin, (req, res) => {
    const { userId } = req.params;
    db.query('SELECT * FROM user_sessions WHERE userId = ? ORDER BY lastActive DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.delete('/admin/sessions/:sessionId', requireAdmin, (req, res) => {
    const { sessionId } = req.params;
    db.query('DELETE FROM user_sessions WHERE sessionId = ?', [sessionId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Session not found' });

        // Optional: Get userId for logging?
        logActivity(req.headers['x-user-id'], 'revoke_session_admin', `Admin revoked session ${sessionId}`, req);
        res.json({ success: true });
    });
});

router.delete('/sessions', requireAuth, (req, res) => {
    const userId = req.headers['x-user-id'];
    const currentSessionId = req.headers['x-session-id'];

    if (!currentSessionId) return res.status(400).json({ error: 'Current session ID required to revoke others' });

    db.query('DELETE FROM user_sessions WHERE userId = ? AND sessionId != ?', [userId, currentSessionId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


router.post('/resend-2fa', async (req, res) => {
    const { twoFactorId } = req.body;

    if (!twoFactorId) {
        return res.status(400).json({ error: 'ID sesi tidak valid.' });
    }

    try {
        const storedData = await get2FA(twoFactorId);
        if (!storedData) {
            return res.status(400).json({ error: 'Sesi habis. Silakan login ulang.' });
        }

        // Rate limiting
        const now = Date.now();
        const lastSent = lastSentStore.get(storedData.user_id) || 0;
        if (now - lastSent < 30000) {
            return res.status(429).json({ error: 'Tunggu sebentar sebelum meminta kode baru.' });
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpires = Date.now() + 2 * 60 * 1000;

        await update2FA(twoFactorId, newCode, newExpires);
        lastSentStore.set(storedData.user_id, now);

        db.query('SELECT users.*, settings.key_name, settings.value_text FROM users CROSS JOIN settings WHERE users.id = ? AND settings.key_name IN ("site_title", "footer_text", "logo_url", "primary_color")', [storedData.user_id], async (err, results) => {
            if (err || results.length === 0) {
                console.error('[AUTH] Resend 2FA DB error:', err);
                return res.status(500).json({ error: 'Gagal mengirim ulang kode.' });
            }

            const user = {
                username: results[0].username,
                email: results[0].email
            };

            const settings = {};
            results.forEach(row => settings[row.key_name] = row.value_text);

            try {
                await send2FAEmail(user, newCode, settings, req);
                console.log(`[AUTH] 2FA code resent to user ID: ${storedData.user_id}`);
                res.json({ success: true, message: 'Kode baru telah dikirim.' });
            } catch (emailErr) {
                console.error('[AUTH] Resend SMTP Error:', emailErr.message);
                res.status(500).json({ error: 'Gagal mengirim email verifikasi.' });
            }
        });

    } catch (err) {
        console.error('Resend error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Profile Endpoint
router.get('/profile', requireAuth, (req, res) => {
    db.query('SELECT id, username, email, role, two_factor_enabled FROM users WHERE id = ?', [req.userId], (err, results) => {
        if (err) {
            console.error('[AUTH] Profile fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    });
});

// Update Profile
router.put('/profile', requireAuth, async (req, res) => {
    const { email, password } = req.body;
    try {
        let updateFields = [];
        let params = [];

        if (email) {
            updateFields.push('email = ?');
            params.push(email);
        }

        if (password) {
            const hashedPassword = await argon2.hash(password);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(req.userId);
        db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params, (err) => {
            if (err) {
                console.error('[AUTH] Profile update error:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            logActivity(req.userId, 'update_profile', 'Updated profile information', req);
            res.json({ success: true, message: 'Profile updated successfully' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
