const WebSocket = require('ws');
const StatsService = require('./StatsService');
const { exec, spawn } = require('child_process');

class TunnelClientService {
    constructor() {
        this.ws = null;
        this.reconnectTimeout = null;
        this.isConnected = false;
        this.isConnected = false;
        this.config = {};
        this.shellSessions = new Map(); // shellId -> process
    }

    start() {
        if (process.env.CONNECTION_MODE !== 'tunnel') {
            console.log('[TUNNEL] Disabled (Mode: direct)');
            return;
        }

        const whmUrl = process.env.WHM_URL || 'http://localhost:4000';
        // Replace http/https with ws/wss and append /tunnel
        const tunnelUrl = whmUrl.replace(/^http/, 'ws') + '/tunnel';

        this.config = {
            url: tunnelUrl,
            agentId: process.env.AGENT_ID,
            agentSecret: process.env.AGENT_SECRET
        };

        if (!this.config.agentId || !this.config.agentSecret) {
            console.error('[TUNNEL] Missing AGENT_ID or AGENT_SECRET in .env');
            return;
        }

        console.log(`[TUNNEL] Starting Tunnel Client connecting to ${this.config.url}...`);
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.config.url, {
            headers: {
                'x-agent-id': this.config.agentId,
                'x-agent-secret': this.config.agentSecret
            }
        });

        this.ws.on('open', () => {
            console.log('[TUNNEL] Connected to Master Node');
            this.isConnected = true;
            this.startHeartbeat();
        });

        this.ws.on('message', (data) => {
            try {
                const payload = JSON.parse(data);
                this.handleMessage(payload);
            } catch (e) {
                console.error('[TUNNEL] Invalid message:', e.message);
            }
        });

        this.ws.on('close', () => {
            console.log('[TUNNEL] Disconnected. Reconnecting in 5s...');
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error('[TUNNEL] Error:', err.message);
        });
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    }

    handleMessage(payload) {
        // payload: { requestId, type, data }
        if (payload.type === 'HANDSHAKE_ACK') {
            console.log('[TUNNEL] Handshake confirmed by Master');
            return;
        }

        if (payload.type === 'EXEC_COMMAND') {
            this.executeCommand(payload);
        }

        if (payload.type === 'START_SHELL') this.startShell(payload);
        if (payload.type === 'SHELL_INPUT') this.inputShell(payload);
        if (payload.type === 'KILL_SHELL') this.killShell(payload);
    }

    async executeCommand(payload) {
        const { requestId, data } = payload;
        // data: { cmd }
        // Very basic implementation: Execute shell command
        // SECURITY WARNING: This allows remote root execution. Only Master should send this.

        if (data.service === 'shell' && data.cmd) {
            exec(data.cmd, (error, stdout, stderr) => {
                this.sendResponse(requestId, {
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: error ? error.code : 0
                });
            });
            return;
        }

        if (data.service === 'stats') {
            try {
                const stats = await StatsService.getPulse();
                this.sendResponse(requestId, stats);
            } catch (e) {
                this.sendError(requestId, e.message);
            }
            return;
        }

        this.sendError(requestId, 'Unknown command service');
    }

    startShell({ requestId, data }) {
        const shellId = data.shellId || requestId;
        // Detect shell: PowerShell on Windows, bash on Linux
        const shellCmd = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

        console.log(`[TUNNEL] Spawning shell [${shellId}]: ${shellCmd}`);

        try {
            const p = spawn(shellCmd, [], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.shellSessions.set(shellId, p);

            p.stdout.on('data', (chunk) => {
                this.sendShellData(shellId, 'stdout', chunk);
            });

            p.stderr.on('data', (chunk) => {
                this.sendShellData(shellId, 'stderr', chunk);
            });

            p.on('close', (code) => {
                console.log(`[TUNNEL] Shell [${shellId}] exited with code ${code}`);
                if (this.ws && this.isConnected) {
                    this.ws.send(JSON.stringify({
                        type: 'SHELL_EXIT',
                        shellId,
                        code
                    }));
                }
                this.shellSessions.delete(shellId);
            });

            p.on('error', (err) => {
                this.sendError(requestId, `Failed to spawn shell: ${err.message}`);
            });

            this.sendResponse(requestId, { shellId, status: 'started' });
        } catch (e) {
            this.sendError(requestId, `Exception spawning shell: ${e.message}`);
        }
    }

    inputShell({ data }) { // data: { shellId, input (base64) }
        const p = this.shellSessions.get(data.shellId);
        if (p && data.input) {
            try {
                const buf = Buffer.from(data.input, 'base64');
                p.stdin.write(buf);
            } catch (e) {
                console.error(`[TUNNEL] Input error for ${data.shellId}:`, e);
            }
        }
    }

    killShell({ data }) {
        const p = this.shellSessions.get(data.shellId);
        if (p) {
            p.kill();
            this.shellSessions.delete(data.shellId);
            console.log(`[TUNNEL] Killed shell [${data.shellId}]`);
        }
    }

    sendShellData(shellId, stream, buffer) {
        if (!this.ws || !this.isConnected) return;
        this.ws.send(JSON.stringify({
            type: 'SHELL_OUTPUT',
            shellId,
            stream,
            data: buffer.toString('base64')
        }));
    }

    sendResponse(requestId, data) {
        if (!this.ws || !this.isConnected) return;
        this.ws.send(JSON.stringify({
            requestId,
            status: 'success',
            data,
            error: null
        }));
    }

    sendError(requestId, errorMessage) {
        if (!this.ws || !this.isConnected) return;
        this.ws.send(JSON.stringify({
            requestId,
            status: 'error',
            data: null,
            error: errorMessage
        }));
    }

    startHeartbeat() {
        // Send heartbeat every 30s
        setInterval(async () => {
            if (!this.isConnected) return;
            try {
                const stats = await StatsService.getPulse();
                this.ws.send(JSON.stringify({
                    type: 'HEARTBEAT',
                    data: {
                        cpu: stats.cpu.percentage,
                        ram: stats.memory.percentage, // used percent
                        disk: stats.storage.use,
                        uptime: stats.uptime,
                        timestamp: Date.now()
                    }
                }));
            } catch (e) {
                console.error('[TUNNEL] Heartbeat failed:', e.message);
            }
        }, 30000);
    }
}

module.exports = new TunnelClientService();
