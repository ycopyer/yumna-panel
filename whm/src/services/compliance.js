const db = require('../config/db');
const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');

/**
 * Compliance Service
 * Handles Hash-chained logs, Security Event IDs (UUID v7), and Legal Hold logic.
 */
class ComplianceService {
    /**
     * Generate a unique Security Event ID using UUID v7 (RFC 9562)
     * UUID v7 is time-ordered and sortable, optimized for database indexing
     * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
     * First 48 bits = Unix timestamp in milliseconds
     */
    static generateEventId(prefix = 'SEC') {
        return uuidv7();
        // Output example: 018d3f7e-8c9a-7000-8000-0123456789ab
    }

    /**
     * Calculate SHA-256 hash for hash-chaining
     */
    static calculateHash(data, prevHash) {
        const content = JSON.stringify(data) + (prevHash || '');
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get the last log's hash from activity_history
     */
    static async getLastLogHash() {
        return new Promise((resolve) => {
            db.query('SELECT hash FROM activity_history ORDER BY id DESC LIMIT 1', (err, rows) => {
                if (err || rows.length === 0) resolve(null);
                else resolve(rows[0].hash);
            });
        });
    }

    /**
     * Log a secure, hash-chained activity
     */
    static async logSecureActivity(userId, action, description, context = {}) {
        const prevHash = await this.getLastLogHash();
        const eventId = this.generateEventId(action.slice(0, 3).toUpperCase());

        const logData = {
            userId,
            action,
            description,
            ipAddress: context.ipAddress || 'unknown',
            ipLocal: context.ipLocal || 'unknown',
            timestamp: new Date().toISOString()
        };

        const hash = this.calculateHash(logData, prevHash);

        return new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO activity_history 
                 (userId, action, description, ipAddress, ipLocal, event_id, hash, prev_hash) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, action, description, logData.ipAddress, logData.ipLocal, eventId, hash, prevHash],
                (err) => {
                    if (err) {
                        console.error('[Compliance] Log insertion failed:', err.message);
                        reject(err);
                    } else {
                        resolve({ eventId, hash });
                    }
                }
            );
        });
    }

    /**
     * Check if a file is on Legal Hold
     */
    static async isOnLegalHold(filePath) {
        return new Promise((resolve) => {
            db.query(
                'SELECT legal_hold FROM files_compliance WHERE filePath = ? LIMIT 1',
                [filePath],
                (err, rows) => {
                    if (err || rows.length === 0) resolve(false);
                    else resolve(rows[0].legal_hold === 1);
                }
            );
        });
    }

    /**
     * Set Legal Hold status for a file
     */
    static async setLegalHold(filePath, status, userId) {
        return new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO files_compliance (filePath, legal_hold, userId) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE legal_hold = ?, userId = ?`,
                [filePath, status ? 1 : 0, userId, status ? 1 : 0, userId],
                (err) => {
                    if (err) reject(err);
                    else {
                        this.logSecureActivity(userId, 'LEGAL_HOLD', `${status ? 'Activated' : 'Deactivated'} legal hold for ${filePath}`, { ipAddress: 'SYSTEM' });
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Run Retention Policy Cleanup
     */
    static async runRetentionCleanup() {
        console.log('[COMPLIANCE] Running retention cleanup...');

        // Get retention settings
        const getSetting = (key) => new Promise(r => {
            db.query('SELECT value_text FROM compliance_settings WHERE key_name = ?', [key], (e, rows) => {
                r(rows && rows.length > 0 ? rows[0].value_text : null);
            });
        });

        const logDays = await getSetting('retention_days_logs') || 90;
        const threatDays = await getSetting('retention_days_threats') || 365;

        // Cleanup logs (never delete if prev_hash is null? No, just delete old ones)
        // Note: Hash chain will be broken if we delete middle parts, unless we use "Aggregated Chaining" or "Block Chaining"
        // But standard retention usually allows pruning old blocks.

        db.query(`DELETE FROM activity_history WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)`, [logDays]);
        db.query(`DELETE FROM threat_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`, [threatDays]);

        console.log('[COMPLIANCE] Retention cleanup completed.');
    }
}

module.exports = ComplianceService;
