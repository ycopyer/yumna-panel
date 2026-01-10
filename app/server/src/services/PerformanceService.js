const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const pool = require('../config/db');

class PerformanceService {
    static async getRecommendations() {
        const recommendations = [];

        // 1. PHP Analysis
        try {
            const { stdout: phpIni } = await execPromise('php -i');
            const memoryLimit = phpIni.match(/memory_limit => (.*) =>/);
            const uploadLimit = phpIni.match(/upload_max_filesize => (.*) =>/);

            if (memoryLimit && parseInt(memoryLimit[1]) < 128) {
                recommendations.push({
                    category: 'PHP',
                    title: 'Low PHP Memory Limit',
                    message: `Your current PHP memory limit is ${memoryLimit[1]}. Consider increasing it to at least 128M for modern CMS like WordPress.`,
                    priority: 'medium'
                });
            }
        } catch (e) { }

        // 2. MySQL Analysis
        try {
            const [mysqlStatus] = await pool.promise().query('SHOW GLOBAL STATUS WHERE Variable_name IN ("Slow_queries", "Max_used_connections", "Threads_connected")');
            const stats = {};
            mysqlStatus.forEach(r => stats[r.Variable_name] = parseInt(r.Value));

            if (stats.Slow_queries > 100) {
                recommendations.push({
                    category: 'MySQL',
                    title: 'Database Bottleneck',
                    message: 'A high number of slow queries detected. Consider indexing frequent table columns or enabling query caching.',
                    priority: 'high'
                });
            }
        } catch (e) { }

        // 3. Disk Analysis
        try {
            const { stdout: df } = await execPromise('df -h /');
            const lines = df.split('\n');
            if (lines[1]) {
                const parts = lines[1].trim().split(/\s+/);
                const percent = parseInt(parts[4]);
                if (percent > 85) {
                    recommendations.push({
                        category: 'Storage',
                        title: 'Disk Nearly Full',
                        message: `Your system drive is ${percent}% full. Old logs and temporary files in /tmp should be cleared soon.`,
                        priority: 'critical'
                    });
                }
            }
        } catch (e) { }

        // 4. Security / Performance Mix
        recommendations.push({
            category: 'System',
            title: 'Enable Object Caching',
            message: 'Installing Redis or Memcached can significantly reduce database load and improve website response times by up to 40%.',
            priority: 'low'
        });

        return recommendations;
    }

    static async getPerformanceScore() {
        const recs = await this.getRecommendations();
        let score = 100;
        recs.forEach(r => {
            if (r.priority === 'critical') score -= 25;
            if (r.priority === 'high') score -= 15;
            if (r.priority === 'medium') score -= 10;
        });
        return Math.max(score, 10);
    }
}

module.exports = PerformanceService;
