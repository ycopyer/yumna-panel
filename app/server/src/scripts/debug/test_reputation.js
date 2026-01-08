const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getIPAbuseDetails, checkIPReputation } = require('./src/services/ipReputation');

async function test() {
    const ip = '8.8.8.8';
    console.log('Testing IP:', ip);
    console.log('API Key:', process.env.ABUSE_IPDB_KEY ? 'Present' : 'Missing');

    try {
        console.log('Fetching details...');
        const details = await getIPAbuseDetails(ip);
        console.log('Details fetched successfully');

        console.log('Checking reputation...');
        const reputation = await checkIPReputation(ip);
        console.log('Reputation checked successfully');

        console.log('Result:', JSON.stringify({ ...details, reputation }, null, 2));
    } catch (err) {
        console.error('Test Failed:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
        }
    }
}

test();
