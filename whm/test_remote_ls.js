const axios = require('axios');

async function testLs() {
    const url = 'http://192.168.10.60:4001/fs/ls';
    const secret = 'super_secure_agent_token_v3';

    try {
        console.log(`Calling ${url} with root=/var/www/coba.test and path=/ ...`);
        const response = await axios.get(url, {
            params: { root: '/var/www/coba.test', path: '/' },
            headers: { 'X-Agent-Secret': secret },
            timeout: 5000
        });
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        }
    }
}

testLs();
