require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

console.log('Connecting to DB...');
connection.connect((err) => {
    if (err) {
        console.error('Connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected.');

    const query = "SELECT description FROM activity_history WHERE action = 'restore' ORDER BY id DESC LIMIT 5";
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Query error:', error.message);
        } else {
            console.log('RESTORE_LOGS:', JSON.stringify(results));
        }
        connection.end();
        console.log('Connection closed.');
    });
});
