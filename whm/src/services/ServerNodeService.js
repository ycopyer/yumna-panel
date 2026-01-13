const pool = require('../config/db');
const { decrypt } = require('../utils/helpers');
const axios = require('axios');
// Note: Agent communication will happen via HTTP or Socket, not SSH directly in v3 usually.
// But keeping SSH logic for "legacy" remote nodes for now, or non-agent nodes.
const { NodeSSH } = require('node-ssh');
const net = require('net');

class ServerNodeService {
    constructor() {
        console.log('[SERVER-NODES] Service Initialized');
    }

    async start() {
        console.log('[SERVER-NODES] Starting Heartbeat Service...');
        // Every 5 minutes
        setInterval(() => this.checkNodes(), 300000);
        // Run immediately after a short delay to let DB settle
        setTimeout(() => this.checkNodes(), 5000);
    }

    async checkNodes() {
        try {
            const [servers] = await pool.promise().query('SELECT * FROM servers');
            for (const server of servers) {
                if (server.is_local) {
                    await this.checkLocalAgent(server);
                } else {
                    await this.checkRemote(server);
                }
            }
        } catch (error) {
            console.error('[SERVER-NODES] Heartbeat check failed:', error.message);
        }
    }

    async checkLocalAgent(server) {
        // In v3, "Local" means communicating with the local Agent on port 4001
        try {
            // Call Agent API
            const agentUrl = process.env.AGENT_URL || 'http://localhost:4001';
            const agentSecret = process.env.AGENT_SECRET || 'insecure_default';

            const response = await axios.get(`${agentUrl}/heartbeat`, {
                timeout: 3000,
                headers: { 'X-Agent-Secret': agentSecret }
            });
            const { metrics, status } = response.data;

            if (status === 'online') {
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
                        metrics.cpu_load || 0,
                        ((metrics.mem_used / metrics.mem_total) * 100) || 0,
                        metrics.storage?.use || 0,
                        metrics.uptime || 0,
                        server.id
                    ]
                );

                // Record Historical Usage
                await pool.promise().query(
                    `INSERT INTO usage_metrics (serverId, cpu_load, ram_used, ram_total, disk_used, disk_total, net_rx, net_tx)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        server.id,
                        metrics.cpu_load,
                        metrics.mem_used,
                        metrics.mem_total,
                        metrics.storage?.used || 0,
                        metrics.storage?.size || 0,
                        metrics.network?.rx || 0,
                        metrics.network?.tx || 0
                    ]
                );

                console.log(`[SERVER-NODES] Local Agent ${server.hostname} OK.`);
            }
        } catch (e) {
            console.error(`[SERVER-NODES] Failed to contact Local Agent: ${e.message}`);
            await pool.promise().query(
                `UPDATE servers SET status = 'connection_error' WHERE id = ?`,
                [server.id]
            );
        }
    }

    async checkRemote(server) {
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

            // Also check if Agent Port (4001) is open
            const isAgentRunning = await this.pingPort(server.ip, 4001);

            const [cpuIdle, memTotal, memUsed, diskUsage, uptime] = result.stdout.trim().split(/[\s|]+/);

            const cpuUsage = 100 - parseFloat(cpuIdle || 100);
            const ramUsage = (parseFloat(memUsed || 0) / parseFloat(memTotal || 1)) * 100;

            await pool.promise().query(
                `UPDATE servers SET 
                 status = ?, 
                 last_seen = NOW(), 
                 cpu_usage = ?, 
                 ram_usage = ?, 
                 disk_usage = ?, 
                 uptime = ? 
                 WHERE id = ?`,
                [
                    isAgentRunning ? 'active' : 'online', // 'active' means Agent is likely there, 'online' just OS
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

    async checkRemotePing(server) {
        const isOnline = await this.pingPort(server.ip, server.ssh_port || 22);

        if (isOnline) {
            await pool.promise().query(
                `UPDATE servers SET status = 'online', last_seen = NOW() WHERE id = ?`,
                [server.id]
            );
        } else {
            await pool.promise().query(
                `UPDATE servers SET status = 'offline' WHERE id = ?`,
                [server.id]
            );
        }
    }

    pingPort(host, port) {
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

module.exports = new ServerNodeService();
