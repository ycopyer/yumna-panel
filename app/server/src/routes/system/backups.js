const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    dateStrings: true // Ensure dates are returned as strings
};

// Ensure backups directory exists
const BACKUP_DIR = path.join(__dirname, '../../../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// --- BACKUP MANAGEMENT ---

router.get('/backups', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        let query = `
            SELECT 
                id, userId, type, target, storage_type, status, createdAt,
                size as size_bytes, 
                CONCAT(UPPER(SUBSTRING(target, 1, 1)), SUBSTRING(target, 2), ' Backup') as name,
                filePath
            FROM backups`;
        let params = [];
        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }
        query += ' ORDER BY createdAt DESC';
        const [rows] = await connection.query(query, params);
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backups', requireAuth, auditLogger('CREATE_BACKUP'), async (req, res) => {
    const { target, storage_type, targetDomainId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    // Create record in DB first
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.query(
            'INSERT INTO backups (userId, target, storage_type, status) VALUES (?, ?, ?, ?)',
            [userId, target || 'full', storage_type || 'local', 'pending']
        );
        const backupId = result.insertId;
        await connection.end();

        // Start background backup process
        performRealBackup(backupId, userId, target, targetDomainId, isAdmin);

        res.status(202).json({ success: true, message: 'Backup started in background', backupId });
    } catch (err) {
        if (connection) await connection.end();
        res.status(500).json({ error: err.message });
    }
});

router.get('/backups/:id/download', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT * FROM backups WHERE id = ?', [id]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'Backup not found' });
        const backup = rows[0];

        if (backup.userId !== userId && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

        if (!backup.filePath || !fs.existsSync(backup.filePath)) {
            return res.status(404).json({ error: 'Backup file not found on server' });
        }

        const fileName = path.basename(backup.filePath);
        const downloadName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;

        res.download(backup.filePath, downloadName);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/backups/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [backup] = await connection.query('SELECT userId, filePath FROM backups WHERE id = ?', [id]);

        if (backup.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Backup not found' });
        }
        if (backup[0].userId !== userId && !isAdmin) {
            await connection.end();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (backup[0].filePath && fs.existsSync(backup[0].filePath)) {
            try { fs.unlinkSync(backup[0].filePath); } catch (e) { }
        }

        await connection.query('DELETE FROM backups WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'Backup deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to generate SQL Dump
async function generateSQLDump(connection, dbName) {
    let sql = `-- YumnaPanel SQL Dump\n`;
    sql += `-- Database: ${dbName}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;
    sql += `USE \`${dbName}\`;\n\n`;

    const [tables] = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableKey = `Tables_in_${dbName}`;

    for (const row of tables) {
        const tableName = row[tableKey];
        const [createTable] = await connection.query(`SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``);
        sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sql += `${createTable[0]['Create Table']};\n\n`;

        const [rows] = await connection.query(`SELECT * FROM \`${dbName}\`.\`${tableName}\``);
        if (rows.length > 0) {
            sql += `INSERT INTO \`${tableName}\` VALUES \n`;
            const values = rows.map(r => {
                const vals = Object.values(r).map(v => {
                    if (v === null) return 'NULL';
                    if (typeof v === 'number') return v;
                    return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                });
                return `(${vals.join(', ')})`;
            });
            sql += values.join(',\n') + ';\n\n';
        }
    }
    return sql;
}

// --- REAL BACKUP ENGINE ---
async function performRealBackup(backupId, userId, target, targetDomainId, isAdmin) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        let domainLabel = '';
        if (targetDomainId) {
            const [dRows] = await connection.query('SELECT domain FROM websites WHERE id = ?', [targetDomainId]);
            if (dRows.length > 0) domainLabel = `_${dRows[0].domain}`;
        }

        const fileName = `backup_u${userId}${domainLabel}_${backupId}_${Date.now()}.zip`;
        const filePath = path.join(BACKUP_DIR, fileName);
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            const size = archive.pointer();
            try {
                const conn = await mysql.createConnection(dbConfig);
                await conn.query('UPDATE backups SET status = ?, size = ?, filePath = ? WHERE id = ?',
                    ['completed', size, filePath, backupId]);
                await conn.end();
            } catch (e) { }
        });

        archive.on('error', async (err) => {
            try {
                const conn = await mysql.createConnection(dbConfig);
                await conn.query('UPDATE backups SET status = ?, size = 0 WHERE id = ?', ['failed', backupId]);
                await conn.end();
            } catch (e) { }
        });

        archive.pipe(output);

        // 1. BACKUP FILES
        if (target === 'full' || target === 'files') {
            let websitesQuery = 'SELECT id, domain, rootPath FROM websites';
            let websitesParams = [];
            const conditions = [];

            if (!isAdmin) {
                conditions.push('userId = ?');
                websitesParams.push(userId);
            }

            if (targetDomainId) {
                conditions.push('id = ?');
                websitesParams.push(targetDomainId);
            }

            if (conditions.length > 0) {
                websitesQuery += ' WHERE ' + conditions.join(' AND ');
            }

            const [websites] = await connection.query(websitesQuery, websitesParams);

            if (websites.length > 0) {
                const processedPaths = new Set();
                for (const site of websites) {
                    // Normalize path
                    const normalizedPath = path.resolve(site.rootPath).toLowerCase();

                    if (processedPaths.has(normalizedPath)) {
                        console.log(`[Backup] Skipping duplicate path for ${site.domain}: ${site.rootPath}`);
                        continue;
                    }

                    console.log(`[Backup] Processing Site: ${site.domain} Path: ${site.rootPath}`);
                    if (site.rootPath && fs.existsSync(site.rootPath)) {
                        archive.directory(site.rootPath, `domains/${site.domain}`);
                        processedPaths.add(normalizedPath);
                    } else {
                        archive.append(`Path not found: ${site.rootPath}`, { name: `domains/${site.domain}_error.txt` });
                    }
                }
            } else {
                archive.append(`No websites found.`, { name: 'domains/info.txt' });
            }
        }

        // 2. BACKUP DATABASES
        if (target === 'full' || target === 'database') {
            let dbQuery = 'SELECT name FROM `databases`';
            let dbParams = [];
            const dbConditions = [];

            if (!isAdmin) {
                dbConditions.push('userId = ?');
                dbParams.push(userId);
            }

            if (targetDomainId) {
                const [dOwner] = await connection.query('SELECT userId FROM websites WHERE id = ?', [targetDomainId]);
                if (dOwner.length > 0) {
                    if (isAdmin) {
                        dbConditions.push('userId = ?');
                        dbParams.push(dOwner[0].userId);
                    }
                }
            }

            if (dbConditions.length > 0) {
                dbQuery += ' WHERE ' + dbConditions.join(' AND ');
            }

            const [databases] = await connection.query(dbQuery, dbParams);

            if (databases.length > 0) {
                for (const db of databases) {
                    try {
                        const sqlContent = await generateSQLDump(connection, db.name);
                        archive.append(sqlContent, { name: `databases/${db.name}.sql` });
                    } catch (dbErr) {
                        archive.append(dbErr.message, { name: `databases/${db.name}_error.log` });
                    }
                }
            } else {
                archive.append('No databases found.', { name: 'databases/info.txt' });
            }
        }

        await connection.end();
        await archive.finalize();

    } catch (err) {
        if (connection) await connection.end();
    }
}

module.exports = router;
