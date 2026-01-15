const pool = require('../config/db');
const { decrypt } = require('../utils/helpers');
const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs').promises;
const agentDispatcher = require('./AgentDispatcherService');
const archiver = require('archiver');
const os = require('os');
const fsSync = require('fs');

class AgentUpgradeService {
    constructor() {
        this.status = {};
    }

    async upgrade(serverId, req) {
        if (this.status[serverId] === 'upgrading') {
            throw new Error('Upgrade already in progress for this server');
        }

        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        const server = rows[0];

        this.status[serverId] = 'upgrading';

        // Run upgrade in background
        this.runUpgrade(server, req).catch(err => {
            console.error(`[UPGRADE] Critical failure for server ${server.name}:`, err.message);
            this.status[serverId] = 'failed';
        });

        return { message: 'Upgrade process started in background' };
    }

    async runUpgrade(server, req) {
        const serverId = server.id;
        try {
            console.log(`[UPGRADE] Starting full sync for ${server.name}...`);

            // 1. Prepare Zip of Agent Source
            const zipPath = path.join(os.tmpdir(), `agent_update_${serverId}.zip`);
            await this.createAgentZip(zipPath);

            const target = await agentDispatcher.resolveTarget(req, { serverId });
            if (!target) throw new Error('Could not resolve agent target');

            if (target.mode === 'tunnel') {
                await this.upgradeViaTunnel(target, zipPath);
            } else {
                await this.upgradeViaSSH(server, zipPath);
            }

            // Cleanup
            await fs.unlink(zipPath).catch(() => { });

            console.log(`[UPGRADE] ✅ Agent updated successfully on ${server.name}`);
            this.status[serverId] = 'success';

            // Automatic Sync to update version in DB
            setTimeout(async () => {
                const serverNodeService = require('./ServerNodeService');
                if (server.is_local) {
                    await serverNodeService.checkLocalAgent(server);
                } else {
                    await serverNodeService.checkRemote(server);
                }
            }, 5000);

        } catch (error) {
            console.error(`[UPGRADE] ❌ Failed to upgrade ${server.name}:`, error.message);
            this.status[serverId] = 'error: ' + error.message;
        }
    }

    async createAgentZip(zipPath) {
        return new Promise((resolve, reject) => {
            const output = fsSync.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            const agentRoot = path.join(process.cwd(), '..', 'agent');

            // Add files and directories
            archive.directory(path.join(agentRoot, 'src'), 'src');
            archive.file(path.join(agentRoot, 'package.json'), { name: 'package.json' });
            // package-lock.json if exists
            if (fsSync.existsSync(path.join(agentRoot, 'package-lock.json'))) {
                archive.file(path.join(agentRoot, 'package-lock.json'), { name: 'package-lock.json' });
            }

            archive.finalize();
        });
    }

    async upgradeViaTunnel(target, zipPath) {
        console.log(`[UPGRADE] Pushing zip via Tunnel to Agent ${target.agentId}...`);

        const zipBuffer = await fs.readFile(zipPath);
        const zipBase64 = zipBuffer.toString('base64');

        // 1. Write zip file to agent
        await agentDispatcher.dispatchFileAction(target, 'write', {
            path: 'update.zip',
            content: zipBase64,
            encoding: 'base64',
            root: target.root || './'
        });

        // 2. Unzip
        await agentDispatcher.dispatchFileAction(target, 'unzip', {
            path: 'update.zip',
            root: target.root || './'
        });

        // 3. Remove zip
        await agentDispatcher.dispatchFileAction(target, 'delete', {
            path: 'update.zip',
            root: target.root || './'
        });

        // 4. Restart
        try {
            await agentDispatcher.dispatchFileAction(target, 'restart', { service: 'agent' });
        } catch (e) {
            // Fallback exec restart
            const restartCmd = 'npm run restart || pm2 restart yumna-agent || pm2 restart all || sudo systemctl restart yumna-agent || systemctl restart yumna-agent';
            await agentDispatcher.dispatchExec(target, restartCmd).catch(() => { });
        }
    }

    async upgradeViaSSH(server, zipPath) {
        console.log(`[UPGRADE] Pushing code via SSH to ${server.name}...`);
        const ssh = new NodeSSH();
        await ssh.connect({
            host: server.ip,
            username: server.ssh_user,
            password: decrypt(server.ssh_password),
            port: server.ssh_port || 22
        });

        const remoteDir = server.agent_path || '/opt/yumnapanel/agent';
        const remoteZip = path.join(remoteDir, 'update.zip').replace(/\\/g, '/');

        // 1. Upload zip
        await ssh.putFile(zipPath, remoteZip);

        // 2. Unzip and cleanup
        const unzipCmd = `cd ${remoteDir} && unzip -o update.zip && rm update.zip`;
        await ssh.execCommand(unzipCmd);

        // 3. Restart
        const restartCmd = 'npm run restart || pm2 restart yumna-agent || pm2 restart all || sudo systemctl restart yumna-agent || systemctl restart yumna-agent';
        await ssh.execCommand(restartCmd);

        ssh.dispose();
    }

    getUpgradeStatus(serverId) {
        return this.status[serverId] || 'idle';
    }
}

module.exports = new AgentUpgradeService();
