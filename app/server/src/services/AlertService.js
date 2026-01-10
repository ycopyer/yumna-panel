const pool = require('../config/db');

class AlertService {
    /**
     * Check current system stats against configured thresholds in the DB
     */
    static async checkThresholds(stats) {
        try {
            const [configs] = await pool.promise().query('SELECT * FROM alert_configs WHERE enabled = TRUE');

            for (const config of configs) {
                let currentValue = 0;
                let message = '';

                if (config.metric === 'cpu') currentValue = stats.cpu.current;
                else if (config.metric === 'ram') currentValue = stats.memory.usedPercent;
                else if (config.metric === 'disk') currentValue = stats.disk.percent;

                if (currentValue > config.threshold) {
                    message = `Threshold exceeded: ${config.metric.toUpperCase()} is at ${currentValue.toFixed(1)}% (Limit: ${config.threshold}%)`;

                    // Check if an active alert for this metric already exists to prevent spam
                    const [existing] = await pool.promise().query(
                        'SELECT id FROM alert_history WHERE metric = ? AND status = "active" AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
                        [config.metric]
                    );

                    if (existing.length === 0) {
                        await pool.promise().query(
                            'INSERT INTO alert_history (metric, value, threshold, message, severity) VALUES (?, ?, ?, ?, ?)',
                            [config.metric, currentValue, config.threshold, message, config.severity]
                        );
                        console.log(`[ALERT] Triggered ${config.severity}: ${message}`);
                    }
                } else {
                    // Auto-resolve if it falls below threshold
                    await pool.promise().query(
                        'UPDATE alert_history SET status = "resolved" WHERE metric = ? AND status = "active"',
                        [config.metric]
                    );
                }
            }
        } catch (error) {
            console.error('[ALERT] Background check failed:', error.message);
        }
    }

    static async getActiveAlerts() {
        const [rows] = await pool.promise().query('SELECT * FROM alert_history WHERE status = "active" ORDER BY timestamp DESC');
        return rows;
    }

    static async getAlertConfigs() {
        const [rows] = await pool.promise().query('SELECT * FROM alert_configs');
        return rows;
    }

    static async updateConfig(metric, threshold, enabled, severity) {
        await pool.promise().query(
            'UPDATE alert_configs SET threshold = ?, enabled = ?, severity = ? WHERE metric = ?',
            [threshold, enabled, severity, metric]
        );
        return true;
    }

    static async dismissAlert(id) {
        await pool.promise().query('UPDATE alert_history SET status = "resolved" WHERE id = ?', [id]);
        return true;
    }
}

module.exports = AlertService;
