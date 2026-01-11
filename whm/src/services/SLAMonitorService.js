const pool = require('../config/db');

class SLAMonitorService {
    /**
     * Track server uptime and log SLA violations
     */
    async checkSLA() {
        try {
            const [servers] = await pool.promise().query('SELECT * FROM servers WHERE status = "active"');

            for (const server of servers) {
                const lastPulse = new Date(server.lastPulse);
                const diffMinutes = (new Date() - lastPulse) / 60000;

                if (diffMinutes > 5) {
                    console.warn(`[SLA] Server ${server.name} (IP: ${server.ipAddress}) is unresponsive for ${Math.round(diffMinutes)} mins.`);
                    // Logic to store SLA violation
                    await pool.promise().query(
                        'INSERT INTO activity_history (userId, action, details) VALUES (1, "SLA_VIOLATION", ?)',
                        [`Server ${server.name} is unresponsive. Possible downtime detected.`]
                    );
                }
            }
        } catch (err) {
            console.error('[SLA] Monitor task error:', err);
        }
    }

    start() {
        // Run every 10 minutes
        setInterval(() => this.checkSLA(), 600000);
        console.log('[SLA] Service started');
    }
}

module.exports = new SLAMonitorService();
