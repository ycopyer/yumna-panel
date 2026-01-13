const pool = require('../config/db');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { NodeSSH } = require('node-ssh');

class SSLMasterService {
    /**
     * Issue SSL certificate on Master and push to remote Agent
     */
    static async issueAndPush(domain, serverId, wildcard = false) {
        // 1. Get server info
        const [serverRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [serverId]);
        if (serverRows.length === 0) throw new Error('Target server not found');
        const server = serverRows[0];

        console.log(`[SSL-MASTER] Starting centralized issuance for ${domain} -> Target: ${server.name}`);

        // 2. Issue Locally on Master (Using Master's ACME client)
        // For demonstration, we simulate successful issuance or call local Master SSL tools
        // In production, this would use a DNS-01 challenge via Master's DNS providers
        const certData = await this.issueLocally(domain, wildcard);

        if (server.is_local) {
            // Just save locally
            await this.saveLocally(domain, certData);
            return { success: true, message: 'SSL issued and saved locally' };
        }

        // 3. Push to Remote Agent via SSH
        await this.pushToRemote(domain, server, certData);

        return { success: true, message: 'SSL issued on Master and synchronized to Agent' };
    }

    static async issueLocally(domain, wildcard) {
        // This is where actual issuance happens on the Master Node
        // Using DNS Challenge (PowerDNS, Cloudflare, etc.)
        console.log(`[SSL-MASTER] Issuing cert locally for ${domain}...`);

        // Mocking certificate data for now
        // In real implementation, this would involve ACME client calls
        return {
            cert: '-----BEGIN CERTIFICATE-----\nMASTER_ISSUED_CERT\n-----END CERTIFICATE-----',
            key: '-----BEGIN PRIVATE KEY-----\nMASTER_ISSUED_KEY\n-----END PRIVATE KEY-----',
            chain: '-----BEGIN CERTIFICATE-----\nMASTER_ISSUED_CHAIN\n-----END CERTIFICATE-----'
        };
    }

    static async saveLocally(domain, certData) {
        const sslPath = 'C:/YumnaPanel/etc/ssl';
        await fs.mkdir(sslPath, { recursive: true });
        await fs.writeFile(path.join(sslPath, `${domain}-chain.pem`), certData.cert + '\n' + certData.chain);
        await fs.writeFile(path.join(sslPath, `${domain}-key.pem`), certData.key);
    }

    static async pushToRemote(domain, server, certData) {
        const ssh = new NodeSSH();
        await ssh.connect({
            host: server.ip,
            username: server.ssh_user,
            password: server.ssh_password, // Or privateKey
            port: server.ssh_port || 22
        });

        const remoteSSLPath = '/opt/yumnapanel/etc/ssl';
        console.log(`[SSL-MASTER] Pushing certs to ${server.ip}:${remoteSSLPath}`);

        // Ensure remote directory exists
        await ssh.execCommand(`sudo mkdir -p ${remoteSSLPath} && sudo chown -R ${server.ssh_user}:${server.ssh_user} ${remoteSSLPath}`);

        // Create temporary local files to upload
        const tmpDir = path.join(process.cwd(), 'tmp_ssl');
        await fs.mkdir(tmpDir, { recursive: true });

        const localChain = path.join(tmpDir, `${domain}-chain.pem`);
        const localKey = path.join(tmpDir, `${domain}-key.pem`);

        await fs.writeFile(localChain, certData.cert + '\n' + certData.chain);
        await fs.writeFile(localKey, certData.key);

        // Upload
        await ssh.putFile(localChain, `${remoteSSLPath}/${domain}-chain.pem`);
        await ssh.putFile(localKey, `${remoteSSLPath}/${domain}-key.pem`);

        // Cleanup
        await fs.unlink(localChain);
        await fs.unlink(localKey);

        ssh.dispose();
    }
}

module.exports = SSLMasterService;
