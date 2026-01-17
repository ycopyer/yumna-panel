const pool = require('../config/db');
const tunnelManager = require('./TunnelManagerService');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { NodeSSH } = require('node-ssh');
const { decrypt } = require('../utils/helpers');

class AgentDispatcherService {
    constructor() {
        this.AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';
    }

    /**
     * Resolve target agent and root path based on user intent
     */
    async resolveTarget(req, { path: targetPath, websiteId, serverId }) {
        const isAdmin = req.userRole === 'admin';
        let target = null;

        // 1. Resolve by Website ID
        if (websiteId) {
            const [rows] = await pool.promise().query(
                `SELECT w.rootPath, s.ip, s.is_local, s.connection_type, s.agent_id, s.agentSecret, s.ssh_user, s.ssh_password, s.ssh_port 
                 FROM websites w JOIN servers s ON w.serverId = s.id 
                 WHERE w.id = ? ${isAdmin ? '' : 'AND w.userId = ?'}`,
                isAdmin ? [websiteId] : [websiteId, req.userId]
            );
            if (rows.length > 0) {
                const website = rows[0];
                target = {
                    mode: website.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                    agentId: website.agent_id,
                    agentUrl: website.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${website.ip}:4001`,
                    agentSecret: website.agentSecret || this.AGENT_SECRET,
                    root: website.rootPath,
                    path: targetPath || '/',
                    ssh: {
                        user: website.ssh_user,
                        password: decrypt(website.ssh_password),
                        port: website.ssh_port || 22
                    }
                };
            }
        }

        // 2. Resolve by Server ID (Admin Only)
        if (!target && serverId) {
            if (!isAdmin) throw new Error('Admin privileges required for direct server access');
            const [rows] = await pool.promise().query('SELECT agent_id, connection_type, ip, is_local, agentSecret, ssh_user, ssh_password, ssh_port FROM servers WHERE id = ?', [serverId]);
            if (rows.length > 0) {
                const server = rows[0];
                target = {
                    mode: server.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                    agentId: server.agent_id,
                    agentUrl: server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`,
                    agentSecret: server.agentSecret || this.AGENT_SECRET,
                    root: '', // Server root usually means system root
                    path: targetPath || '/',
                    ssh: {
                        user: server.ssh_user,
                        password: decrypt(server.ssh_password),
                        port: server.ssh_port || 22
                    }
                };
            }
        }

        // 3. Resolve by Path (Virtual or Direct)
        if (!target && targetPath) {
            const websiteMatch = targetPath.match(/^\/websites\/([^\/]+)(.*)/);
            if (websiteMatch) {
                const domain = websiteMatch[1];
                const subPath = websiteMatch[2] || '/';

                let query = 'SELECT w.rootPath, s.ip, s.is_local, s.connection_type, s.agent_id, s.agentSecret, s.ssh_user, s.ssh_password, s.ssh_port FROM websites w JOIN servers s ON w.serverId = s.id WHERE w.domain = ?';
                let params = [domain];

                if (!isAdmin) {
                    query += ' AND w.userId = ?';
                    params.push(req.userId);
                }

                const [rows] = await pool.promise().query(query, params);
                if (rows.length > 0) {
                    const website = rows[0];
                    target = {
                        mode: website.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                        agentId: website.agent_id,
                        agentUrl: website.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${website.ip}:4001`,
                        agentSecret: website.agentSecret || this.AGENT_SECRET,
                        root: website.rootPath,
                        path: subPath,
                        ssh: {
                            user: website.ssh_user,
                            password: decrypt(website.ssh_password),
                            port: website.ssh_port || 22
                        }
                    };
                }
            }
        }

        // 3.5 Resolve by Absolute Path (Smart Routing for known Website rootPaths)
        if (!target && targetPath && (targetPath.startsWith('/') || targetPath.match(/^[a-zA-Z]:/))) {
            let query = `
                SELECT w.rootPath, s.ip, s.is_local, s.connection_type, s.agent_id, s.agentSecret, s.ssh_user, s.ssh_password, s.ssh_port 
                FROM websites w 
                JOIN servers s ON w.serverId = s.id
            `;
            let params = [];

            if (!isAdmin) {
                query += ' WHERE w.userId = ?';
                params.push(req.userId);
            }

            const [allWebsites] = await pool.promise().query(query, params);

            // Find the best matching website (longest rootPath that is a prefix of targetPath)
            let bestMatch = null;
            for (const website of allWebsites) {
                const wsRoot = website.rootPath;
                if (targetPath === wsRoot || targetPath.startsWith(wsRoot + (wsRoot.endsWith('/') ? '' : '/'))) {
                    if (!bestMatch || wsRoot.length > bestMatch.rootPath.length) {
                        bestMatch = website;
                    }
                }
            }

            if (bestMatch) {
                const subPath = targetPath.substring(bestMatch.rootPath.length) || '/';
                target = {
                    mode: bestMatch.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                    agentId: bestMatch.agent_id,
                    agentUrl: bestMatch.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${bestMatch.ip}:4001`,
                    agentSecret: bestMatch.agentSecret || this.AGENT_SECRET,
                    root: bestMatch.rootPath,
                    path: subPath.startsWith('/') ? subPath : '/' + subPath,
                    ssh: {
                        user: bestMatch.ssh_user,
                        password: decrypt(bestMatch.ssh_password),
                        port: bestMatch.ssh_port || 22
                    }
                };
            }
        }

        // 4. Default fallback to Master Node / User Root
        if (!target) {
            const [userRows] = await pool.promise().query('SELECT username FROM users WHERE id = ?', [req.userId]);
            const username = userRows[0]?.username || 'unknown';

            let root = '';
            if (req.userRole === 'admin') {
                root = process.platform === 'win32' ? 'C:/YumnaPanel' : '/var/lib/yumnapanel';
            } else {
                const [configRows] = await pool.promise().query('SELECT rootPath FROM sftp_configs WHERE userId = ?', [req.userId]);
                if (configRows.length > 0 && configRows[0].rootPath) {
                    root = configRows[0].rootPath;
                } else {
                    root = process.platform === 'win32' ? `C:/YumnaPanel/users/${username}` : `/home/${username}/files`;
                }
            }

            target = {
                mode: 'direct',
                agentId: 'master',
                agentUrl: process.env.AGENT_URL || 'http://localhost:4001',
                root,
                path: targetPath || '/'
            };
        }

        // Final check on agentUrl for localhost/127.0.0.1
        if (target && target.agentUrl && (target.agentUrl.includes('localhost') || target.agentUrl.includes('127.0.0.1'))) {
            target.agentUrl = process.env.AGENT_URL || 'http://localhost:4001';
            target.mode = 'direct';
        }

        if (target) {
            console.log(`[DISPATCHER] Resolved target:`, {
                userId: req.userId,
                path: targetPath,
                mode: target.mode,
                agentId: target.agentId,
                url: target.agentUrl,
                root: target.root
            });
        } else {
            console.warn(`[DISPATCHER] Failed to resolve target for ${req.userId} path ${targetPath}`);
        }

        return target;
    }

    /**
     * Dispatch File Action
     */
    async dispatchFileAction(target, action, payload = {}) {
        if (target.mode === 'tunnel') {
            return await tunnelManager.sendCommand(target.agentId, 'FILE_ACTION', {
                action,
                root: target.root,
                path: target.path,
                ...payload
            });
        } else {
            const client = axios.create({
                baseURL: target.agentUrl,
                headers: { 'X-Agent-Secret': target.agentSecret || this.AGENT_SECRET },
                timeout: 15000
            });
            // Try to map action to FS endpoint
            const endpointMap = {
                'ls': '/fs/ls',
                'read': '/fs/read',
                'write': '/fs/write',
                'mkdir': '/fs/mkdir',
                'delete': '/fs/delete',
                'rename': '/fs/rename',
                'chmod': '/fs/chmod',
                'copy': '/fs/copy',
                'stat': '/fs/stat',
                'touch': '/fs/touch',
                'symlink': '/fs/symlink',
                'exists': '/fs/exists',
                'zip': '/fs/zip',
                'unzip': '/fs/unzip',
                'tar': '/fs/tar',
                'untar': '/fs/untar',
                'gzip': '/fs/gzip',
                'gunzip': '/fs/gunzip',
                'search': '/fs/search',
                'grep': '/fs/grep',
                'du': '/fs/du',
                'file_type': '/fs/file-type',
                'checksum': '/fs/checksum',
                'upload_init': '/fs/upload/init',
                'upload_chunk': '/fs/upload/chunk',
                'upload_complete': '/fs/upload/complete',
                'restart': '/system/restart'
            };

            const endpoint = endpointMap[action];
            if (!endpoint) throw new Error(`Direct action not mapped: ${action}`);

            const method = ['ls', 'read', 'stat', 'exists', 'search', 'grep', 'du', 'file_type', 'checksum'].includes(action) ? 'GET' : 'POST';

            if (method === 'GET') {
                try {
                    const response = await client.get(endpoint, { params: { root: target.root, path: target.path, ...payload } });
                    return response.data;
                } catch (err) {
                    // Try SSH Fallback if HTTP fails with 401 or 500
                    if ((err.response?.status === 401 || err.response?.status === 500 || err.code === 'ECONNREFUSED') && target.ssh && target.ssh.user) {
                        console.warn(`[DISPATCHER] Agent HTTP failed, attempting SSH fallback for ${action}...`);
                        try {
                            return await this.executeViaSshSftp(target, action, payload);
                        } catch (sshErr) {
                            console.error(`[DISPATCHER] SSH fallback failed: ${sshErr.message}`);
                            // Throw original error to not confuse user too much if fallback fails
                            throw err;
                        }
                    }

                    console.error(`[DISPATCHER] Agent GET error at ${target.agentUrl}${endpoint}:`, {
                        status: err.response?.status,
                        data: err.response?.data,
                        message: err.message
                    });
                    throw err;
                }
            } else {
                try {
                    const response = await client.post(endpoint, { root: target.root, path: target.path, ...payload });
                    return response.data;
                } catch (err) {
                    console.error(`[DISPATCHER] Agent POST error at ${target.agentUrl}${endpoint}:`, {
                        status: err.response?.status,
                        data: err.response?.data,
                        message: err.message
                    });
                    throw err;
                }
            }
        }
    }

    /**
     * Fallback execution for LS using SSH/SFTP
     */
    async executeViaSshSftp(target, action, payload = {}) {
        if (!target.ssh || !target.ssh.user || !target.ssh.password) {
            throw new Error('SSH credentials not available for fallback');
        }

        const ssh = new NodeSSH();
        try {
            console.log(`[DISPATCHER] SSH connecting to ${target.agentUrl} (IP: ${target.agentUrl.replace('http://', '').replace(':4001', '')})`);
            await ssh.connect({
                host: target.agentUrl.replace('http://', '').replace(':4001', ''),
                username: target.ssh.user,
                password: target.ssh.password,
                port: target.ssh.port,
                readyTimeout: 10000,
                keepaliveInterval: 5000
            });
            console.log(`[DISPATCHER] SSH connected to ${target.agentId}`);

            if (action === 'ls') {
                const sftp = await ssh.requestSFTP();
                const fullPath = (target.root || '') + (target.path === '/' ? '' : target.path);
                console.log(`[DISPATCHER] SFTP listing path: ${fullPath}`);
                const list = await sftp.readdir(fullPath || '/');

                // Format to match Agent response
                return list.map(item => ({
                    name: item.filename,
                    type: item.attrs.isDirectory() ? 'directory' : 'file',
                    size: item.attrs.size,
                    modifyTime: item.attrs.mtime * 1000,
                    accessTime: item.attrs.atime * 1000,
                    mtime: item.attrs.mtime,
                    atime: item.attrs.atime,
                    permissions: item.attrs.mode,
                    uid: item.attrs.uid,
                    gid: item.attrs.gid
                }));
            }

            throw new Error(`Action ${action} not supported via SSH fallback yet`);
        } finally {
            ssh.dispose();
        }
    }

    /**
     * Dispatch Database Action
     */
    async dispatchDbAction(serverId, action, payload = {}) {
        const [rows] = await pool.promise().query('SELECT id, agent_id, connection_type, ip, is_local, agentSecret FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        const server = rows[0];

        if (server.connection_type === 'tunnel') {
            return await tunnelManager.sendCommand(server.agent_id, 'DATABASE_ACTION', {
                action,
                ...payload
            });
        } else {
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const client = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': server.agentSecret || this.AGENT_SECRET },
                timeout: 30000
            });

            const method = ['stats', 'list'].includes(action) ? 'GET' : 'POST';
            const endpoint = `/db/${action}`;

            if (method === 'GET') {
                const res = await client.get(endpoint, { params: payload });
                return res.data;
            } else {
                const res = await client.post(endpoint, payload);
                return res.data;
            }
        }
    }

