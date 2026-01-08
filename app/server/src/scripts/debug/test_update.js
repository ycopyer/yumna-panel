const axios = require('axios');

async function testUpdate() {
    try {
        const res = await axios.put('http://localhost:5000/api/users/2', {
            username: 'catur',
            role: 'user',
            email: 'catur@example.com',
            two_factor_enabled: true
        }, {
            headers: { 'x-user-id': '1' } // Admin ID
        });
        console.log('Update result:', res.data);
    } catch (err) {
        console.error('Update failed:', err.response ? err.response.data : err.message);
    }
}

testUpdate();
