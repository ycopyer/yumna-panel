const { NodeSSH } = require('node-ssh');
const { decrypt } = require('./src/utils/helpers');

async function findAgent() {
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

        console.log('Checking processes...');
        const psResult = await ssh.execCommand('ps aux | grep node');
        console.log('Node processes:\n', psResult.stdout);

        console.log('Checking agent path...');
        const lsResult = await ssh.execCommand('ls -R /opt/yumnapanel/agent');
        console.log('Agent path content:\n', lsResult.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

findAgent();
