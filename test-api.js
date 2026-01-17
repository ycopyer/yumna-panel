const axios = require('axios');

const URL = 'http://localhost:4000/api/servers';
// Need headers from the user or a dummy admin session if possible
// But I can't easily get the user's session ID.

async function testApi() {
    try {
        const res = await axios.get(URL);
        console.log('API Response:', res.status, res.data);
    } catch (err) {
        console.log('API Error:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
    }
}

testApi();
