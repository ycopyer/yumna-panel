const mysql = require('mysql2/promise');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const crypto = require('crypto');
const os = require('os');
const { decrypt } = require('../utils/helpers');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const BACKUP_DIR = path.join(__dirname, '../../../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupService {
    /**
     * Perform a backup based on configuration
     */
    static async performBackup(backupId, config) {
        const { userId, target, storageId, encrypted, scheduleId } = config;
        let connection;
        let startTime = Date.now();

        try {
            connection = await mysql.createConnection(dbConfig);
            await connection.query('UPDATE backups SET status = "pending" WHERE id = ?', [backupId]);

            // 1. Prepare Paths
            const timestamp = Date.now();
            const fileName = `backup_u${userId}_${target}_${backupId}_${timestamp}.zip`;
            const filePath = path.join(BACKUP_DIR, fileName);
            const output = fs.createWriteStream(filePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            // 2. Setup Archive Events
            const resultPromise = new Promise((resolve, reject) => {
                output.on('close', async () => {
                    const duration = Math.ceil((Date.now() - startTime) / 1000);
                    const size = archive.pointer();
                    resolve({ size, filePath, duration });
                });
                archive.on('error', (err) => reject(err));
            });

            archive.pipe(output);

            // 3. Add Files
            if (target === 'full' || target === 'files') {
                const [websites] = await connection.query('SELECT domain, rootPath FROM websites WHERE userId = ?', [userId]);
                for (const site of websites) {
                    if (site.rootPath && fs.existsSync(site.rootPath)) {
                        archive.directory(site.rootPath, `domains/${site.domain}`);
                    }
                }
            }

            // 4. Add Databases
            if (target === 'full' || target === 'database') {
                const [databases] = await connection.query('SELECT name FROM `databases` WHERE userId = ?', [userId]);
                for (const db of databases) {
                    try {
                        const sqlContent = await this.generateSQLDump(connection, db.name);
                        archive.append(sqlContent, { name: `databases/${db.name}.sql` });
                    } catch (e) {
                        archive.append(`Error: ${e.message}`, { name: `databases/${db.name}_error.log` });
                    }
                }
            }

            await archive.finalize();
            const { size, duration } = await resultPromise;

            // 5. Handle Encryption if requested
            let finalPath = filePath;
            let finalSize = size;
            if (encrypted) {
                const encryptedPath = filePath + '.enc';
                const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'YumnaPanelDefaultKey', 'salt', 32);
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

                const input = fs.createReadStream(filePath);
                const outputEnc = fs.createWriteStream(encryptedPath);

                // Write IV at the beginning of the file
                outputEnc.write(iv);

                await new Promise((resolve, reject) => {
                    input.pipe(cipher).pipe(outputEnc);
                    outputEnc.on('finish', resolve);
                    outputEnc.on('error', reject);
                });

                fs.unlinkSync(filePath); // Remove original unencrypted zip
                finalPath = encryptedPath;
                finalSize = fs.statSync(finalPath).size;
                console.log(`[BackupService] Backup encrypted successfully: ${finalPath}`);
            }

            // 6. Handle Remote Upload if requested
            if (storageId) {
                await this.uploadToRemote(finalPath, storageId, connection);
            }

            // 7. Update Record
            await connection.query(
                'UPDATE backups SET status = "completed", size = ?, duration = ?, filePath = ?, encrypted = ? WHERE id = ?',
                [finalSize, duration, finalPath, encrypted ? 1 : 0, backupId]
            );

            // 8. Handle Rotation Policy
            if (scheduleId) {
                await this.handleRotation(userId, scheduleId, connection);
            }

            await connection.end();
            console.log(`[BackupService] Backup ${backupId} completed successfully.`);

        } catch (err) {
            console.error('[BackupService] Backup failed:', err.message);
            if (connection) {
                await connection.query('UPDATE backups SET status = "failed", error_message = ? WHERE id = ?', [err.message, backupId]);
                await connection.end();
            }
        }
    }

    static async uploadToRemote(filePath, storageId, connection) {
        const [rows] = await connection.query('SELECT * FROM remote_storage_configs WHERE id = ?', [storageId]);
        if (rows.length === 0) throw new Error('Remote storage configuration not found');

        const decryptedConfig = decrypt(rows[0].config);
        const config = JSON.parse(decryptedConfig);
        const provider = rows[0].provider;

        if (provider === 'sftp') {
            const sftp = new SftpClient();
            try {
                await sftp.connect({
                    host: config.host,
                    port: config.port || 22,
                    username: config.username,
                    password: config.password
                });
                const remotePath = path.join(config.remotePath || './', path.basename(filePath)).replace(/\\/g, '/');
                await sftp.put(filePath, remotePath);
                console.log(`[BackupService] SFTP upload successful: ${remotePath}`);
            } finally {
                await sftp.end();
            }
        } else {
            throw new Error(`Remote provider ${provider} not supported yet`);
        }
    }

    static async handleRotation(userId, scheduleId, connection) {
        const [schedules] = await connection.query('SELECT keepBackups FROM backup_schedules WHERE id = ?', [scheduleId]);
        if (schedules.length === 0) return;

        const limit = schedules[0].keepBackups;
        const [oldest] = await connection.query(
            'SELECT id, filePath FROM backups WHERE userId = ? AND scheduleId = ? AND status = "completed" ORDER BY createdAt DESC LIMIT 100 OFFSET ?',
            [userId, scheduleId, limit]
        );

        for (const backup of oldest) {
            if (backup.filePath && fs.existsSync(backup.filePath)) {
                try { fs.unlinkSync(backup.filePath); } catch (e) { }
            }
            await connection.query('DELETE FROM backups WHERE id = ?', [backup.id]);
        }
    }

    static async generateSQLDump(connection, dbName) {
        let sql = `-- YumnaPanel SQL Dump\nUSE \`${dbName}\`;\n\n`;
        const [tables] = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
        const tableKey = Object.keys(tables[0] || {})[0];

        for (const row of tables) {
            const tableName = row[tableKey];
            const [createTable] = await connection.query(`SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``);
            sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n${createTable[0]['Create Table']};\n\n`;
        }
        return sql;
    }

    /**
     * Scheduler Check
     */
    static async checkSchedules() {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const now = new Date();
            const [due] = await connection.query(
                'SELECT * FROM backup_schedules WHERE isActive = 1 AND (nextRun IS NULL OR nextRun <= ?)',
                [now]
            );

            for (const sched of due) {
                console.log(`[BackupScheduler] Running scheduled backup: ${sched.name}`);

                // Create backup record
                const [res] = await connection.query(
                    'INSERT INTO backups (userId, scheduleId, type, target, storageId, status) VALUES (?, ?, "scheduled", ?, ?, "pending")',
                    [sched.userId, sched.id, sched.target, sched.storageId]
                );
                const backupId = res.insertId;

                // Update next run
                const nextRun = this.calculateNextRun(sched.type, now);
                await connection.query('UPDATE backup_schedules SET lastRun = NOW(), nextRun = ? WHERE id = ?', [nextRun, sched.id]);

                // Run in background
                this.performBackup(backupId, {
                    userId: sched.userId,
                    target: sched.target,
                    storageId: sched.storageId,
                    scheduleId: sched.id,
                    encrypted: false
                });
            }
        } catch (e) {
            console.error('[BackupScheduler] Error:', e.message);
        } finally {
            if (connection) await connection.end();
        }
    }

    static async restoreBackup(backupId) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query('SELECT * FROM backups WHERE id = ?', [backupId]);
            if (rows.length === 0) throw new Error('Backup not found');
            const backup = rows[0];

            if (!backup.filePath || !fs.existsSync(backup.filePath)) throw new Error('Backup file not found');

            console.log(`[BackupService] Starting restore for backup ${backupId}...`);

            let workPath = backup.filePath;
            const tempDir = path.join(os.tmpdir(), `restore_${backupId}_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            // 1. Decrypt if needed
            if (backup.encrypted) {
                const decryptedPath = path.join(tempDir, 'backup.zip');
                const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'YumnaPanelDefaultKey', 'salt', 32);

                const input = fs.createReadStream(backup.filePath);
                const iv = await new Promise((resolve) => {
                    input.once('readable', () => {
                        const chunk = input.read(16);
                        resolve(chunk);
                    });
                });

                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                const outputDec = fs.createWriteStream(decryptedPath);

                await new Promise((resolve, reject) => {
                    input.pipe(decipher).pipe(outputDec);
                    outputDec.on('finish', resolve);
                    outputDec.on('error', reject);
                });
                workPath = decryptedPath;
            }

            // 2. Unzip
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(workPath);
            zip.extractAllTo(tempDir, true);

            // 3. Restore Files
            const domainsDir = path.join(tempDir, 'domains');
            if (fs.existsSync(domainsDir)) {
                const domains = fs.readdirSync(domainsDir);
                for (const domain of domains) {
                    const [siteRows] = await connection.query('SELECT rootPath FROM websites WHERE domain = ?', [domain]);
                    if (siteRows.length > 0) {
                        const source = path.join(domainsDir, domain);
                        const target = siteRows[0].rootPath;
                        if (fs.existsSync(source) && fs.lstatSync(source).isDirectory()) {
                            // Simple copy for now (caution: overwrites)
                            this.copyRecursiveSync(source, target);
                        }
                    }
                }
            }

            // 4. Restore Databases
            const dbsDir = path.join(tempDir, 'databases');
            if (fs.existsSync(dbsDir)) {
                const dbFiles = fs.readdirSync(dbsDir).filter(f => f.endsWith('.sql'));
                for (const dbFile of dbFiles) {
                    const dbName = dbFile.replace('.sql', '');
                    const sqlPath = path.join(dbsDir, dbFile);

                    // Execute SQL dump via command line for speed and reliability
                    const mysqlExe = process.platform === 'win32'
                        ? 'c:\\YumnaPanel\\bin\\database\\mariadb\\bin\\mysql.exe'
                        : 'mysql';

                    const cmd = `"${mysqlExe}" -u ${process.env.DB_USER} -h ${process.env.DB_HOST} ${dbName} < "${sqlPath}"`;
                    const { execSync } = require('child_process');
                    try {
                        execSync(cmd, { stdio: 'ignore' });
                        console.log(`[BackupService] Database ${dbName} restored.`);
                    } catch (e) {
                        console.error(`[BackupService] Failed to restore DB ${dbName}:`, e.message);
                    }
                }
            }

            // Clean up temp
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`[BackupService] Restore ${backupId} completed.`);
            await connection.end();
            return { success: true };

        } catch (err) {
            console.error('[BackupService] Restore failed:', err.message);
            if (connection) await connection.end();
            throw err;
        }
    }

    static copyRecursiveSync(src, dest) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (let entry of entries) {
            let srcPath = path.join(src, entry.name);
            let destPath = path.join(dest, entry.name);
            entry.isDirectory() ? this.copyRecursiveSync(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
        }
    }

    static async verifyBackup(backupId) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query('SELECT * FROM backups WHERE id = ?', [backupId]);
            if (rows.length === 0) throw new Error('Backup not found');
            const backup = rows[0];

            if (!backup.filePath || !fs.existsSync(backup.filePath)) {
                throw new Error('Backup file physically missing from storage');
            }

            console.log(`[BackupService] Verifying integrity for backup ${backupId}...`);

            let workPath = backup.filePath;
            const tempDir = path.join(os.tmpdir(), `verify_${backupId}_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            try {
                // 1. Decrypt if needed
                if (backup.encrypted) {
                    const decryptedPath = path.join(tempDir, 'test_decrypt.zip');
                    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'YumnaPanelDefaultKey', 'salt', 32);

                    const input = fs.createReadStream(backup.filePath);
                    const iv = await new Promise((resolve, reject) => {
                        input.once('readable', () => {
                            const chunk = input.read(16);
                            if (!chunk) reject(new Error('Failed to read IV'));
                            resolve(chunk);
                        });
                        input.on('error', reject);
                    });

                    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                    const outputDec = fs.createWriteStream(decryptedPath);

                    await new Promise((resolve, reject) => {
                        input.pipe(decipher).pipe(outputDec);
                        outputDec.on('finish', resolve);
                        outputDec.on('error', reject);
                    });
                    workPath = decryptedPath;
                }

                // 2. Archive Integrity Check
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(workPath);
                const zipEntries = zip.getEntries();

                if (zipEntries.length === 0) throw new Error('Archive is empty or corrupted');

                console.log(`[BackupService] Backup ${backupId} verified successfully. Contains ${zipEntries.length} entries.`);
                return { success: true, message: 'Integrity verified', entries: zipEntries.length };

            } finally {
                // Clean up verification temp files
                fs.rmSync(tempDir, { recursive: true, force: true });
            }

        } catch (err) {
            console.error('[BackupService] Verification failed:', err.message);
            throw err;
        } finally {
            if (connection) await connection.end();
        }
    }

    static calculateNextRun(type, fromDate) {
        const next = new Date(fromDate);
        if (type === 'daily') next.setDate(next.getDate() + 1);
        else if (type === 'weekly') next.setDate(next.getDate() + 7);
        else if (type === 'monthly') next.setMonth(next.getMonth() + 1);
        return next;
    }

    static start() {
        console.log('[BackupService] Starting Scheduler...');
        setInterval(() => this.checkSchedules(), 5 * 60 * 1000);
        setTimeout(() => this.checkSchedules(), 10000);
    }
}

module.exports = BackupService;
