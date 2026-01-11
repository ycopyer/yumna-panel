const os = require('os');
const si = require('systeminformation');

class StatsService {
    static async getPulse() {
        try {
            const cpuLoad = await si.currentLoad();
            const mem = await si.mem();
            const uptime = os.uptime();
            const loadAvg = os.loadavg();

            return {
                cpu: {
                    percentage: Math.round(cpuLoad.currentLoad * 100) / 100,
                    loadAvg: loadAvg,
                    cores: os.cpus().length,
                    model: os.cpus()[0].model
                },
                memory: {
                    total: mem.total,
                    free: mem.available,
                    used: mem.total - mem.available,
                    percentage: Math.round(((mem.total - mem.available) / mem.total) * 10000) / 100
                },
                uptime: uptime,
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                network: (await si.networkStats()).reduce((acc, curr) => ({
                    rx: acc.rx + curr.rx_bytes,
                    tx: acc.tx + curr.tx_bytes,
                    rx_sec: acc.rx_sec + curr.rx_sec,
                    tx_sec: acc.tx_sec + curr.tx_sec
                }), { rx: 0, tx: 0, rx_sec: 0, tx_sec: 0 }),
                storage: (await si.fsSize()).find(f => f.mount === '/' || f.mount === 'C:') || { size: 0, used: 0 },
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[AGENT] Stats error:', error.message);
            throw error;
        }
    }
}

module.exports = StatsService;
