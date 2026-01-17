const net = require('net');
const pool = require('../config/db');
const tunnelManager = require('./TunnelManagerService');
const { v4: uuidv4 } = require('uuid');

class TcpForwarderService {
    constructor() {
        this.servers = new Map(); // masterPort -> net.Server
        this.activeConnections = new Map(); // connectionId -> net.Socket
    }

    async initialize() {
        console.log('[TCP-FORWARD] Initializing Port Forwarding Service...');
        await this.reloadMappings();
    }

    async reloadMappings() {
        try {
            // Stop existing servers
            for (const [port, server] of this.servers) {
                server.close();
            }
            this.servers.clear();

            // Load from DB
            const [rows] = await pool.promise().query(`
                SELECT tm.*, s.agent_id 
                FROM tunnel_mappings tm 
                JOIN servers s ON tm.serverId = s.id 
                WHERE tm.isActive = 1
            `);

            for (const mapping of rows) {
                if (!mapping.agent_id) {
                    console.warn(`[TCP-FORWARD] Skipping mapping ${mapping.id}: Server has no agent_id (not a tunnel server)`);
                    continue;
                }
                this.startForwarder(mapping);
            }
        } catch (err) {
            console.error('[TCP-FORWARD] Initialization failed:', err.message);
        }
    }

    startForwarder(mapping) {
        const { masterPort, agentPort, agent_id, serverId } = mapping;

        const server = net.createServer((socket) => {
            const connectionId = uuidv4();
            console.log(`[TCP-FORWARD] New connection on port ${masterPort} (ID: ${connectionId}) -> Agent ${agent_id}:${agentPort}`);

            // Check if tunnel is active
            if (!tunnelManager.activeTunnels.has(agent_id)) {
                console.warn(`[TCP-FORWARD] Tank rejected: Agent ${agent_id} not connected via tunnel`);
                socket.destroy();
                return;
            }

            this.activeConnections.set(connectionId, socket);

            // Notify Agent to open a local connection
            tunnelManager.sendCommand(agent_id, 'STREAM_OPEN', {
                connectionId,
                port: agentPort
            }).catch(err => {
                console.error(`[TCP-FORWARD] Failed to open stream on agent: ${err.message}`);
                socket.destroy();
                this.activeConnections.delete(connectionId);
            });

            socket.on('data', (chunk) => {
                // Send data chunk to agent
                tunnelManager.sendCommand(agent_id, 'STREAM_DATA', {
                    connectionId,
                    data: chunk.toString('base64')
                }).catch(err => {
                    console.error(`[TCP-FORWARD] Error sending data to agent: ${err.message}`);
                    socket.end();
                });
            });

            socket.on('close', () => {
                console.log(`[TCP-FORWARD] Connection closed locally for ${connectionId}`);
                tunnelManager.sendCommand(agent_id, 'STREAM_CLOSE', { connectionId }).catch(() => { });
                this.activeConnections.delete(connectionId);
            });

            socket.on('error', (err) => {
                console.error(`[TCP-FORWARD] Socket error for ${connectionId}:`, err.message);
                socket.destroy();
            });
        });

        server.on('error', (err) => {
            console.error(`[TCP-FORWARD] Failed to listen on port ${masterPort}:`, err.message);
        });

        server.listen(masterPort, '0.0.0.0', () => {
            console.log(`[TCP-FORWARD] Listening on Master Port ${masterPort} -> Agent ${agent_id}:${agentPort}`);
            this.servers.set(masterPort, server);
        });
    }

    handleAgentStreamData(connectionId, base64Data) {
        const socket = this.activeConnections.get(connectionId);
        if (socket) {
            socket.write(Buffer.from(base64Data, 'base64'));
        }
    }

    handleAgentStreamClose(connectionId) {
        const socket = this.activeConnections.get(connectionId);
        if (socket) {
            socket.end();
            this.activeConnections.delete(connectionId);
        }
    }
}

module.exports = new TcpForwarderService();
