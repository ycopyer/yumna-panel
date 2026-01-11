const db = require('../config/db');

/**
 * Ensures storage configuration is loaded for the user.
 * In v3, we primarily use the Agent API, but we keep this for compatibility 
 * and potential SFTP-based node management.
 */
async function ensureSftp(userId) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM sftp_configs WHERE userId = ?', [userId], (err, results) => {
            if (err) return reject(err);

            if (results.length > 0) {
                const config = results[0];
                resolve({
                    userId,
                    useSFTP: config.useSFTP === 1,
                    config: {
                        host: config.host,
                        port: config.port,
                        username: config.username,
                        password: config.password,
                        rootPath: config.rootPath,
                        privateKey: config.privateKey
                    },
                    sftp: null // We'll initialize an actual client here if useSFTP is true in the future
                });
            } else {
                // Default local storage config
                resolve({
                    userId,
                    useSFTP: false,
                    config: {},
                    sftp: null
                });
            }
        });
    });
}

module.exports = { ensureSftp };