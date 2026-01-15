const pool = require('../../config/db');

class DNSVersioningService {
    /**
     * Initialize History Table
     */
    async initialize() {
        try {
            await pool.promise().query(`
                CREATE TABLE IF NOT EXISTS dns_zone_versions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    zoneId INT NOT NULL,
                    versionNumber INT NOT NULL,
                    records_json JSON NOT NULL,
                    createdBy INT,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    comment VARCHAR(255),
                    FOREIGN KEY (zoneId) REFERENCES dns_zones(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('[DNS Versioning] Table initialized');
        } catch (error) {
            console.error('[DNS Versioning] Init error:', error.message);
        }
    }

    /**
     * Create a new version snapshot
     */
    async createSnapshot(zoneId, userId, comment = 'Auto-snapshot') {
        try {
            // Get current records
            const [records] = await pool.promise().query('SELECT * FROM dns_records WHERE zoneId = ?', [zoneId]);

            // Get next version number
            const [versionRows] = await pool.promise().query(
                'SELECT MAX(versionNumber) as maxVer FROM dns_zone_versions WHERE zoneId = ?',
                [zoneId]
            );
            const nextVersion = (versionRows[0].maxVer || 0) + 1;

            await pool.promise().query(
                'INSERT INTO dns_zone_versions (zoneId, versionNumber, records_json, createdBy, comment) VALUES (?, ?, ?, ?, ?)',
                [zoneId, nextVersion, JSON.stringify(records), userId, comment]
            );

            // Keep only last 10 versions
            await pool.promise().query(`
                DELETE FROM dns_zone_versions 
                WHERE zoneId = ? AND id NOT IN (
                    SELECT id FROM (
                        SELECT id FROM dns_zone_versions 
                        WHERE zoneId = ? 
                        ORDER BY versionNumber DESC 
                        LIMIT 10
                    ) AS tmp
                )
            `, [zoneId, zoneId]);

            return nextVersion;
        } catch (error) {
            console.error('[DNS Versioning] Snapshot error:', error.message);
            throw error;
        }
    }

    /**
     * Get version history
     */
    async getHistory(zoneId) {
        const [rows] = await pool.promise().query(
            'SELECT * FROM dns_zone_versions WHERE zoneId = ? ORDER BY versionNumber DESC',
            [zoneId]
        );
        return rows;
    }

    /**
     * Rollback to specific version
     */
    async rollback(zoneId, versionId) {
        const conn = await pool.promise().getConnection();
        try {
            await conn.beginTransaction();

            const [versions] = await conn.query(
                'SELECT * FROM dns_zone_versions WHERE id = ? AND zoneId = ?',
                [versionId, zoneId]
            );

            if (versions.length === 0) throw new Error('Version not found');

            const records = JSON.parse(versions[0].records_json);

            // Delete current records
            await conn.query('DELETE FROM dns_records WHERE zoneId = ?', [zoneId]);

            // Restore from snapshot
            for (const rec of records) {
                await conn.query(
                    'INSERT INTO dns_records (zoneId, type, name, content, priority, ttl) VALUES (?, ?, ?, ?, ?, ?)',
                    [zoneId, rec.type, rec.name, rec.content, rec.priority || 0, rec.ttl || 3600]
                );
            }

            await conn.commit();
            return { success: true, versionNumber: versions[0].versionNumber };
        } catch (error) {
            await conn.rollback();
            console.error('[DNS Versioning] Rollback error:', error.message);
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = new DNSVersioningService();
