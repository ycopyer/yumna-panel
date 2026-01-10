const si = require('systeminformation');
const pool = require('../config/db');
const os = require('os');
const AlertService = require('./AlertService');

class ResourceMonitoringService {
    static async start() {
        console.log('[MONITORING] Starting Resource Monitoring Service...');

        // Every 1 minute: Collect and Save Stats
        setInterval(() => this.collectStats(), 60000);

        // Initial collection
        this.collectStats();
    }

    static async collectStats() {
        try {
            // 1. System-wide stats
            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const fs = await si.fsSize();

            const disk = fs.find(f => f.mount === '/' || f.mount === 'C:') || fs[0];

            await pool.promise().query(
                'INSERT INTO system_monitoring (cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?)',
                [cpu.currentLoad, (mem.active / mem.total) * 100, disk.use]
            );

            // 2. Website-specific stats (simulated for now based on global stats)
            // In a real panel, we'd use process IDs or Nginx/Apache status logs
            const [websites] = await pool.promise().query('SELECT id, domain FROM websites');

            for (const site of websites) {
                // Generate slightly varied metrics per site for visual richness
                const siteCpu = (cpu.currentLoad / (websites.length || 1)) * (0.5 + Math.random());
                const siteRam = Math.floor((mem.active / (websites.length || 1)) * (0.5 + Math.random()) / 1024 / 1024); // in MB

                // Bandwidth simulation (random bytes)
                const bwIn = Math.floor(Math.random() * 1000 * 1024);
                const bwOut = Math.floor(Math.random() * 5000 * 1024);

                await pool.promise().query(
                    'INSERT INTO website_monitoring (website_id, cpu_usage, ram_usage, bandwidth_in, bandwidth_out) VALUES (?, ?, ?, ?, ?)',
                    [site.id, Math.min(siteCpu, 100), siteRam, bwIn, bwOut]
                );
            }

            // 3. Alert Checks
            const realtime = await this.getRealtime();
            await AlertService.checkThresholds(realtime);

            // 4. Cleanup old stats (keep only 7 days)
            await pool.promise().query('DELETE FROM system_monitoring WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY)');
            await pool.promise().query('DELETE FROM website_monitoring WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY)');

        } catch (error) {
            console.error('[MONITORING] Stats collection failed:', error.message);
        }
    }

    static async getRealtime() {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const fs = await si.fsSize();
        const disk = fs.find(f => f.mount === '/' || f.mount === 'C:') || fs[0];

        return {
            cpu: {
                current: cpu.currentLoad,
                cores: cpu.cpus.map(c => c.load)
            },
            memory: {
                total: mem.total,
                active: mem.active,
                usedPercent: (mem.active / mem.total) * 100
            },
            disk: {
                total: disk.size,
                used: disk.used,
                percent: disk.use
            },
            uptime: os.uptime(),
            platform: os.platform()
        };
    }

    static async getHistory(websiteId = null, hours = 24) {
        if (websiteId) {
            const [rows] = await pool.promise().query(
                'SELECT * FROM website_monitoring WHERE website_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY timestamp ASC',
                [websiteId, hours]
            );
            return rows;
        } else {
            const [rows] = await pool.promise().query(
                'SELECT * FROM system_monitoring WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY timestamp ASC',
                [hours]
            );
            return rows;
        }
    }

    static async getMySQLStats() {
        try {
            const [rows] = await pool.promise().query('SHOW GLOBAL STATUS WHERE Variable_name IN ("Threads_connected", "Threads_running", "Questions", "Slow_queries")');
            const stats = {};
            rows.forEach(r => stats[r.Variable_name] = r.Value);
            return stats;
        } catch (e) {
            return null;
        }
    }
}

module.exports = ResourceMonitoringService;
