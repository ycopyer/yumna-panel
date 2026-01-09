const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const { auditLogger } = require('../../middleware/audit');

const checkDatabaseOwnership = async (req, res, next) => {
    const dbId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    if (isAdmin) return next();

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT userId FROM `databases` WHERE id = ?', [dbId]);
        await connection.end();

        if (rows.length === 0) return res.status(404).json({ error: 'Database not found' });
        if (rows[0].userId != userId) return res.status(403).json({ error: 'Access denied' });

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

// Root connection for admin tasks (creating DBs, Users)
// WARNING: This requires the DB_USER to have CREATE/GRANT privileges.
async function getAdminConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });
}

// --- DATABASES ---

// List Databases (Metadata + Real Stats)
router.get('/databases', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        let query = 'SELECT * FROM `databases`';
        let params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';
        const [rows] = await connection.query(query, params);


        // Fetch real stats from information_schema
        const adminConn = await getAdminConnection();

        const statsPromises = rows.map(async (db) => {
            try {
                const [statRows] = await adminConn.query(`
                    SELECT 
                        table_schema AS name, 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                        COUNT(*) AS table_count 
                    FROM information_schema.tables 
                    WHERE table_schema = ? 
                    GROUP BY table_schema`, [db.name]);

                if (statRows.length > 0) {
                    return { ...db, size_mb: statRows[0].size_mb, table_count: statRows[0].table_count };
                }
                return { ...db, size_mb: 0, table_count: 0 };
            } catch (e) {
                return { ...db, size_mb: 0, table_count: 0, error: 'Stats error' };
            }
        });

        const enrichedRows = await Promise.all(statsPromises);
        await adminConn.end();
        await connection.end();

        res.json(enrichedRows);
    } catch (err) {
        if (connection) await connection.end();
        res.status(500).json({ error: err.message });
    }
});

// Create Database & User
router.post('/databases', requireAuth, auditLogger('CREATE_DATABASE'), async (req, res) => {
    const { name, user, password } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';


    // Basic validation
    if (!/^[a-zA-Z0-9_]+$/.test(name) || !/^[a-zA-Z0-9_]+$/.test(user)) {
        return res.status(400).json({ error: 'Invalid database or username format (Alphanumeric and underscore only)' });
    }

    let connection;
    let adminConn;

    try {
        connection = await mysql.createConnection(dbConfig);

        // --- QUOTA CHECK ---
        if (!isAdmin) {
            const [userResolves] = await connection.query('SELECT max_databases FROM users WHERE id = ?', [userId]);
            // Default to 3 if not set
            const maxDatabases = userResolves[0]?.max_databases ?? 3;

            const [countResolves] = await connection.query('SELECT COUNT(*) as count FROM `databases` WHERE userId = ?', [userId]);
            const currentCount = countResolves[0].count;

            if (currentCount >= maxDatabases) {
                await connection.end();
                return res.status(403).json({
                    error: `You have reached your limit of ${maxDatabases} databases. Please upgrade your plan.`
                });
            }
        }
        // -------------------
        adminConn = await getAdminConnection();

        await connection.beginTransaction();

        // 1. Create actual MySQL Database
        await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);

        // 2. Create actual MySQL User
        // Check if user exists first? - For now, IF NOT EXISTS or DROP/CREATE
        // Using MySQL 5.7/8.0 compatible syntax
        try {
            await adminConn.query(`CREATE USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
        } catch (e) {
            if (e.code === 'ER_CANNOT_USER') {
                // User might exist, update password? Or fail?
                // Let's retry with ALTER/SET PASSWORD or just Assume exists
                await adminConn.query(`ALTER USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
            } else {
                throw e;
            }
        }

        // 3. Grant Privileges
        await adminConn.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${user}'@'localhost'`);
        await adminConn.query('FLUSH PRIVILEGES');

        // 4. Save Record in Panel DB
        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [userId, name, user, password]
        );

        await connection.commit();
        res.status(201).json({ message: 'Database and User created successfully' });

    } catch (err) {
        if (connection) await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY' || err.code === 1062) {
            return res.status(409).json({ error: 'Database name already exists' });
        }
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
        if (adminConn) await adminConn.end();
    }
});

