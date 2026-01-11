const pool = require('../config/db');
const si = require('systeminformation');
const os = require('os');
const net = require('net');
const { NodeSSH } = require('node-ssh');
const { decrypt } = require('../utils/helpers');

class ServerNodeService {
    static async start() {
        console.log('[SERVER-NODES] Starting Heartbeat Service...');
        // Every 5 minutes
        setInterval(() => this.checkNodes(), 300000);
        // Run immediately after a short delay to let DB settle
        setTimeout(() => this.checkNodes(), 5000);
    }

    static async checkNodes() {
        try {
            const [servers] = await pool.promise().query('SELECT * FROM servers');
            for (const server of servers) {
                if (server.is_local) {
                    await this.checkLocal(server);
                } else {
                    await this.checkRemote(server);
                }
            }
        } catch (error) {
            console.error('[SERVER-NODES] Heartbeat check failed:', error.message);
        }
    }

    static async checkLocal(server) {
        try {
            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const fs = await si.fsSize();
            const disk = fs.find(f => f.mount === '/' || f.mount === 'C:') || fs[0];

            await pool.promise().query(
                `UPDATE servers SET 
                 status = 'active', 
                 last_seen = NOW(), 
                 cpu_usage = ?, 
                 ram_usage = ?, 
                 disk_usage = ?, 
                 uptime = ? 
                 WHERE id = ?`,
                [
                    cpu.currentLoad,
                    ((mem.total - mem.available) / mem.total) * 100,
                    disk ? disk.use : 0,
                    os.uptime(),
                    server.id
                ]
            );
        } catch (e) {
            console.error(`[SERVER-NODES] Failed to check local node: ${e.message}`);
        }
    }

    static async checkRemote(server) {
        if (!server.ssh_user || !server.ssh_password) {
            // Fallback to simple ping if no SSH credentials
            return this.checkRemotePing(server);
        }

        const ssh = new NodeSSH();
        try {
            await ssh.connect({
                host: server.ip,
                username: server.ssh_user,
                password: decrypt(server.ssh_password),
                port: server.ssh_port || 22,
                readyTimeout: 10000
            });

            // Command to get CPU, RAM, Disk, Uptime in one go (Linux compatible)
            // 1. Uptime (seconds)
            // 2. CPU Idle from top (inverse is usage)
            // 3. RAM Free/Total
            // 4. Disk Usage / 

            // Note: Parsing top output differs by version. vmstat might be better.
            // Let's use a composite command.

            // CPU: vmstat 1 2 | tail -1 | awk '{print $15}' (this is idle time)
            // RAM: free -m | grep Mem | awk '{print $2,$3}' (total, used)
            // Disk: df -h / | tail -1 | awk '{print $5}' (percentage)
            // Uptime: cat /proc/uptime | awk '{print $1}'

            const cmd = `
                cpu_idle=$(vmstat 1 2 | tail -1 | awk '{print $15}')
                mem_stats=$(free -m | grep Mem | awk '{print $2,$3}')
                disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
                uptime_val=$(cat /proc/uptime | awk '{print $1}')
                echo "$cpu_idle|$mem_stats|$disk_usage|$uptime_val"
            `;

            const result = await ssh.execCommand(cmd);

            if (result.stderr) {
                // If complex command fails, might be non-standard shell, fallback to ping or partial
                console.warn(`[SERVER-NODES] Remote script stderr for ${server.name}: ${result.stderr}`);
            }

            const [cpuIdle, memTotal, memUsed, diskUsage, uptime] = result.stdout.trim().split(/[\s|]+/);

            const cpuUsage = 100 - parseFloat(cpuIdle || 100);
            const ramUsage = (parseFloat(memUsed || 0) / parseFloat(memTotal || 1)) * 100;

            await pool.promise().query(
                `UPDATE servers SET 
                 status = 'active', 
                 last_seen = NOW(), 
                 cpu_usage = ?, 
                 ram_usage = ?, 
                 disk_usage = ?, 
                 uptime = ? 
                 WHERE id = ?`,
                [
                    isNaN(cpuUsage) ? 0 : cpuUsage,
                    isNaN(ramUsage) ? 0 : ramUsage,
                    parseFloat(diskUsage) || 0,
                    parseFloat(uptime) || 0,
                    server.id
                ]
            );

        } catch (e) {
            console.error(`[SERVER-NODES] SSH Check failed for ${server.name}: ${e.message}`);
            // Fallback to ping just to see if it's at least online
            await this.checkRemotePing(server);
        } finally {
            ssh.dispose();
        }
    }

    static async checkRemotePing(server) {
        const isOnline = await this.pingPort(server.ip, server.ssh_port || 22);

        if (isOnline) {
            await pool.promise().query(
                `UPDATE servers SET status = 'active', last_seen = NOW() WHERE id = ?`,
                [server.id]
            );
        } else {
            await pool.promise().query(
                `UPDATE servers SET status = 'offline' WHERE id = ?`,
                [server.id]
            );
        }
    }

    static pingPort(host, port) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(5000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, host);
        });
    }
}

module.exports = ServerNodeService;
