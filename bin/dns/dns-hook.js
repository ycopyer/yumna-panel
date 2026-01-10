const mysql = require('mysql2/promise');

const action = process.argv[2]; // 'create' or 'delete'
const fqdn = process.argv[3];   // e.g. _acme-challenge.example.com
const content = process.argv[4]; // token

async function run() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'filemanager_db'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Extract domain and subdomain from fqdn
        // This is a simplified logic. In a real panel, we'd lookup the exact zone.
        const parts = fqdn.split('.');
        if (parts.length < 3) return;

        const subdomain = parts[0]; // _acme-challenge
        const domain = parts.slice(1).join('.'); // example.com

        // Find zoneId
        const [zones] = await connection.query('SELECT id FROM dns_zones WHERE domain = ?', [domain]);
        if (zones.length === 0) {
            console.error(`Zone not found for ${domain}`);
            await connection.end();
            return;
        }
        const zoneId = zones[0].id;

        if (action === 'create' || action === 'add') {
            // Delete existing challenge records if any
            await connection.query('DELETE FROM dns_records WHERE zoneId = ? AND name = ? AND type = "TXT"', [zoneId, subdomain]);
            // Add new record
            await connection.query('INSERT INTO dns_records (zoneId, name, type, content, ttl) VALUES (?, ?, "TXT", ?, 60)', [zoneId, subdomain, content]);
            console.log(`Added TXT record for ${fqdn}`);
        } else if (action === 'delete' || action === 'remove') {
            await connection.query('DELETE FROM dns_records WHERE zoneId = ? AND name = ? AND type = "TXT" AND content = ?', [zoneId, subdomain, content]);
            console.log(`Removed TXT record for ${fqdn}`);
        }

        await connection.end();
    } catch (err) {
        console.error('DNS Hook Error:', err.message);
        process.exit(1);
    }
}

run();
