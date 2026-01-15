const { NodeSSH } = require('node-ssh');
const { decrypt } = require('./src/utils/helpers');

async function testSsh() {
    const serverDetails = {
        host: '192.168.10.60',
        username: 'root',
        passwordEnc: 'a5ab7a00854a1196e774fe903ebb81c0:8979a0d207c50f048c7822f7ea22a1bb',
        port: 22
    };

    const password = decrypt(serverDetails.passwordEnc);
    console.log(`Decrypted password: ${password}`);

    const ssh = new NodeSSH();
    try {
        console.log(`Connecting to ${serverDetails.host}...`);
        await ssh.connect({
            host: serverDetails.host,
            username: serverDetails.username,
            password: password,
            port: serverDetails.port
        });
        console.log('SSH Connected successfully!');

        const result = await ssh.execCommand('ls -la /var/www/coba.test');
        console.log('LS Result:', result.stdout || result.stderr);

    } catch (err) {
        console.error('SSH Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

testSsh();