// Delete Database
router.delete('/databases/:id', requireAuth, checkDatabaseOwnership, auditLogger('DELETE_DATABASE'), async (req, res) => {

    let connection;
    let adminConn;
    try {
        connection = await mysql.createConnection(dbConfig);
        adminConn = await getAdminConnection();

        const [rows] = await connection.query('SELECT * FROM `databases` WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Database not found' });

        const dbInfo = rows[0];

        // 1. Drop MySQL Database
        await adminConn.query(`DROP DATABASE IF EXISTS \`${dbInfo.name}\``);

        // 2. Drop MySQL User (Optional? User might be shared. Use caution)
        // Check if user is used by other DBs within our panel?
        const [userUsage] = await connection.query('SELECT count(*) as count FROM `databases` WHERE user = ? AND id != ?', [dbInfo.user, dbInfo.id]);
        if (userUsage[0].count === 0) {
            await adminConn.query(`DROP USER IF EXISTS '${dbInfo.user}'@'localhost'`);
        }

        // 3. Delete Record
        await connection.query('DELETE FROM `databases` WHERE id = ?', [req.params.id]);

        res.json({ message: 'Database deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
        if (adminConn) await adminConn.end();
    }
});

// Clone Database (Simple Dump/Restore simulation or CREATE TABLE ... SELECT)
router.post('/databases/:id/clone', requireAuth, checkDatabaseOwnership, async (req, res) => {

    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'New database name required' });

    let connection;
    let adminConn;
    try {
        connection = await mysql.createConnection(dbConfig);
        adminConn = await getAdminConnection();

        const [rows] = await connection.query('SELECT * FROM `databases` WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Source database not found' });
        const sourceDb = rows[0];

        // 1. Create New DB
        await adminConn.query(`CREATE DATABASE \`${newName}\``);

        // 2. Copy Tables
        // Get tables in source
        const [tables] = await adminConn.query(`SHOW TABLES FROM \`${sourceDb.name}\``);
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            // Create Table LIKE
            await adminConn.query(`CREATE TABLE \`${newName}\`.\`${tableName}\` LIKE \`${sourceDb.name}\`.\`${tableName}\``);
            // Insert Data
            await adminConn.query(`INSERT INTO \`${newName}\`.\`${tableName}\` SELECT * FROM \`${sourceDb.name}\`.\`${tableName}\``);
        }

        // 3. Create Record
        // Re-use source user? Or prompt? Assuming reuse for now or creating same user
        // Ideally we should create a new user or map the same user.
        // Let's map the SAME user to the new clone.
        await adminConn.query(`GRANT ALL PRIVILEGES ON \`${newName}\`.* TO '${sourceDb.user}'@'localhost'`);
        await adminConn.query('FLUSH PRIVILEGES');

        await connection.query(
            'INSERT INTO `databases` (userId, name, user, password) VALUES (?, ?, ?, ?)',
            [sourceDb.userId, newName, sourceDb.user, sourceDb.password]
        );

        res.json({ message: 'Database cloned successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
        if (adminConn) await adminConn.end();
    }
});

// Rename Database (Not standard in MySQL, so we Clone + Drop Old)
router.post('/databases/:id/rename', requireAuth, checkDatabaseOwnership, async (req, res) => {

    // reuse clone logic + delete logic?
    // For now just implementing placeholder or reusing logic.
    // To strictly "Rename", we do Clone (see above) then Delete Old.
    // Implementing this is effectively the same as "Clone" but with a DELETE at the end.
    res.status(501).json({ error: 'Not implemented. Use Clone then Delete.' });
});

// --- USER MANAGEMENT ---

// List all MySQL Users (for selection)
router.get('/database-users', requireAdmin, async (req, res) => {
    let adminConn;
    try {
        adminConn = await getAdminConnection();
        const [rows] = await adminConn.query(`SELECT User, Host FROM mysql.user WHERE User NOT IN ('root', 'mysql.session', 'mysql.sys', 'mariadb.sys')`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (adminConn) await adminConn.end();
    }
});

// Create MySQL User
router.post('/database-users', requireAdmin, async (req, res) => {
    const { username, password } = req.body;
    // Validate
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Invalid username' });

    let adminConn;
    try {
        adminConn = await getAdminConnection();
        await adminConn.query(`CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}'`);
        // No grants yet
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (adminConn) await adminConn.end();
    }
});

// Reset Password
router.put('/database-users/:user/password', requireAdmin, async (req, res) => {
    const { password } = req.body;
    let adminConn;
    try {
        adminConn = await getAdminConnection();
        await adminConn.query(`ALTER USER '${req.params.user}'@'localhost' IDENTIFIED BY '${password}'`);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (adminConn) await adminConn.end();
    }
});

// --- DB ASSIGNMENT ---

// List Users assigned to specific DB
router.get('/databases/:name/users', requireAdmin, async (req, res) => {
    let adminConn;
    try {
        adminConn = await getAdminConnection();
        // Check mysql.db for database specific privileges
        const [rows] = await adminConn.query(`SELECT User FROM mysql.db WHERE Db = ? AND User NOT IN ('root')`, [req.params.name]);
        res.json(rows);
    } catch (err) {
        // Fallback if no access to mysql.db
        res.json([]);
    } finally {
        if (adminConn) await adminConn.end();
    }
});

// Grant User to DB
router.post('/databases/:name/grant', requireAdmin, async (req, res) => {
    const { username, privileges } = req.body; // privileges array or 'ALL'
    let adminConn;
    try {
        adminConn = await getAdminConnection();
        const privString = privileges === 'ALL' ? 'ALL PRIVILEGES' : (Array.isArray(privileges) ? privileges.join(', ') : 'ALL PRIVILEGES');

        await adminConn.query(`GRANT ${privString} ON \`${req.params.name}\`.* TO '${username}'@'localhost'`);
        await adminConn.query('FLUSH PRIVILEGES');

        res.json({ message: 'Privileges granted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (adminConn) await adminConn.end();
    }
});

// Revoke User from DB
router.post('/databases/:name/revoke', requireAdmin, async (req, res) => {
    const { username } = req.body;
    let adminConn;
    try {
        adminConn = await getAdminConnection();
        await adminConn.query(`REVOKE ALL PRIVILEGES ON \`${req.params.name}\`.* FROM '${username}'@'localhost'`);
        await adminConn.query('FLUSH PRIVILEGES');
        res.json({ message: 'Access revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (adminConn) await adminConn.end();
    }
});

module.exports = router;
