const WebSocket = require('ws');
const StatsService = require('./StatsService');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

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
        if (payload.type === 'FILE_ACTION') this.handleFileAction(payload);
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

    async handleFileAction({ requestId, data }) {
        const { action, root, path: relPath, content, recursive, oldPath, newPath } = data;

        // Basic resolution (Security: Production should implement Jail/Chroot check)
        // Assume root is safe (provided by Master)
        const resolvePath = (p) => path.resolve(root, (p || '').replace(/^\//, ''));
        const targetPath = resolvePath(relPath);

        try {
            let result = null;

            if (action === 'ls') {
                const items = await fsPromises.readdir(targetPath, { withFileTypes: true });
                result = await Promise.all(items.map(async (item) => {
                    const itemPath = path.join(targetPath, item.name);
                    let stats;
                    try { stats = await fsPromises.stat(itemPath); } catch { return null; } // Skip broken links
                    if (!stats) return null;

                    return {
                        name: item.name,
                        type: item.isDirectory() ? 'directory' : 'file',
                        size: stats.size,
                        mtime: Math.floor(stats.mtimeMs / 1000),
                        permissions: stats.mode // Send raw mode, frontend can parse
                    };
                }));
                result = result.filter(x => x); // filter nulls
            }
            else if (action === 'read') {
                result = await fsPromises.readFile(targetPath, 'utf8');
            }
            else if (action === 'write') {
                await fsPromises.writeFile(targetPath, content); // Auto creates file
                result = { success: true };
            }
            else if (action === 'mkdir') {
                await fsPromises.mkdir(targetPath, { recursive: true });
                result = { success: true };
            }
            else if (action === 'delete') {
                await fsPromises.rm(targetPath, { recursive, force: true });
                result = { success: true };
            }
            else if (action === 'rename') {
                const p1 = resolvePath(oldPath);
                const p2 = resolvePath(newPath);
                await fsPromises.rename(p1, p2);
                result = { success: true };
            }
            else if (action === 'download_chunked') {
                // Download Stream Logic
                const stream = fs.createReadStream(targetPath, { highWaterMark: 64 * 1024 }); // 64KB chunks

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
                    this.ws.send(JSON.stringify({
                        type: 'FILE_CHUNK',
                        requestId,
                        data: '',
                        isLast: true
                    }));
                });

                stream.on('error', (err) => {
                    this.sendError(requestId, err.message);
                });
                return; // Response handled by stream events
            }
            else if (action === 'upload_chunk') {
                // Upload Stream Logic
                const { uploadId, index, totalChunks, name } = data;
                const filePath = path.join(targetPath, name);

                // Ensure directory exists
                await fsPromises.mkdir(path.dirname(filePath), { recursive: true });

                // Decode chunk data
                const chunkBuffer = Buffer.from(data.data, 'base64');

                // First chunk: create/overwrite, subsequent: append
                if (index === 0) {
                    await fsPromises.writeFile(filePath, chunkBuffer);
                } else {
                    await fsPromises.appendFile(filePath, chunkBuffer);
                }

                // Send acknowledgment
                this.sendResponse(requestId, {
                    success: true,
                    uploadId,
                    index,
                    received: true
                });
                return;
            }
            else if (action === 'chmod') {
                // Change file permissions (Unix-like systems)
                const { mode } = data; // mode should be octal string like '0755' or number
                const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
                await fsPromises.chmod(targetPath, numericMode);
                result = { success: true, mode: numericMode };
            }
            else if (action === 'chown') {
                // Change file ownership (Unix-like systems only)
                const { uid, gid } = data;
                if (process.platform !== 'win32') {
                    await fsPromises.chown(targetPath, uid, gid);
                    result = { success: true, uid, gid };
                } else {
                    throw new Error('chown not supported on Windows');
                }
            }
            else if (action === 'copy') {
                // Copy file or directory
                const destPath = resolvePath(data.destPath);
                await fsPromises.mkdir(path.dirname(destPath), { recursive: true });

                const stats = await fsPromises.stat(targetPath);
                if (stats.isDirectory()) {
                    // Recursive directory copy
                    await this.copyDirectory(targetPath, destPath);
                } else {
                    await fsPromises.copyFile(targetPath, destPath);
                }
                result = { success: true, destination: destPath };
            }
            else if (action === 'stat') {
                // Get detailed file statistics
                const stats = await fsPromises.stat(targetPath);
                result = {
                    size: stats.size,
                    mode: stats.mode,
                    uid: stats.uid,
                    gid: stats.gid,
                    atime: stats.atimeMs,
                    mtime: stats.mtimeMs,
                    ctime: stats.ctimeMs,
                    birthtime: stats.birthtimeMs,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    isSymbolicLink: stats.isSymbolicLink()
                };
            }
            else if (action === 'touch') {
                // Create empty file or update timestamp
                try {
                    await fsPromises.access(targetPath);
                    // File exists, update timestamp
                    const now = new Date();
                    await fsPromises.utimes(targetPath, now, now);
                } catch {
                    // File doesn't exist, create it
                    await fsPromises.writeFile(targetPath, '');
                }
                result = { success: true };
            }
            else if (action === 'symlink') {
                // Create symbolic link
                const { target: linkTarget } = data;
                await fsPromises.symlink(linkTarget, targetPath);
                result = { success: true, target: linkTarget };
            }
            else if (action === 'readlink') {
                // Read symbolic link target
                const linkTarget = await fsPromises.readlink(targetPath);
                result = { target: linkTarget };
            }
            else if (action === 'exists') {
                // Check if file/directory exists
                try {
                    await fsPromises.access(targetPath);
                    result = { exists: true };
                } catch {
                    result = { exists: false };
                }
            }

            this.sendResponse(requestId, result);
        } catch (err) {
            this.sendError(requestId, err.message);
        }
    }

    async copyDirectory(src, dest) {
        // Recursive directory copy helper
        await fsPromises.mkdir(dest, { recursive: true });
        const entries = await fsPromises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fsPromises.copyFile(srcPath, destPath);
            }
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
