const argon2 = require('./whm/node_modules/argon2');
const pool = require('./whm/src/config/db');

async function fixAdmin() {
    try {
        console.log('--- RESTORE ADMIN ACCESS ---');

        // 1. Reset Admin Password to 'admin123' explicitly using Argon2id
        const newHash = await argon2.hash('admin123', { type: argon2.argon2id });
        await pool.promise().query('UPDATE users SET password = ?, status = "active" WHERE username = "admin"', [newHash]);
        console.log('[SUCCESS] Admin password reset to: admin123');

        // 2. Clear IP Blacklist & Firewall
        await pool.promise().query('DELETE FROM ip_blacklist');
        await pool.promise().query('DELETE FROM firewall');
        await pool.promise().query('DELETE FROM login_attempts');
        console.log('[SUCCESS] Security blocks (blacklist, firewall, login attempts) cleared.');

        // 3. Clear sessions for admin to force fresh login
        await pool.promise().query('DELETE FROM user_sessions WHERE userId = (SELECT id FROM users WHERE username = "admin")');
        console.log('[SUCCESS] Admin sessions cleared.');

        console.log('----------------------------');
        console.log('Please try to login now with:');
        console.log('Username: admin');
        console.log('Password: admin123');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

fixAdmin();