    /**
     * Dispatch Web Action
     */
    async dispatchWebAction(serverId, action, payload = {}) {
        const [rows] = await pool.promise().query('SELECT id, agent_id, connection_type, ip, is_local, agentSecret FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        const server = rows[0];

        if (server.connection_type === 'tunnel') {
            return await tunnelManager.sendCommand(server.agent_id, 'WEB_ACTION', {
                action,
                ...payload
            });
        } else {
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const client = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': server.agentSecret || this.AGENT_SECRET },
                timeout: 30000
            });

            // Map action to agent HTTP endpoint
            const endpointMap = {
                'create': '/web/vhost',
                'remove': `/web/vhost/${payload.domain}`,
                'maintenance': '/web/maintenance',
                'install': '/web/app/install',
                'config_get': '/web/config',
                'config_set': '/web/config',
                'logs': '/web/logs'
            };

            const endpoint = endpointMap[action];
            const method = ['config_get', 'logs'].includes(action) ? 'GET' : (action === 'remove' ? 'DELETE' : 'POST');

            if (method === 'GET') {
                const res = await client.get(endpoint, { params: payload });
                return res.data;
            } else if (method === 'DELETE') {
                const res = await client.delete(endpoint);
                return res.data;
            } else {
                const res = await client.post(endpoint, payload);
                return res.data;
            }
        }
    }

    /**
     * Dispatch SSL Action
     */
    async dispatchSSLAction(serverId, action, payload = {}) {
        const [rows] = await pool.promise().query('SELECT id, agent_id, connection_type, ip, is_local, agentSecret FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        const server = rows[0];

        if (server.connection_type === 'tunnel') {
            return await tunnelManager.sendCommand(server.agent_id, 'SSL_ACTION', {
                action,
                ...payload
            });
        } else {
            const agentUrl = server.is_local
                ? (process.env.AGENT_URL || 'http://localhost:4001')
                : `http://${server.ip}:4001`;

            const client = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': server.agentSecret || this.AGENT_SECRET },
                timeout: 60000 // SSL might take time
            });

            const endpoint = `/ssl/${action === 'letsencrypt' ? 'letsencrypt' : 'custom'}`;
            const res = await client.post(endpoint, payload);
            return res.data;
        }
    }

    /**
     * Dispatch Execution Command
     */
    async dispatchExec(target, command, options = {}) {
        const payload = {
            command,
            cwd: options.cwd || target.root,
            root: options.isAdmin ? '' : target.root // Only jail non-admins
        };

        if (target.mode === 'tunnel') {
            try {
                return await tunnelManager.sendCommand(target.agentId, 'EXEC_COMMAND', payload);
            } catch (err) {
                console.error(`[DISPATCHER] Tunnel exec error (Agent: ${target.agentId}):`, err.message);
                throw new Error(`Tunnel execution failed: ${err.message}`);
            }
        } else {
            const agentUrl = target.agentUrl || 'http://localhost:4001';
            const client = axios.create({
                baseURL: agentUrl,
                headers: { 'X-Agent-Secret': this.AGENT_SECRET },
                timeout: 15000
            });

            try {
                const response = await client.post('/system/exec', payload);
                return response.data;
            } catch (err) {
                // Fallback to local execution if on Master Node (localhost)
                if (agentUrl.includes('localhost') || agentUrl.includes('127.0.0.1')) {
                    console.log(`[DISPATCHER] Agent unreachable at ${agentUrl}, falling back to local exec for command: ${command}`);
                    const { exec } = require('child_process');
                    return new Promise((resolve, reject) => {
                        const execCwd = options.cwd || target.root || process.cwd();

                        // Enforce Jail (Skip for admins)
                        const finalCwd = (options.isAdmin || !target.root || execCwd.startsWith(target.root)) ? execCwd : target.root;

                        exec(command, { cwd: finalCwd }, (error, stdout, stderr) => {
                            if (error) {
                                resolve({ output: stderr || error.message, success: false, cwd: finalCwd });
                            } else {
                                resolve({ output: stdout || stderr || '', success: true, cwd: finalCwd });
                            }
                        });
                    });
                }
                throw new Error(`Agent execution failed at ${agentUrl}: ${err.message}`);
            }
        }
    }
}

module.exports = new AgentDispatcherService();
