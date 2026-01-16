const argon2 = require('./whm/node_modules/argon2');
const pool = require('./whm/src/config/db');

async function checkAdmin() {
    try {
        const [rows] = await pool.promise().query('SELECT username, password FROM users WHERE username = "admin"');
        if (rows.length === 0) {
            console.log('Admin user not found');
            process.exit(0);
        }
        const user = rows[0];
        console.log('Admin user found:', user.username);
        console.log('Hashed Password in DB:', user.password);

        const testPass = 'admin123';
        const isValid = await argon2.verify(user.password, testPass);
        console.log(`Verify with "admin123": ${isValid}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkAdmin();
