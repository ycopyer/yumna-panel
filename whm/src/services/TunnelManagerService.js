const WebSocket = require('ws');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TunnelManagerService {
    constructor() {
        this.wss = null;
        this.activeTunnels = new Map(); // Map<agentId, WebSocket>
        this.pendingRequests = new Map(); // Map<requestId, {resolve, reject, timeout}>
        this.shellBuffers = new Map(); // shellId -> Array<{stream, data}>
    }

    /**
     * Initialize WebSocket Server attached to existing HTTP Server
     * @param {Object} server - HTTP Server instance
     */
    initialize(server) {
        this.wss = new WebSocket.Server({ noServer: true });

        server.on('upgrade', (request, socket, head) => {
            const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

            if (pathname === '/tunnel') {
                this.handleUpgrade(request, socket, head);
            } else {
                // Allow other websocket handlers if any, or destroy
                // socket.destroy(); // Don't allow for now to keep it strict
            }
        });

        this.wss.on('connection', (ws, req, agentId) => {
            this.handleConnection(ws, agentId);
        });

        console.log('[TUNNEL] Service Initialized. Listening for upgrades on /tunnel');
    }

    async handleUpgrade(request, socket, head) {
        const agentId = request.headers['x-agent-id'];
        const agentSecret = request.headers['x-agent-secret'];

        if (!agentId || !agentSecret) {
            console.warn('[TUNNEL] Connection rejected: Missing credentials');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            // Verify credentials against DB
            const [rows] = await pool.promise().query(
                'SELECT id, name, status FROM servers WHERE agent_id = ? AND agentSecret = ?',
                [agentId, agentSecret]
            );

            if (rows.length === 0) {
                console.warn(`[TUNNEL] Connection rejected: Invalid credentials for AgentID ${agentId}`);
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            const server = rows[0];
            if (server.status === 'suspended') {
                console.warn(`[TUNNEL] Connection rejected: Server ${server.name} is suspended`);
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            // Accept connection
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request, agentId);
            });

        } catch (err) {
            console.error('[TUNNEL] DB Error during handshake:', err);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    }

    handleConnection(ws, agentId) {
        console.log(`[TUNNEL] Agent connected: ${agentId}`);
        this.activeTunnels.set(agentId, ws);

        // Update Server Status
        pool.promise().query('UPDATE servers SET status = "active", last_seen = NOW(), connection_type = "tunnel" WHERE agent_id = ?', [agentId])
            .catch(e => console.error('[TUNNEL] Failed to update status:', e.message));

        ws.on('message', (message) => {
            try {
                const payload = JSON.parse(message);
                this.handleMessage(agentId, payload);
            } catch (e) {
                console.error(`[TUNNEL] Invalid JSON from ${agentId}:`, e.message);
            }
        });

        ws.on('close', () => {
            console.log(`[TUNNEL] Agent disconnected: ${agentId}`);
            this.activeTunnels.delete(agentId);
        });

        ws.on('error', (err) => {
            console.error(`[TUNNEL] Error on ${agentId}:`, err.message);
        });

        // Send initial handshake ack
        ws.send(JSON.stringify({ type: 'HANDSHAKE_ACK', status: 'connected' }));
    }

    handleMessage(agentId, payload) {
        // payload format: { requestId, type, data, error }

        // 1. Is it a response to a request?
        if (payload.requestId && this.pendingRequests.has(payload.requestId)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(payload.requestId);
            clearTimeout(timeout);
            this.pendingRequests.delete(payload.requestId);

            if (payload.error) {
                reject(new Error(payload.error));
            } else {
                resolve(payload.data);
            }
            return;
        }

        // 2. Is it a heartbeat push?
        // 2. Is it a heartbeat push?
        if (payload.type === 'HEARTBEAT') {
            this.handleHeartbeat(agentId, payload.data);
            return;
        }

        // 3. Shell Output
        if (payload.type === 'SHELL_OUTPUT') {
            this.handleShellOutput(agentId, payload);
            return;
        }

        if (payload.type === 'SHELL_EXIT') {
            // Maybe notify frontend or close buffer
            this.handleShellOutput(agentId, { ...payload, stream: 'system', data: btoa(`Exited with code ${payload.code}`) });
            return;
        }
    }

    handleShellOutput(agentId, { shellId, stream, data }) {
        if (!this.shellBuffers.has(shellId)) {
            this.shellBuffers.set(shellId, []);
        }

        // Data comes as base64 from agent
        this.shellBuffers.get(shellId).push({ stream, data, timestamp: Date.now() });

        // Limit buffer size to prevent memory leaks
        const buf = this.shellBuffers.get(shellId);
        if (buf.length > 2000) buf.shift(); // overflow
    }

    /**
     * Consume buffered output for a shell session
     */
    consumeShellBuffer(shellId) {
        if (!this.shellBuffers.has(shellId)) return [];
        const data = this.shellBuffers.get(shellId);
        this.shellBuffers.set(shellId, []); // clear
        return data;
    }

    async handleHeartbeat(agentId, data) {
        // data: { cpu, ram, disk, uptime ... }
        try {
            // Basic metrics update
            const cpu = parseFloat(data.cpu) || 0;
            const ram = parseFloat(data.ram) || 0;

            await pool.promise().query(
                'UPDATE servers SET cpu_usage = ?, ram_usage = ?, last_seen = NOW() WHERE agent_id = ?',
                [cpu, ram, agentId]
            );
        } catch (e) {
            //  console.error('[TUNNEL] Heartbeat update failed:', e.message);
        }
    }

    /**
     * Send a command to a tunnelled agent and wait for response
     */
    sendCommand(agentId, type, data = {}) {
        return new Promise((resolve, reject) => {
            const ws = this.activeTunnels.get(agentId);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                return reject(new Error(`Tunnel not active for Agent ${agentId}`));
            }

            const requestId = uuidv4();
            const payload = JSON.stringify({
                requestId,
                type,
                data,
                timestamp: Date.now()
            });

            // Set timeout 10s
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Tunnel request timed out'));
                }
            }, 10000);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            ws.send(payload, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(requestId);
                    reject(err);
                }
            });
        });
    }
}

module.exports = new TunnelManagerService();
