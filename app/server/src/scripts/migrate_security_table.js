const db = require('../config/db');

console.log('Migrating security patterns to dedicated table...');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS security_patterns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('sqli', 'xss') NOT NULL,
        pattern TEXT NOT NULL,
        description VARCHAR(255),
        isActive TINYINT DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`;

db.query(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
        process.exit(1);
    }
    console.log('Table security_patterns ensured.');

    // Seed Data
    db.query('SELECT COUNT(*) as count FROM security_patterns', (err, results) => {
        if (!err && results[0].count === 0) {
            const rules = [
                // SQL Injection Rules
                { type: 'sqli', pattern: String.raw`(\b(UNION([\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\b)`, description: 'Common SQL Keywords' },
                { type: 'sqli', pattern: String.raw`[;]\s*(DECLARE|SET|DROP|EXEC)`, description: 'Stacked Queries' },
                { type: 'sqli', pattern: String.raw`(--\s)|(#\s)|(\/\*[\s\S]*?\*\/)`, description: 'SQL Comments' },
                { type: 'sqli', pattern: String.raw`('[\s]*OR[\s]*'1'[\s]*=[\s]*'1)|('[\s]*OR[\s]*1[\s]*=[\s]*1)|(1[\s]*=[\s]*1)`, description: 'Tautologies (OR 1=1)' },
                { type: 'sqli', pattern: String.raw`(BENCHMARK\()|(SLEEP\()|(WAITFOR\s+DELAY)`, description: 'Time-based Injection' },

                // XSS Rules
                { type: 'xss', pattern: String.raw`<script\b[^>]*>|<\/script>`, description: 'Script Tags' },
                { type: 'xss', pattern: String.raw`<iframe\b[^>]*>|<object\b[^>]*>|<embed\b[^>]*>|<style\b[^>]*>|<svg\b[^>]*>`, description: 'Dangerous HTML Tags' },
                { type: 'xss', pattern: String.raw`javascript:|vbscript:|data:text\/html`, description: 'Dangerous Protocols' },
                { type: 'xss', pattern: String.raw`on\w+\s*=`, description: 'Event Handlers' },
                { type: 'xss', pattern: String.raw`alert\(|confirm\(|prompt\(|eval\(`, description: 'Dangerous JS Functions' },
                { type: 'xss', pattern: String.raw`document\.cookie|document\.domain`, description: 'DOM Access' }
            ];

            const values = rules.map(r => [r.type, r.pattern, r.description]);
            db.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [values], (e) => {
                if (e) {
                    console.error('Error seeding security patterns:', e.message);
                } else {
                    console.log('Security patterns seeded successfully.');
                }
                process.exit(0);
            });
        } else {
            console.log('Security patterns already exist or error accessing table.');
            process.exit(0);
        }
    });
});
