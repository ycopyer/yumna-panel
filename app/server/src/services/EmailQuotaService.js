const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class EmailQuotaService {
    /**
     * Get quota usage for all email accounts in a domain
     */
    static async getDomainQuotaUsage(domainId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [accounts] = await connection.query(
                `SELECT id, username, quota_bytes, used_bytes, 
                 ROUND((used_bytes / quota_bytes) * 100, 2) as usage_percent
                 FROM email_accounts 
                 WHERE domainId = ?
                 ORDER BY usage_percent DESC`,
                [domainId]
            );

            return accounts;
        } finally {
            await connection.end();
        }
    }

    /**
     * Update used bytes for an email account
     * In production, this would be called by mail server hooks
     */
    static async updateQuotaUsage(accountId, usedBytes) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'UPDATE email_accounts SET used_bytes = ? WHERE id = ?',
                [usedBytes, accountId]
            );

            // Check if quota exceeded
            const [account] = await connection.query(
                'SELECT username, quota_bytes, used_bytes FROM email_accounts WHERE id = ?',
                [accountId]
            );

            if (account.length > 0) {
                const acc = account[0];
                const usagePercent = (acc.used_bytes / acc.quota_bytes) * 100;

                return {
                    success: true,
                    username: acc.username,
                    usagePercent,
                    quotaExceeded: usagePercent >= 100,
                    warning: usagePercent >= 90
                };
            }

            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get accounts that are near or over quota
     */
    static async getQuotaAlerts(userId = null, threshold = 90) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            let query = `
                SELECT 
                    ea.id,
                    ea.username,
                    ed.domain,
                    ea.quota_bytes,
                    ea.used_bytes,
                    ROUND((ea.used_bytes / ea.quota_bytes) * 100, 2) as usage_percent
                FROM email_accounts ea
                JOIN email_domains ed ON ea.domainId = ed.id
                WHERE (ea.used_bytes / ea.quota_bytes) * 100 >= ?
            `;

            const params = [threshold];

            if (userId) {
                query += ' AND ed.userId = ?';
                params.push(userId);
            }

            query += ' ORDER BY usage_percent DESC';

            const [alerts] = await connection.query(query, params);
            return alerts;
        } finally {
            await connection.end();
        }
    }

    /**
     * Update quota for an email account
     */
    static async updateQuota(accountId, quotaMB) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const quotaBytes = quotaMB * 1024 * 1024;

            await connection.query(
                'UPDATE email_accounts SET quota_bytes = ? WHERE id = ?',
                [quotaBytes, accountId]
            );

            return { success: true, quota_mb: quotaMB };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get total quota statistics for a domain
     */
    static async getDomainQuotaStats(domainId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [stats] = await connection.query(
                `SELECT 
                    COUNT(*) as total_accounts,
                    SUM(quota_bytes) as total_quota,
                    SUM(used_bytes) as total_used,
                    ROUND((SUM(used_bytes) / SUM(quota_bytes)) * 100, 2) as overall_usage_percent,
                    COUNT(CASE WHEN (used_bytes / quota_bytes) >= 0.9 THEN 1 END) as accounts_near_quota
                FROM email_accounts
                WHERE domainId = ?`,
                [domainId]
            );

            return stats[0] || {
                total_accounts: 0,
                total_quota: 0,
                total_used: 0,
                overall_usage_percent: 0,
                accounts_near_quota: 0
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Simulate quota usage (for testing)
     * In production, this would be updated by mail server
     */
    static async simulateUsage(accountId, percentageUsed) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [account] = await connection.query(
                'SELECT quota_bytes FROM email_accounts WHERE id = ?',
                [accountId]
            );

            if (account.length > 0) {
                const usedBytes = Math.floor(account[0].quota_bytes * (percentageUsed / 100));
                return await this.updateQuotaUsage(accountId, usedBytes);
            }

            return { success: false, error: 'Account not found' };
        } finally {
            await connection.end();
        }
    }
}

module.exports = EmailQuotaService;
