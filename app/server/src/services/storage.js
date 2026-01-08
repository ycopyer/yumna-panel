const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { decrypt } = require('../utils/helpers');
const { getSftpConnection } = require('../core/sftp');
const { createLocalFsAdapter } = require('../adapters/local');
const { createMergedAdapter } = require('../adapters/merged');

const LOCAL_STORAGE_BASE = path.resolve(__dirname, '../../data');
const connections = new Map();

const ensureLocalStorageDir = async (username) => {
    const userDir = path.resolve(LOCAL_STORAGE_BASE, path.basename(username.toString()));
    await fs.mkdir(userDir, { recursive: true });
    return userDir;
};

const ensureSftp = async (userId) => {
    let session = Array.from(connections.values()).find(s => s.userId === userId);
    if (session) {
        // If it's a local session, it's always "alive"
        if (session.isLocal) return session;
        // If it's SFTP, check if connection is still healthy
        if (session.conn && session.conn.writable) return session;
    }

    return new Promise((resolve, reject) => {
        db.query(`
            SELECT u.username as system_username, s.* 
            FROM users u 
            LEFT JOIN sftp_configs s ON u.id = s.userId 
            WHERE u.id = ?
        `, [userId], async (err, results) => {
            if (err) return reject(new Error('Database error'));

            const user = results[0];
            if (!user) return reject(new Error('User not found'));

            // Use system username as priority for folder naming
            const targetUsername = user.system_username || user.username;
            if (!targetUsername) return reject(new Error('User identification failed'));

            let localAdapter;
            try {
                const userDir = await ensureLocalStorageDir(targetUsername);
                localAdapter = createLocalFsAdapter(userDir);
            } catch (localErr) {
                console.error('[STORAGE] Local storage init failed:', localErr);
                return reject(new Error('Failed to initialize local storage: ' + localErr.message));
            }

            let remoteAdapter = null;
            let conn = null;

            if (user.host && user.password) {
                try {
                    const decryptedPassword = decrypt(user.password);
                    const sftpRes = await getSftpConnection({
                        host: user.host,
                        port: user.port,
                        username: user.username,
                        password: decryptedPassword
                    });
                    conn = sftpRes.conn;
                    remoteAdapter = sftpRes.sftp;
                } catch (e) {
                    console.log(`[SFTP] Connection failed for ${user.username}, using local only. Error: ${e.message}`);
                }
            }

            let finalAdapter = localAdapter;

            // Setup Websites Mount
            const isWin = require('os').platform() === 'win32';
            const websitesBaseDir = isWin ? 'C:/YumnaPanel/www' : '/var/www';
            const extraMounts = [];

            try {
                // Ensure directory exists or at least try to mount it
                await fs.mkdir(websitesBaseDir, { recursive: true });
                // We create a separate adapter for websites directory
                const websitesAdapter = createLocalFsAdapter(websitesBaseDir);
                extraMounts.push({
                    name: 'Websites',
                    adapter: websitesAdapter,
                    physicalPath: websitesBaseDir
                });
            } catch (e) {
                console.warn('Failed to mount websites directory:', e.message);
            }

            // Always create merged adapter to include mounts, even if no remote adapter
            // Note: If remoteAdapter is null, we still use createMergedAdapter to handle routing
            finalAdapter = createMergedAdapter(
                localAdapter,
                remoteAdapter,
                user.name,
                user.rootPath,
                extraMounts
            );

            const sessionId = uuidv4();
            const sessionData = {
                conn,
                sftp: finalAdapter,
                userId,
                config: user,
                isLocal: !remoteAdapter
            };

            connections.set(sessionId, sessionData);

            if (conn) {
                conn.on('end', () => connections.delete(sessionId));
                conn.on('close', () => connections.delete(sessionId));
                conn.on('error', (err) => {
                    console.error('SFTP Connection Error:', err.message);
                    connections.delete(sessionId);
                });
            }

            return resolve({ sessionId, ...sessionData });
        });
    });
};

module.exports = {
    ensureSftp,
    connections,
    LOCAL_STORAGE_BASE
};
