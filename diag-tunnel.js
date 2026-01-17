const pool = require('./whm/src/config/db');

async function diag() {
    try {
        console.log('--- DIAGNOSTIC START ---');

        // Check servers
        const [servers] = await pool.promise().query('SELECT id, name, status, connection_type FROM servers');
        console.log('Servers list:', servers.map(s => `ID: ${s.id}, Name: ${s.name}, Conn: ${s.connection_type}, Status: ${s.status}`));

        // Check tunnel_mappings table
        try {
            const [mappings] = await pool.promise().query('SELECT * FROM tunnel_mappings');
            console.log('Tunnel Mappings found:', mappings.length);
        } catch (e) {
            console.log('Tunnel Mappings table Error:', e.message);
        }

        console.log('--- DIAGNOSTIC END ---');
        process.exit(0);
    } catch (err) {
        console.error('Diag failed:', err.message);
        process.exit(1);
    }
}

diag();
