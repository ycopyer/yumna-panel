const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class SpamFilterService {
    /**
     * Get spam filter settings for a domain
     */
    static async getSettings(domainId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query(
                'SELECT spam_enabled, spam_score, spam_marking_method FROM email_domains WHERE id = ?',
                [domainId]
            );
            if (rows.length === 0) throw new Error('Domain not found');
            return rows[0];
        } finally {
            await connection.end();
        }
    }

    /**
     * Update spam filter settings
     */
    static async updateSettings(domainId, settings) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const { enabled, score, method } = settings;
            await connection.query(
                `UPDATE email_domains 
                 SET spam_enabled = ?, spam_score = ?, spam_marking_method = ? 
                 WHERE id = ?`,
                [enabled ? 1 : 0, score || 5.0, method || 'subject', domainId]
            );
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get global spam statistics (placeholder for SpamAssassin/Amavis integration)
     */
    static async getGlobalStats() {
        return {
            scanned_today: 1245,
            blocked_today: 342,
            avg_score: 3.2,
            top_targets: ['info@example.com', 'admin@example.net']
        };
    }
}

module.exports = SpamFilterService;
