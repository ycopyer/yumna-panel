const pool = require('./src/config/db');

async function checkWebsite() {
    try {
        const [rows] = await pool.promise().query("SELECT domain, rootPath, serverId FROM websites WHERE domain='coba.test'");
        console.log('Websites:', JSON.stringify(rows, null, 2));

        if (rows.length > 0) {
            const [serverRows] = await pool.promise().query("SELECT * FROM servers WHERE id = ?", [rows[0].serverId]);
            console.log('Server:', JSON.stringify(serverRows, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkWebsite();
