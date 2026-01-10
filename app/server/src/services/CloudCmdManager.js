const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class CloudCmdManager {
    constructor() {
        this.instances = new Map(); // userId -> { port, process, lastAccess }
        this.basePort = 7000;

        // Cleanup inactive instances every 30 mins
        setInterval(() => this.cleanup(), 30 * 60 * 1000);
    }

    async getInstance(userId, rootPath) {
        // Check if instance exists
        if (this.instances.has(userId)) {
            const instance = this.instances.get(userId);
            if (this.isProcessRunning(instance.process)) {
                instance.lastAccess = Date.now();
                return instance.port;
            } else {
                this.instances.delete(userId);
            }
        }

        return await this.startInstance(userId, rootPath);
    }

    async startInstance(userId, rootPath) {
        const port = this.basePort + parseInt(userId);

        // Ensure root path exists
        if (!fs.existsSync(rootPath)) {
            try {
                fs.mkdirSync(rootPath, { recursive: true });
            } catch (e) {
                console.error(`[CloudCmd] Failed to create root: ${rootPath}`, e);
            }
        }

        console.log(`[CloudCmd] Starting instance for user ${userId} on port ${port} at ${rootPath}`);

        // Resolve executable path
        // In local dev: node_modules/.bin/cloudcmd.cmd
        // We assume we are in src/services
        const binPath = path.resolve(__dirname, '../../node_modules/.bin/cloudcmd.cmd');

        // Check if bin exists, fallback to 'npx' if not
        let cmd = binPath;
        let args = [
            '--port', port.toString(),
            '--root', rootPath,
            '--prefix', '/api/file-manager', // Critical for proxying
            '--no-auth', // We handle auth via proxy
            '--no-console', // Disable console for safety? User might need it.
            '--no-terminal', // Disable terminal if requested. Keep enabled for now.
            '--one-file-panel' // Corrected argument
        ];

        if (!fs.existsSync(binPath)) {
            console.log('[CloudCmd] binary not found at node_modules, trying npx');
            cmd = 'npx.cmd'; // Windows specific
            args = ['cloudcmd', ...args];
        }

        return new Promise((resolve, reject) => {
            const proc = spawn(cmd, args, {
                cwd: process.cwd(),
                shell: true,
                windowsHide: true,
                env: { ...process.env, PORT: port.toString() }
            });

            let started = false;

            // Timeout safety
            const timeout = setTimeout(() => {
                if (!started) {
                    const msg = `[CloudCmd] User ${userId} instance timed out after 15s`;
                    console.error(msg);
                    if (!proc.killed) proc.kill();
                    this.instances.delete(userId);
                    reject(new Error(msg));
                }
            }, 15000);

            proc.stdout.on('data', (data) => {
                const output = data.toString();
                // console.log(`[CloudCmd:${userId}]`, output);

                // CloudCmd logs url: http://... on success
                // Or sometimes just starts.
                if (output.includes('url: http://') || output.includes('Cloud Commander')) {
                    if (!started) {
                        started = true;
                        clearTimeout(timeout);
                        this.instances.set(userId, {
                            port,
                            process: proc,
                            lastAccess: Date.now()
                        });
                        resolve(port);
                    }
                }
            });

            proc.stderr.on('data', (data) => {
                const errData = data.toString();
                // console.error(`[CloudCmd:${userId} ERR]`, errData);
                // Don't reject on stderr unless it's a fatal error or we assume exit event handles it
            });

            proc.on('exit', (code) => {
                if (!started) {
                    clearTimeout(timeout);
                    const msg = `[CloudCmd] Process exited proactively with code ${code}`;
                    console.error(msg);
                    this.instances.delete(userId);
                    reject(new Error(msg));
                } else {
                    console.log(`[CloudCmd:${userId}] Exited with code ${code}`);
                    this.instances.delete(userId);
                }
            });

            proc.on('error', (err) => {
                if (!started) {
                    clearTimeout(timeout);
                    console.error(`[CloudCmd] Warning: Failed to spawn process`, err);
                    reject(err);
                }
            });
        });
    }

    isProcessRunning(proc) {
        return proc && !proc.killed && proc.exitCode === null;
    }

    cleanup() {
        const now = Date.now();
        const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour

        for (const [userId, instance] of this.instances) {
            if (now - instance.lastAccess > IDLE_TIMEOUT) {
                console.log(`[CloudCmd] Killing idle instance for user ${userId}`);
                if (instance.process) instance.process.kill();
                this.instances.delete(userId);
            }
        }
    }
}

module.exports = new CloudCmdManager();
