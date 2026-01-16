const WebSocket = require('ws');
const StatsService = require('./StatsService');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class TunnelClientService {
    constructor() {
        this.ws = null;
        this.reconnectTimeout = null;
        this.isConnected = false;
        this.config = {};
        this.shellSessions = new Map(); // shellId -> process
        this.uploadStreams = new Map(); // uploadId -> { stream, path }
    }

    start() {
        if (process.env.CONNECTION_MODE !== 'tunnel') {
            console.log('[TUNNEL] Disabled (Mode: direct)');
            return;
        }

        const whmUrl = process.env.MASTER_URL || process.env.WHM_URL || 'http://localhost:4000';
        // If it already starts with ws/wss, use as is, otherwise convert http to ws
        let tunnelUrl = whmUrl;
        if (!tunnelUrl.startsWith('ws')) {
            tunnelUrl = whmUrl.replace(/^http/, 'ws');
        }

        // Ensure it ends with /tunnel
        if (!tunnelUrl.endsWith('/tunnel')) {
            tunnelUrl = tunnelUrl.replace(/\/$/, '') + '/tunnel';
        }

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
        if (payload.type === 'FILE_ACTION') this.handleFileAction(payload);
    }

    async executeCommand(payload) {
        const { requestId, data } = payload;
        const cmd = data.command || (data.service === 'shell' ? data.cmd : null);
        let { cwd, root } = data;

        if (cmd) {
            const baseDir = cwd || root || process.cwd();

            // Handle 'cd' for stateless persistence
            if (cmd.trim().startsWith('cd ')) {
                const targetDir = cmd.trim().substring(3).trim();
                const newPath = path.resolve(baseDir, targetDir);

                // Jail enforcement
                if (root && !newPath.startsWith(path.resolve(root))) {
                    return this.sendResponse(requestId, {
                        output: `cd: ${targetDir}: Access denied (Jailed to ${root})`,
                        exitCode: 1,
                        cwd: baseDir
                    });
                }

                try {
                    const stats = await fsPromises.stat(newPath);
                    if (stats.isDirectory()) {
                        return this.sendResponse(requestId, { output: '', stdout: '', stderr: '', exitCode: 0, cwd: newPath });
                    }
                } catch (e) {
                    return this.sendResponse(requestId, { output: `cd: ${targetDir}: No such directory`, exitCode: 1, cwd: baseDir });
                }
            }

            const finalCwd = (root && !baseDir.startsWith(path.resolve(root))) ? path.resolve(root) : baseDir;

            exec(cmd, { cwd: finalCwd }, (error, stdout, stderr) => {
                this.sendResponse(requestId, {
                    output: stdout || stderr || '',
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: error ? error.code : 0,
                    cwd: finalCwd
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

        this.sendError(requestId, 'Unknown command service or missing command data');
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

    async handleFileAction({ requestId, data }) {
        const { action, root, path: relPath } = data;
        const FileService = require('./FileService');

        try {
            let result = null;

            switch (action) {
                case 'ls':
                    result = await FileService.list(root, relPath);
                    break;
                case 'read':
                    result = await FileService.readFile(root, relPath);
                    break;
                case 'write':
                    result = await FileService.writeFile(root, relPath, data.content);
                    break;
                case 'mkdir':
                    result = await FileService.mkdir(root, relPath, true);
                    break;
                case 'delete':
                    result = await FileService.delete(root, relPath, data.recursive);
                    break;
                case 'rename':
                    result = await FileService.rename(root, data.oldPath, data.newPath);
                    break;
                case 'chmod':
                    result = await FileService.chmod(root, relPath, data.mode);
                    break;
                case 'copy':
                    result = await FileService.copy(root, data.sourcePath, data.destPath);
                    break;
                case 'stat':
                    result = await FileService.stat(root, relPath);
                    break;
                case 'touch':
                    result = await FileService.touch(root, relPath);
                    break;
                case 'symlink':
                    result = await FileService.symlink(root, relPath, data.target);
                    break;
                case 'exists':
                    result = await FileService.exists(root, relPath);
                    break;
                case 'zip':
                    result = await FileService.zip(root, relPath, data.files, data.archiveName);
                    break;
                case 'unzip':
                    result = await FileService.unzip(root, relPath, data.destination);
                    break;
                case 'tar':
                    result = await FileService.tar(root, relPath, data.files, data.archiveName, data.compress);
                    break;
                case 'untar':
                    result = await FileService.untar(root, relPath, data.destination);
                    break;
                case 'gzip':
                    result = await FileService.gzip(root, relPath);
                    break;
                case 'gunzip':
                    result = await FileService.gunzip(root, relPath);
                    break;
                case 'search':
                    result = await FileService.search(root, relPath, data.pattern, data.maxDepth);
                    break;
                case 'grep':
                    result = await FileService.grep(root, relPath, data.query, data.recursive, data.ignoreCase);
                    break;
                case 'du':
                    result = await FileService.du(root, relPath);
                    break;
                case 'file_type':
                    result = await FileService.fileType(root, relPath);
                    break;
                case 'checksum':
                    result = await FileService.checksum(root, relPath, data.algorithm);
                    break;
                case 'download_chunked':
                    const stream = FileService.createReadStream(root, relPath);
                    stream.on('data', (chunk) => {
                        if (!this.isConnected) { stream.destroy(); return; }
                        this.ws.send(JSON.stringify({
                            type: 'FILE_CHUNK',
                            requestId,
                            data: chunk.toString('base64'),
                            isLast: false
                        }));
                    });
                    stream.on('end', () => {
                        if (!this.isConnected) return;
                        this.ws.send(JSON.stringify({ type: 'FILE_CHUNK', requestId, data: '', isLast: true }));
                    });
                    stream.on('error', (err) => this.sendError(requestId, err.message));
                    return;
                case 'upload_chunk':
                    const { uploadId, index, name } = data;
                    const fullPath = FileService.resolveSafePath(root, relPath);
                    const filePath = path.join(fullPath, name);
                    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
                    const chunkBuffer = Buffer.from(data.data, 'base64');
                    if (parseInt(index) === 0) {
                        await fsPromises.writeFile(filePath, chunkBuffer);
                    } else {
                        await fsPromises.appendFile(filePath, chunkBuffer);
                    }
                    result = { success: true, uploadId, index };
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }

            this.sendResponse(requestId, result);
        } catch (err) {
            this.sendError(requestId, err.message);
        }
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
