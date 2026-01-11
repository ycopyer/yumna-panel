const pool = require('../config/db');

class FraudGuardService {
    /**
     * Check if an IP address is blacklisted
     */
    async isBlacklisted(ipAddress) {
        try {
            const [rows] = await pool.promise().query(
                'SELECT * FROM ip_blacklist WHERE ipAddress = ? AND (expiresAt IS NULL OR expiresAt > NOW())',
                [ipAddress]
            );
            return rows.length > 0;
        } catch (err) {
            console.error('[FRAUDGUARD] Blacklist check error:', err);
            return false;
        }
    }

    /**
     * Analyze a transaction or action for fraud
     * Simple scoring system
     */
    async analyzeAction(userId, ipAddress, actionType, details = {}) {
        let score = 0;
        let reasons = [];

        // 1. Check IP repeated actions in short time (velocity check)
        const [recentActions] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM activity_history WHERE ipAddress = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
            [ipAddress]
        );
        if (recentActions[0].count > 30) {
            score += 50;
            reasons.push('High velocity of actions from single IP');
        }

        // 2. Check for multiple accounts from same IP
        const [ipAccounts] = await pool.promise().query(
            'SELECT COUNT(DISTINCT userId) as count FROM activity_history WHERE ipAddress = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [ipAddress]
        );
        if (ipAccounts[0].count > 3) {
            score += 30;
            reasons.push('Multiple user accounts detected on this IP');
        }

        // 3. Action specific checks
        if (actionType === 'order') {
            const [orders] = await pool.promise().query(
                'SELECT COUNT(*) as count FROM billing_orders WHERE userId = ? AND status = "pending" AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
                [userId]
            );
            if (orders[0].count > 5) {
                score += 40;
                reasons.push('Excessive pending orders in short period');
            }
        }

        // Log the check
        if (score > 0) {
            await pool.promise().query(
                'INSERT INTO fraud_check_logs (userId, ipAddress, score, reason) VALUES (?, ?, ?, ?)',
                [userId, ipAddress, score, reasons.join(', ')]
            );
        }

        // If score is high, auto-blacklist (threshold > 80)
        if (score >= 100) {
            await this.blacklistIp(ipAddress, 'Auto-detected fraud: ' + reasons.join('; '));
        }

        return { score, reasons, isSafe: score < 70 };
    }

    async blacklistIp(ipAddress, reason, durationHours = 24) {
        console.warn(`[FRAUDGUARD] Blacklisting IP ${ipAddress} for ${durationHours}h. Reason: ${reason}`);
        await pool.promise().query(
            'INSERT INTO ip_blacklist (ipAddress, reason, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR)) ON DUPLICATE KEY UPDATE reason = VALUES(reason), expiresAt = VALUES(expiresAt)',
            [ipAddress, reason, durationHours]
        );
    }
}

module.exports = new FraudGuardService();
