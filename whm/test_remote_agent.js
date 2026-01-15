const axios = require('axios');

async function testAgent() {
    const url = 'http://192.168.10.60:4001/heartbeat';
    const secret = 'super_secure_agent_token_v3'; // From .env

    try {
        console.log(`Connecting to ${url}...`);
        const response = await axios.get(url, {
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

testAgent();
