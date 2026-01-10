const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class TwoFactorService {
    /**
     * Generate 2FA secret and QR code for a user
     */
    async generateSecret(username) {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(username, 'YumnaPanel', secret);
        const qrContent = await qrcode.toDataURL(otpauth);

        return { secret, qrContent };
    }

    /**
     * Enable 2FA for a user (after verification)
     */
    async enable(userId, secret, token) {
        const isValid = authenticator.check(token, secret);
        if (!isValid) throw new Error('Invalid authentication code');

        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'UPDATE users SET two_factor_secret = ?, two_factor_enabled = TRUE WHERE id = ?',
                [secret, userId]
            );
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Disable 2FA for a user
     */
    async disable(userId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = ?',
                [userId]
            );
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Verify 2FA token
     */
    async verify(userId, token) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
            if (rows.length === 0 || !rows[0].two_factor_secret) return false;

            return authenticator.check(token, rows[0].two_factor_secret);
        } finally {
            await connection.end();
        }
    }

    /**
     * Get 2FA status for a user
     */
    async getStatus(userId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query('SELECT two_factor_enabled FROM users WHERE id = ?', [userId]);
            return rows[0] ? rows[0].two_factor_enabled : false;
        } finally {
            await connection.end();
        }
    }
}

module.exports = new TwoFactorService();
