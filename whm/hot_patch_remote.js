const { NodeSSH } = require('node-ssh');
const { decrypt } = require('./src/utils/helpers');
const fs = require('fs');
const path = require('path');

async function hotPatchAgent() {
    const serverDetails = {
        host: '192.168.10.60',
        username: 'root',
        passwordEnc: 'a5ab7a00854a1196e774fe903ebb81c0:8979a0d207c50f048c7822f7ea22a1bb',
        port: 22
    };

    const password = decrypt(serverDetails.passwordEnc);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: serverDetails.host,
            username: serverDetails.username,
            password: password,
            port: serverDetails.port
        });
        console.log('connected.');

        const remotePath = '/opt/yumnapanel/agent';

        // Read local files
        const indexJs = fs.readFileSync(path.join(__dirname, '../agent/src/index.js'), 'utf8');
        const fileServiceJs = fs.readFileSync(path.join(__dirname, '../agent/src/services/FileService.js'), 'utf8');

        // Write to remote
        console.log('Patching index.js...');
        await ssh.execCommand(`cat << 'EOF' > ${remotePath}/src/index.js\n${indexJs}\nEOF`);

        console.log('Patching FileService.js...');
        await ssh.execCommand(`cat << 'EOF' > ${remotePath}/src/services/FileService.js\n${fileServiceJs}\nEOF`);

        console.log('Restarting agent...');
        // Try various restart methods
        await ssh.execCommand('pm2 restart yumna-agent || systemctl restart yumna-agent || (pkill -f "node src/index.js" && cd /opt/yumnapanel/agent && nohup node src/index.js > agent.log 2>&1 &)');

        console.log('Patching complete!');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

hotPatchAgent();
