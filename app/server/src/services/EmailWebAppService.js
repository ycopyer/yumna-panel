const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class EmailWebAppService {
    /**
     * Install Roundcube for a specific domain
     */
    static async installRoundcube(domainName) {
        const installPath = `C:/YumnaPanel/www/webmail.${domainName}`;
        const dbName = `rc_${domainName.replace(/\./g, '_')}`;

        try {
            // 1. Create Directory
            await fs.mkdir(installPath, { recursive: true });

            // 2. Create Database
            const connection = await mysql.createConnection(dbConfig);
            await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
            await connection.query(`GRANT ALL PRIVILEGES ON ${dbName}.* TO '${process.env.DB_USER}'@'localhost'`);
            await connection.end();

            // 3. Download and Extract (Simulated for this environment)
            // In a real scenario, we would download the Roundcube tarball/zip
            await fs.writeFile(`${installPath}/index.php`, `<?php echo "Roundcube Webmail for ${domainName} - Ready for setup"; ?>`);

            // 4. Create Nginx VHost for webmail
            // This would normally call WebServerService.createNginxVHost

            return {
                success: true,
                url: `http://webmail.${domainName}`,
                dbName: dbName
            };
        } catch (err) {
            console.error('[Webmail] Installation failed:', err);
            throw err;
        }
    }

    /**
     * Get webmail status for a domain
     */
    static async getWebmailStatus(domainName) {
        const installPath = `C:/YumnaPanel/www/webmail.${domainName}`;
        try {
            await fs.access(installPath);
            return { installed: true, url: `http://webmail.${domainName}` };
        } catch {
            return { installed: false };
        }
    }
}

module.exports = EmailWebAppService;
