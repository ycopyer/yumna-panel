require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2');
const http = require('http');

// DB Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'filemanager'
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    }
    console.log('Connected to DB. Starting Geo Backfill...');
    startBackfill();
});

const getGeoFromIP = (ip) => {
    return new Promise((resolve) => {
        // Skip local IPs or invalid
        if (ip === '::1' || ip === '127.0.0.1') {
            return resolve(null);
        }

        const url = `http://ip-api.com/json/${ip}?fields=status,country,countryCode,lat,lon`;

        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        resolve(json);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (e) => {
            console.error(`Error fetching IP ${ip}:`, e.message);
            resolve(null);
        });
    });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const startBackfill = () => {
    // Find IPs missing geo data
    const query = 'SELECT id, target FROM firewall WHERE type = "ip" AND (country IS NULL OR lat IS NULL OR lon IS NULL)';

    db.query(query, async (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            process.exit(1);
        }

        console.log(`Found ${results.length} records to update.`);

        // Group by IP to save API calls? No, simplistic approach first.
        // Actually, many rows might have same IP. Let's deduplicate processing.
        // But for backfill, easy iteration is fine.

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const ip = row.target;

            console.log(`[${i + 1}/${results.length}] Processing IP: ${ip}...`);

            const geo = await getGeoFromIP(ip);

            if (geo) {
                await new Promise(resolve => {
                    db.query(
                        'UPDATE firewall SET country = ?, lat = ?, lon = ? WHERE id = ?',
                        [geo.country, geo.lat, geo.lon, row.id],
                        (updErr) => {
                            if (updErr) console.error('  Update failed:', updErr.message);
                            else console.log(`  Updated: ${geo.country} (${geo.lat}, ${geo.lon})`);
                            resolve();
                        }
                    );
                });
            } else {
                console.log('  No geo data found or local IP.');
            }

            // Rate limit protection: ip-api allows 45 req/min -> 1 req every 1.33 sec.
            // Let's safe with 1.5s
            await delay(1500);
        }

        console.log('Backfill complete.');
        db.end();
        process.exit(0);
    });
};
