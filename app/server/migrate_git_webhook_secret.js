const mysql = require('mysql2/promise');
require('dotenv').config({ path: './app/server/.env' });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if column exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'git_repos' AND COLUMN_NAME = 'webhookSecret'
        `, [dbConfig.database]);

        if (columns.length === 0) {
            console.log('Adding webhookSecret column to git_repos table...');
            await connection.query(`
                ALTER TABLE git_repos 
                ADD COLUMN webhookSecret VARCHAR(255) NULL AFTER deployPath
            `);
            console.log('Column added successfully.');

            // Generate secrets for existing repos
            const [repos] = await connection.query('SELECT id FROM git_repos WHERE webhookSecret IS NULL');
            if (repos.length > 0) {
                console.log(`Generating secrets for ${repos.length} existing repositories...`);
                const { v4: uuidv4 } = require('uuid');
                for (const repo of repos) {
                    const secret = uuidv4().replace(/-/g, '');
                    await connection.query('UPDATE git_repos SET webhookSecret = ? WHERE id = ?', [secret, repo.id]);
                }
                console.log('Secrets generated.');
            }
        } else {
            console.log('Column webhookSecret already exists. Skipping.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
