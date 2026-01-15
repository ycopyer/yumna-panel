const pool = require('./src/config/db');
(async () => {
    try {
        const [rows] = await pool.promise().query('SELECT id, name, agent_path, connection_type, ip FROM servers');
        console.log('Server Data:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
