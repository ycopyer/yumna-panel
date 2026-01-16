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
        this.statusHistory = new Map();
        // Every 60 seconds
        setInterval(() => this.checkNodes(), 60000);
        // Run immediately after a short delay
        setTimeout(() => this.checkNodes(), 3000);
    }

    async checkNodes() {
        try {
            const [servers] = await pool.promise().query('SELECT * FROM servers');
            for (const server of servers) {
                const prevStatus = this.statusHistory.get(server.id) || server.status;
                let currentStatus = 'unknown';

                let isOnline = false;
                if (server.is_local) {
                    currentStatus = await this.checkLocalAgent(server);
                    isOnline = (currentStatus === 'active');
                } else if (server.connection_type === 'tunnel') {
                    const tunnelManager = require('./TunnelManagerService');
                    if (tunnelManager.activeTunnels.has(server.agent_id)) {
                        currentStatus = 'active';
                        isOnline = true;
                    } else {
                        currentStatus = await this.checkRemotePing(server);
                        isOnline = (currentStatus === 'online');
                    }
                } else {
                    currentStatus = await this.checkRemote(server);
                    isOnline = (currentStatus === 'active' || currentStatus === 'online');
                }

                // Only update the database if the status has genuinely changed
                // and the server is considered online (reachable).
                // This prevents constant DB writes if status is 'offline' but we keep trying.
                if (currentStatus !== server.status) {
                    // Update database
                    await pool.promise().query('UPDATE servers SET status = ?, last_seen = NOW() WHERE id = ?', [currentStatus, server.id]);
                }

                // Handle Notification on Status Change
                if (currentStatus === 'offline' && prevStatus !== 'offline' && prevStatus !== 'unknown') {
                    const { sendNotification } = require('./notification');
                    sendNotification(`🚨 <b>SERVER DOWN:</b> ${server.name} (${server.ip})\nStatus changed from <i>${prevStatus}</i> to <b>OFFLINE</b>.`);
                } else if (currentStatus === 'active' && prevStatus === 'offline') {
                    const { sendNotification } = require('./notification');
                    sendNotification(`✅ <b>SERVER RECOVERED:</b> ${server.name} (${server.ip})\nServer is back <b>ONLINE</b> and Agent is responding.`);
                }

                this.statusHistory.set(server.id, currentStatus);
            }
        } catch (error) {
            console.error('[SERVER-NODES] Heartbeat check failed:', error.message);
        }
    }

    async checkLocalAgent(server) {
        try {
            const agentUrl = process.env.AGENT_URL || 'http://127.0.0.1:4001';
            const agentSecret = process.env.AGENT_SECRET || 'insecure_default';

            // console.log(`[DEBUG] Heartbeat request to ${agentUrl} with secret ${agentSecret.substring(0, 5)}...`);

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
                     uptime = ?,
                     agent_version = ?
                     WHERE id = ?`,
                    [
                        metrics.cpu_load || 0,
                        metrics.mem_total ? ((metrics.mem_used / metrics.mem_total) * 100) : 0,
                        metrics.storage?.use || 0,
                        metrics.uptime || 0,
                        response.data.version || 'unknown',
                        server.id
                    ]
                );

                // Record Historial Usage
                await pool.promise().query(
                    `INSERT INTO usage_metrics (serverId, cpu_load, ram_used, ram_total, disk_used, disk_total, net_rx, net_tx)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        server.id,
                        metrics.cpu_load || 0,
                        metrics.mem_used || 0,
                        metrics.mem_total || 0,
                        metrics.storage?.used || 0,
                        metrics.storage?.size || 0,
                        metrics.network?.rx || 0,
                        metrics.network?.tx || 0
                    ]
                );
                return 'active';
            }
            return 'unknown';
        } catch (e) {
            console.error(`[SERVER-NODES] Heartbeat Error (${server.name}):`, e.message);
            if (e.response) {
                console.error(`[SERVER-NODES] Agent Response:`, e.response.status, e.response.data);
            }
            // The checkNodes loop will handle the database update if status changes
            return 'connection_error';
        }
    }

    async checkRemote(server) {
        // First, check if the SSH port is open. If not, no point in trying SSH.
        const isSshPortOpen = await this.pingPort(server.ip, server.ssh_port || 22);
        if (!isSshPortOpen) {
            console.log(`[SERVER-NODES] SSH port ${server.ssh_port || 22} not open for ${server.name}. Falling back to ping.`);
            return this.checkRemotePing(server);
        }

        if (!server.ssh_user || !server.ssh_password) {
            console.log(`[SERVER-NODES] SSH credentials missing for ${server.name}. Falling back to ping.`);
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

            const cmd = `
                cpu_idle=$(vmstat 1 2 | tail -1 | awk '{print $15}' || echo "100")
                mem_stats=$(free -m | grep Mem | awk '{print $2,$3}' || echo "0 0")
                disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%' || echo "0")
                disk_stats=$(df -m / | tail -1 | awk '{print $2,$3}')
                uptime_val=$(cat /proc/uptime | awk '{print $1}' || echo "0")
                echo "$cpu_idle|$mem_stats|$disk_usage|$uptime_val|$disk_stats"
            `;

            const result = await ssh.execCommand(cmd);
            console.log(`[SERVER-NODES] Remote ${server.name} raw output:`, result.stdout);

            const isAgentRunning = await this.pingPort(server.ip, 4001);
            let agentVersion = 'unknown';

            if (isAgentRunning) {
                try {
                    const agentSecret = server.agentSecret || process.env.AGENT_SECRET || 'insecure_default';
                    const response = await axios.get(`http://${server.ip}:4001/heartbeat`, {
                        timeout: 2000,
                        headers: { 'X-Agent-Secret': agentSecret }
                    });
                    agentVersion = response.data.version || 'unknown';
                } catch (e) {
                    // Fail silently for version check, we might be on an old agent
                }
            }

            const parts = result.stdout.trim().split(/[\s|]+/);
            const [cpuIdle, memTotal, memUsed, diskPct, uptime, diskTotal, diskUsed] = parts;

            console.log(`[SERVER-NODES] Remote ${server.name} parsed:`, { cpuIdle, memTotal, memUsed, diskPct, uptime, diskTotal, diskUsed });

            const cpuUsage = 100 - parseFloat(cpuIdle || 100);
            const ramUsage = (parseFloat(memUsed || 0) / parseFloat(memTotal || 1)) * 100;

            await pool.promise().query(
                `UPDATE servers SET 
                 status = ?, 
                 last_seen = NOW(), 
                 cpu_usage = ?, 
                 ram_usage = ?, 
                 disk_usage = ?, 
                 uptime = ?,
                 agent_version = ?
                 WHERE id = ?`,
                [
                    isAgentRunning ? 'active' : 'online',
                    isNaN(cpuUsage) ? 0 : cpuUsage,
                    isNaN(ramUsage) ? 0 : ramUsage,
                    parseFloat(diskPct) || 0,
                    parseFloat(uptime) || 0,
                    agentVersion,
                    server.id
                ]
            );

            // Record Historical Usage for Remote too
            try {
                await pool.promise().query(
                    `INSERT INTO usage_metrics (serverId, cpu_load, ram_used, ram_total, disk_used, disk_total)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        server.id,
                        isNaN(cpuUsage) ? 0 : cpuUsage,
                        parseFloat(memUsed || 0) * 1024 * 1024, // Convert MB to Bytes for consistency
                        parseFloat(memTotal || 0) * 1024 * 1024,
                        parseFloat(diskUsed || 0) * 1024 * 1024,
                        parseFloat(diskTotal || 0) * 1024 * 1024
                    ]
                );
                console.log(`[SERVER-NODES] Remote ${server.name} metrics recorded successfully`);
            } catch (metricsErr) {
                console.error(`[SERVER-NODES] Failed to record metrics for ${server.name}:`, metricsErr.message);
            }

            return isAgentRunning ? 'active' : 'online';

        } catch (e) {
            console.error(`[SERVER-NODES] Remote check failed for ${server.name}:`, e.message);
            // The checkNodes loop will handle the database update if status changes
            return this.checkRemotePing(server);
        } finally {
            ssh.dispose();
        }
    }

    async checkRemotePing(server) {
        const isOnline = await this.pingPort(server.ip, server.ssh_port || 22);
        const status = isOnline ? 'online' : 'offline';

        // The checkNodes loop will handle the database update if status changes
        return status;
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
