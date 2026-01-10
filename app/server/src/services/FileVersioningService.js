const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

class FileVersioningService {
    static VERSIONS_DIR = path.join(process.cwd(), 'storage', 'versions');

    static async init() {
        if (!fs.existsSync(this.VERSIONS_DIR)) {
            fs.mkdirSync(this.VERSIONS_DIR, { recursive: true });
        }
    }

    static async createVersion(userId, filePath, adapter = null, comment = 'Auto-save') {
        let connection;
        try {
            await this.init();
            connection = await mysql.createConnection(dbConfig);

            const fileName = path.basename(filePath);
            const timestamp = Date.now();
            const versionFileName = `${timestamp}_${crypto.randomBytes(4).toString('hex')}_${fileName}`;
            const versionPath = path.join(this.VERSIONS_DIR, versionFileName);

            let fileSize = 0;
            if (adapter) {
                // Read via adapter (Sftp/Local)
                const stream = await adapter.createReadStream(filePath);
                const writeStream = fs.createWriteStream(versionPath);
                await new Promise((resolve, reject) => {
                    stream.pipe(writeStream);
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                fileSize = fs.statSync(versionPath).size;
            } else {
                // Local FS fallback
                if (!fs.existsSync(filePath)) throw new Error('Original file not found');
                fs.copyFileSync(filePath, versionPath);
                fileSize = fs.statSync(versionPath).size;
            }

            // 3. Save to database
            const [result] = await connection.query(
                'INSERT INTO file_versions (userId, filePath, versionPath, size, comment) VALUES (?, ?, ?, ?, ?)',
                [userId, filePath, versionPath, fileSize, comment]
            );

            console.log(`[Versioning] Version created for ${filePath}: ${versionPath}`);
            return { id: result.insertId, versionPath };

        } catch (err) {
            console.error('[Versioning] Failed to create version:', err.message);
            throw err;
        } finally {
            if (connection) await connection.end();
        }
    }

    static async getVersions(userId, filePath) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query(
                'SELECT id, filePath, size, comment, createdAt FROM file_versions WHERE userId = ? AND filePath = ? ORDER BY createdAt DESC',
                [userId, filePath]
            );
            return rows;
        } catch (err) {
            console.error('[Versioning] Failed to fetch versions:', err.message);
            throw err;
        } finally {
            if (connection) await connection.end();
        }
    }

    static async restoreVersion(userId, versionId) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query(
                'SELECT * FROM file_versions WHERE id = ? AND userId = ?',
                [versionId, userId]
            );

            if (rows.length === 0) throw new Error('Version not found');
            const version = rows[0];

            if (!fs.existsSync(version.versionPath)) {
                throw new Error('Version file missing from storage');
            }

            // Create a temporary backup of the current state before restoring
            await this.createVersion(userId, version.filePath, null, `Pre-restore backup (${versionId})`);

            // Restore the file
            fs.copyFileSync(version.versionPath, version.filePath);

            console.log(`[Versioning] File ${version.filePath} restored to version ${versionId}`);
            return { success: true };

        } catch (err) {
            console.error('[Versioning] Restore failed:', err.message);
            throw err;
        } finally {
            if (connection) await connection.end();
        }
    }

    static async deleteVersion(userId, versionId) {
        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query(
                'SELECT versionPath FROM file_versions WHERE id = ? AND userId = ?',
                [versionId, userId]
            );

            if (rows.length > 0) {
                const { versionPath } = rows[0];
                if (fs.existsSync(versionPath)) {
                    fs.unlinkSync(versionPath);
                }
                await connection.query('DELETE FROM file_versions WHERE id = ?', [versionId]);
            }
            return { success: true };
        } catch (err) {
            console.error('[Versioning] Delete failed:', err.message);
            throw err;
        } finally {
            if (connection) await connection.end();
        }
    }
}

module.exports = FileVersioningService;
