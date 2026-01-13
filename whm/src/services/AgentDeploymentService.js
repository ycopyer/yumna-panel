const pool = require('../config/db');
const { decrypt } = require('../utils/helpers');
const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

class AgentDeploymentService {
    constructor() {
        this.status = {};
    }

    async deploy(serverId, dbConfig = {}) {
        if (this.status[serverId] === 'deploying') {
            throw new Error('Deployment already in progress for this server');
        }

        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (rows.length === 0) throw new Error('Server not found');
        const server = rows[0];

        if (server.is_local) throw new Error('Cannot deploy agent to local master node (already running)');

        this.status[serverId] = 'deploying';

        // Run deployment in background
        this.runDeployment(server, dbConfig).catch(err => {
            console.error(`[DEPLOY] Critical failure for server ${server.name}:`, err.message);
            this.status[serverId] = 'failed';
            pool.promise().query('UPDATE servers SET status = ? WHERE id = ?', ['deploy_failed', serverId]);
        });

        return { message: 'Deployment started in background' };
    }

    async runDeployment(server, dbConfig = {}) {
        const ssh = new NodeSSH();
        const serverId = server.id;

        try {
            console.log(`[DEPLOY] Connecting to ${server.name} (${server.ip})...`);
            await ssh.connect({
                host: server.ip,
                username: server.ssh_user,
                password: decrypt(server.ssh_password),
                port: server.ssh_port || 22,
                readyTimeout: 30000
            });

            // 0. Detect OS
            const resUname = await ssh.execCommand('uname -s');
            const osName = resUname.stdout.trim().toLowerCase();

            console.log(`[DEPLOY] Detected OS: ${osName}`);

            if (osName === 'linux') {
                const resDistro = await ssh.execCommand('cat /etc/os-release');
                const distro = resDistro.stdout.toLowerCase();
                const isDebian = distro.includes('debian') || distro.includes('ubuntu');
                const isRHEL = distro.includes('rhel') || distro.includes('centos') || distro.includes('fedora') || distro.includes('rocky') || distro.includes('alma');

                console.log(`[DEPLOY] Linux Distro: ${isDebian ? 'Debian/Ubuntu' : isRHEL ? 'RHEL/CentOS' : 'Other'}`);

                // 1. Install Node.js, MariaDB & Basic Dependencies
                console.log(`[DEPLOY] Installing base environment on ${server.name}...`);
                let bootstrapCmds = [];

                if (isDebian) {
                    bootstrapCmds = [
                        'sudo apt-get update -y',
                        'sudo apt-get install -y curl git build-essential python3 mariadb-server nginx apache2',
                        'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
                        'sudo apt-get install -y nodejs'
                    ];
                } else if (isRHEL) {
                    bootstrapCmds = [
                        'sudo dnf update -y || sudo yum update -y',
                        'sudo dnf install -y curl git make gcc-c++ python3 mariadb-server nginx httpd || sudo yum install -y curl git make gcc-c++ python3 mariadb-server nginx httpd',
                        'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -',
                        'sudo dnf install -y nodejs || sudo yum install -y nodejs'
                    ];
                } else {
                    // Generic fallback
                    bootstrapCmds = [
                        'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -',
                        'sudo apt-get install -y nodejs mariadb-server nginx apache2 || sudo dnf install -y nodejs mariadb-server nginx httpd'
                    ];
                }

                bootstrapCmds.push(
                    'sudo mkdir -p /opt/yumnapanel/agent',
                    'sudo chown -R $USER:$USER /opt/yumnapanel',
                    // Try both mariadb and mysql for user creation
                    "sudo mysql -e \"CREATE USER IF NOT EXISTS 'yumna_agent'@'localhost' IDENTIFIED BY 'yumna_password';\" || sudo mariadb -e \"CREATE USER IF NOT EXISTS 'yumna_agent'@'localhost' IDENTIFIED BY 'yumna_password';\"",
                    "sudo mysql -e \"GRANT ALL PRIVILEGES ON *.* TO 'yumna_agent'@'localhost' WITH GRANT OPTION;\" || sudo mariadb -e \"GRANT ALL PRIVILEGES ON *.* TO 'yumna_agent'@'localhost' WITH GRANT OPTION;\"",
                    "sudo mysql -e \"FLUSH PRIVILEGES;\" || sudo mariadb -e \"FLUSH PRIVILEGES;\"",
                    "sudo systemctl enable mariadb || sudo systemctl enable mysql",
                    "sudo systemctl start mariadb || sudo systemctl start mysql"
                );

                for (const cmd of bootstrapCmds) {
                    const result = await ssh.execCommand(cmd);
                    if (result.code !== 0) console.warn(`[DEPLOY] Warning at "${cmd}": ${result.stderr}`);
                }

                // 2. Transfer Agent Files
                console.log(`[DEPLOY] Uploading agent files to ${server.name}...`);
                const agentDir = 'c:/YumnaPanel/agent';
                const remoteDir = '/opt/yumnapanel/agent';

                await ssh.putDirectory(agentDir, remoteDir, {
                    recursive: true,
                    concurrency: 10,
                    validate: (item) => {
                        const base = path.basename(item);
                        return base !== 'node_modules' && base !== '.env' && base !== '.git';
                    }
                });

                // Transfer etc/nginx/html for maintenance pages
                const etcHtmlSource = 'c:/YumnaPanel/etc/nginx/html';
                const etcHtmlDest = '/opt/yumnapanel/etc/nginx/html';
                await ssh.execCommand(`mkdir -p ${etcHtmlDest}`);
                await ssh.putDirectory(etcHtmlSource, etcHtmlDest, { recursive: true });

                // 3. NPM Install & Config
                console.log(`[DEPLOY] Setting up agent dependencies on ${server.name}...`);
                const nodePathRes = await ssh.execCommand('which node');
                const nodePath = nodePathRes.stdout.trim() || '/usr/bin/node';

                const envEntries = [
                    '# CORE SETTINGS',
                    'NODE_ENV=production',
                    'PORT=4001',
                    'AGENT_PORT=4001',
                    '',
                    '# COMMUNICATION',
                    '# The URL where WHM is running (this machine or remote)',
                    `WHM_URL=${process.env.WHM_URL || 'http://localhost:4000'}`,
                    '# Must match the AGENT_SECRET in WHM\'s .env',
                    `AGENT_SECRET=${process.env.AGENT_SECRET || 'super_secret'}`,
                    '',
                    '# NODE INFORMATION',
                    `AGENT_ID=${server.hostname || server.name}`,
                    `AGENT_IP=${server.ip}`,
                    `AGENT_HOSTNAME=${server.hostname || server.name}`,
                    '',
                    '# DATABASE CREDENTIALS',
                    `DB_HOST=${dbConfig.db_host || 'localhost'}`,
                    `DB_USER=${dbConfig.db_user || 'yumna_agent'}`,
                    `DB_PASS=${dbConfig.db_pass || 'yumna_password'}`,
                    '',
                    '# FEATURES',
                    'ENABLE_DNS=true',
                    'ENABLE_WEB=true',
                    'ENABLE_DB=true'
                ];

                const setupCmds = [
                    `cd ${remoteDir} && npm install --production`
                ];

                for (const cmd of setupCmds) {
                    const result = await ssh.execCommand(cmd);
                    if (result.code !== 0) throw new Error(`Setup failed at "${cmd}": ${result.stderr}`);
                }

                // Create .env using Here-Doc for maximum reliability
                const envContent = envEntries.join('\n');
                await ssh.execCommand(`cat <<EOF > ${remoteDir}/.env\n${envContent}\nEOF`);

                // 4. Persistence with Systemd
                console.log(`[DEPLOY] Configuring systemd service on ${server.name} using node at ${nodePath}...`);
                const systemdService = `
[Unit]
Description=Yumna Panel Agent
After=network.target

[Service]
Type=simple
User=${server.ssh_user}
WorkingDirectory=${remoteDir}
ExecStart=${nodePath} src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;
                const servicePath = '/etc/systemd/system/yumna-agent.service';
                await ssh.execCommand(`echo '${systemdService}' | sudo tee ${servicePath}`);
                await ssh.execCommand('sudo systemctl daemon-reload');
                await ssh.execCommand('sudo systemctl enable yumna-agent');
                await ssh.execCommand('sudo systemctl restart yumna-agent');

            } else if (osName === 'freebsd' || osName === 'darwin') {
                // BSD / macOS Support
                const isMac = osName === 'darwin';
                console.log(`[DEPLOY] Setup for ${isMac ? 'macOS' : 'FreeBSD'}...`);

                const remoteDir = isMac ? '/usr/local/yumnapanel/agent' : '/opt/yumnapanel/agent';
                const pkgCmd = isMac ? 'brew install node mariadb' : 'pkg install -y node20 npm mariadb1011-server';

                await ssh.execCommand(pkgCmd);
                await ssh.execCommand(`sudo mkdir -p ${path.dirname(remoteDir)} && sudo chown $USER ${path.dirname(remoteDir)}`);

                // Transfer
                await ssh.putDirectory(agentDir, remoteDir, { recursive: true });

                // Transfer etc/nginx/html for maintenance pages
                const etcHtmlSource = 'c:/YumnaPanel/etc/nginx/html';
                const etcHtmlDest = `${path.dirname(remoteDir)}/etc/nginx/html`;
                await ssh.execCommand(`mkdir -p ${etcHtmlDest}`);
                await ssh.putDirectory(etcHtmlSource, etcHtmlDest, { recursive: true });

                // Config
                const envContent = envEntries.join('\n');
                await ssh.execCommand(`cat <<EOF > ${remoteDir}/.env\n${envContent}\nEOF`);
                await ssh.execCommand(`cd ${remoteDir} && npm install --production`);

                // Start (Simple background for now, or use launchctl/rc.d if advanced)
                if (isMac) {
                    await ssh.execCommand(`cd ${remoteDir} && nohup node src/index.js > agent.log 2>&1 &`);
                } else {
                    await ssh.execCommand(`sysrc mysql_enable="YES" && service mysql-server start || true`);
                    await ssh.execCommand(`cd ${remoteDir} && nohup node src/index.js > agent.log 2>&1 &`);
                }

            } else {
                // Windows Support (Simplified)
                console.log(`[DEPLOY] Target OS assumed Windows...`);
                const remoteDir = 'C:\\YumnaPanel\\Agent';
                await ssh.execCommand(`if not exist "${remoteDir}" mkdir "${remoteDir}"`);

                // Transfer
                await ssh.putDirectory('c:/YumnaPanel/agent', remoteDir, {
                    recursive: true,
                    validate: (item) => !item.includes('node_modules') && !item.includes('.env')
                });

                // Config
                const envEntriesWin = [
                    '# CORE SETTINGS',
                    'NODE_ENV=production',
                    'PORT=4001',
                    'AGENT_PORT=4001',
                    '',
                    '# COMMUNICATION',
                    `WHM_URL=${process.env.WHM_URL || 'http://localhost:4000'}`,
                    `AGENT_SECRET=${process.env.AGENT_SECRET || 'super_secret'}`,
                    '',
                    '# NODE INFORMATION',
                    `AGENT_ID=${server.hostname || server.name}`,
                    `AGENT_IP=${server.ip}`,
                    `AGENT_HOSTNAME=${server.hostname || server.name}`,
                    '',
                    '# DATABASE CREDENTIALS',
                    `DB_HOST=${dbConfig.db_host || 'localhost'}`,
                    `DB_USER=${dbConfig.db_user || 'root'}`,
                    `DB_PASS=${dbConfig.db_pass || ''}`,
                    '',
                    '# FEATURES',
                    'ENABLE_DNS=true',
                    'ENABLE_WEB=true',
                    'ENABLE_DB=true'
                ];

                await ssh.execCommand(`echo ${envEntriesWin.join('\r\n')} > "${remoteDir}\\.env"`);
                await ssh.execCommand(`cd "${remoteDir}" && npm install --production`);

                // For Windows, we might need 'nssm' or similar to create a service. 
                // For now, just a simple background start.
                await ssh.execCommand(`start /b node src/index.js`);
            }

            console.log(`[DEPLOY] ✅ Agent deployed successfully to ${server.name}`);

            await pool.promise().query(
                `UPDATE servers SET status = 'active', last_seen = NOW() WHERE id = ?`,
                [serverId]
            );

            this.status[serverId] = 'success';

        } catch (error) {
            console.error(`[DEPLOY] ❌ Failed to deploy to ${server.name}:`, error.message);
            this.status[serverId] = 'failed';
            await pool.promise().query(
                `UPDATE servers SET status = 'deploy_failed' WHERE id = ?`,
                [serverId]
            );
        } finally {
            ssh.dispose();
        }
    }

    getAllFiles(dirPath, arrayOfFiles = []) {
        const files = fs.readdirSync(dirPath);
        files.forEach((file) => {
            if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
                arrayOfFiles = this.getAllFiles(path.join(dirPath, file), arrayOfFiles);
            } else {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        });
        return arrayOfFiles;
    }

    getDeploymentStatus(serverId) {
        return this.status[serverId] || 'idle';
    }
}

module.exports = new AgentDeploymentService();
