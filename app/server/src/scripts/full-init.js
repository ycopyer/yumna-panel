require('dotenv').config();
const initTables = require('../config/init');

console.log('🚀 Starting Full Database Initialization...');

initTables()
    .then(() => {
        console.log('✅ Full Database Initialization Complete!');
        setTimeout(() => process.exit(0), 1000);
    })
    .catch(err => {
        console.error('❌ Full Database Initialization Failed:', err);
        process.exit(1);
    });
