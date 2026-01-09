const os = require('os');
const { exec } = require('child_process');

/**
 * SystemStatsService
 * Handles real-time resource monitoring
 */

const getCpuUsage = () => {
    return new Promise((resolve) => {
        const cpus = os.cpus();
        let totalIdle = 0, totalTick = 0;
        cpus.forEach(cpu => {
            for (type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        // This logic requires two samples to calculate delta.
        // For a simple GET, we'll return a calculated load average or mock for Windows.
        if (os.platform() === 'win32') {
            exec('wmic cpu get loadpercentage', (err, stdout) => {
                const match = stdout.match(/\d+/);
                resolve(match ? parseInt(match[0]) : 0);
            });
        } else {
            const load = os.loadavg();
            resolve(Math.round((load[0] / os.cpus().length) * 100));
        }
    });
};

const getMemoryUsage = () => {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
        total,
        free,
        used,
        percent: Math.round((used / total) * 100)
    };
};

const getDiskUsage = () => {
    return new Promise((resolve) => {
        const isWin = os.platform() === 'win32';
        const cmd = isWin ? 'wmic logicaldisk get size,freespace,caption' : 'df -k /';

        exec(cmd, (err, stdout) => {
            if (isWin) {
                // Parse C: drive specifically for demo
                const lines = stdout.split('\n');
                const cLine = lines.find(l => l.includes('C:'));
                if (cLine) {
                    const parts = cLine.trim().split(/\s+/);
                    const free = parseInt(parts[1]);
                    const total = parseInt(parts[2]);
                    const used = total - free;
                    return resolve({ total, used, free, percent: Math.round((used / total) * 100) });
                }
            } else {
                const lines = stdout.split('\n');
                const parts = lines[1].trim().split(/\s+/);
                const total = parseInt(parts[1]) * 1024;
                const used = parseInt(parts[2]) * 1024;
                const free = parseInt(parts[3]) * 1024;
                return resolve({ total, used, free, percent: parseInt(parts[4]) });
            }
            resolve({ total: 0, used: 0, free: 0, percent: 0 });
        });
    });
};

module.exports = {
    getCpuUsage,
    getMemoryUsage,
    getDiskUsage,
    getUptime: () => os.uptime()
};
