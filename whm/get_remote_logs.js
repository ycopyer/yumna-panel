const { NodeSSH } = require('node-ssh');
const { decrypt } = require('./src/utils/helpers');

async function getAgentLogs() {
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
        console.log('SSH Connected.');

        // Try to find where the agent is running and its logs
        // Check pm2 first
        const pm2Result = await ssh.execCommand('pm2 logs yumna-agent --lines 50 --no-colors');
        console.log('PM2 Logs:\n', pm2Result.stdout || pm2Result.stderr);

        // If not pm2, check manual logs in /opt/yumnapanel/agent/logs or similar
        if (!pm2Result.stdout && !pm2Result.stderr) {
            const logFileResult = await ssh.execCommand('tail -n 50 /opt/yumnapanel/agent/agent.log');
            console.log('Log File:\n', logFileResult.stdout || logFileResult.stderr);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

getAgentLogs();
