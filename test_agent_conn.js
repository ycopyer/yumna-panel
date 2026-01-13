const axios = require('axios');
require('dotenv').config();

const agentUrl = process.env.AGENT_URL || 'http://localhost:4001';
const agentSecret = process.env.AGENT_SECRET || 'insecure_default';

console.log('Testing connection to Agent...');
console.log('URL:', agentUrl);
console.log('Secret starting with:', agentSecret.substring(0, 5));

axios.get(`${agentUrl}/heartbeat`, {
    timeout: 5000,
    headers: { 'X-Agent-Secret': agentSecret }
}).then(res => {
    console.log('Success!');
    console.log('Status:', res.status);
    console.log('Data:', res.data);
}).catch(err => {
    console.error('Failed!');
    console.error('Error:', err.message);
    if (err.response) {
        console.error('Response Status:', err.response.status);
        console.error('Response Data:', err.response.data);
    }
});
