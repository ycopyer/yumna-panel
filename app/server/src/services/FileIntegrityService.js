const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class FileIntegrityService {
    constructor() {
        this.snapshotsDir = 'C:/YumnaPanel/data/integrity/snapshots';
    }

    /**
     * Initialize service
     */
    async initialize() {
        try {
            await fs.mkdir(this.snapshotsDir, { recursive: true });

            const connection = await mysql.createConnection(dbConfig);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS integrity_snapshots (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    target_path TEXT NOT NULL,
                    file_count INT DEFAULT 0,
                    snapshot_file VARCHAR(255),
                    status ENUM('active', 'archived') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INT
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS integrity_alerts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    snapshot_id INT,
                    file_path TEXT NOT NULL,
                    change_type ENUM('modified', 'deleted', 'added'),
                    old_hash VARCHAR(64),
                    new_hash VARCHAR(64),
                    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (snapshot_id) REFERENCES integrity_snapshots(id) ON DELETE CASCADE
                )
            `);
            await connection.end();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Generate file hash
     */
    async getFileHash(filePath) {
        try {
            const content = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch {
            return null;
        }
    }

    /**
     * Create a new snapshot
     */
    async createSnapshot(targetPath, userId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const files = await this.scanDirectory(targetPath);
            const snapshotData = {};

            for (const file of files) {
                const stats = await fs.stat(file);
                if (stats.isFile()) {
                    snapshotData[file] = {
                        hash: await this.getFileHash(file),
                        size: stats.size,
                        mtime: stats.mtime
                    };
                }
            }

            const snapshotFileName = `snapshot_${Date.now()}.json`;
            const snapshotPath = path.join(this.snapshotsDir, snapshotFileName);
            await fs.writeFile(snapshotPath, JSON.stringify(snapshotData));

            const [result] = await connection.query(
                'INSERT INTO integrity_snapshots (target_path, file_count, snapshot_file, user_id) VALUES (?, ?, ?, ?)',
                [targetPath, Object.keys(snapshotData).length, snapshotFileName, userId]
            );

            return { success: true, snapshotId: result.insertId };
        } finally {
            await connection.end();
        }
    }

    /**
     * Scan directory recursively
     */
    async scanDirectory(dir, fileList = []) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const name = path.join(dir, file);
            try {
                const stat = await fs.stat(name);
                if (stat.isDirectory()) {
                    await this.scanDirectory(name, fileList);
                } else {
                    fileList.push(name);
                }
            } catch { }
        }
        return fileList;
    }

    /**
     * Compare current state with snapshot
     */
    async checkIntegrity(snapshotId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query('SELECT * FROM integrity_snapshots WHERE id = ?', [snapshotId]);
            if (rows.length === 0) throw new Error('Snapshot not found');

            const snapshot = rows[0];
            const snapshotData = JSON.parse(await fs.readFile(path.join(this.snapshotsDir, snapshot.snapshot_file), 'utf8'));
            const currentFiles = await this.scanDirectory(snapshot.target_path);
            const alerts = [];

            // Check for modified and deleted files
            for (const [filePath, data] of Object.entries(snapshotData)) {
                if (!currentFiles.includes(filePath)) {
                    alerts.push({ file_path: filePath, change_type: 'deleted', old_hash: data.hash });
                } else {
                    const currentHash = await this.getFileHash(filePath);
                    if (currentHash !== data.hash) {
                        alerts.push({ file_path: filePath, change_type: 'modified', old_hash: data.hash, new_hash: currentHash });
                    }
                }
            }

            // Check for new files
            for (const filePath of currentFiles) {
                if (!snapshotData[filePath]) {
                    const currentHash = await this.getFileHash(filePath);
                    alerts.push({ file_path: filePath, change_type: 'added', new_hash: currentHash });
                }
            }

            // Save alerts
            for (const alert of alerts) {
                await connection.query(
                    'INSERT INTO integrity_alerts (snapshot_id, file_path, change_type, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)',
                    [snapshotId, alert.file_path, alert.change_type, alert.old_hash, alert.new_hash]
                );
            }

            return { success: true, alerts_found: alerts.length };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get alerts
     */
    async getAlerts(limit = 100) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query(`
                SELECT a.*, s.target_path 
                FROM integrity_alerts a
                JOIN integrity_snapshots s ON a.snapshot_id = s.id
                WHERE a.resolved = FALSE
                ORDER BY a.detected_at DESC
                LIMIT ?
            `, [limit]);
            return rows;
        } finally {
            await connection.end();
        }
    }

    /**
     * Resolve alert
     */
    async resolveAlert(alertId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query('UPDATE integrity_alerts SET resolved = TRUE WHERE id = ?', [alertId]);
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get snapshots
     */
    async getSnapshots() {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query('SELECT * FROM integrity_snapshots ORDER BY created_at DESC');
            return rows;
        } finally {
            await connection.end();
        }
    }
}

module.exports = new FileIntegrityService();
