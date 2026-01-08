const db = require('../config/db');

console.log('Seeding comprehensive security patterns...');

const rules = [
    // --- SQL INJECTION (SQLi) ---
    // Keywords & Tautologies
    { type: 'sqli', pattern: String.raw`(\b(UNION([\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\b)`, description: 'High-risk SQL keywords' },
    { type: 'sqli', pattern: String.raw`('[\s]*OR[\s]*'1'[\s]*=[\s]*'1)|('[\s]*OR[\s]*1[\s]*=[\s]*1)|(1[\s]*=[\s]*1)|(1'[\s]*=[\s]*1')`, description: 'Classic Tautologies (OR 1=1)' },

    // Comments & Syntax
    { type: 'sqli', pattern: String.raw`(--\s)|(#\s)|(\/\*[\s\S]*?\*\/)`, description: 'SQL Comments' },
    { type: 'sqli', pattern: String.raw`[;]\s*(DECLARE|SET|DROP|EXEC|INSERT|UPDATE|DELETE)`, description: 'Stacked Queries (Semicolon)' },

    // Functions & Time-based
    { type: 'sqli', pattern: String.raw`(BENCHMARK\s*\(|SLEEP\s*\(|WAITFOR\s+DELAY|PG_SLEEP\s*\(|CTXSYS\.DRITHSX\.SN)`, description: 'Time-based Blind Injection' },
    { type: 'sqli', pattern: String.raw`(USER\s*\(|VERSION\s*\(|DATABASE\s*\(|@@version|@@datadir)`, description: 'Database Info Extraction' },

    // Advanced / Specific
    { type: 'sqli', pattern: String.raw`(information_schema|mysql\.user|sys\.objects|sys\.tables)`, description: 'System Table Access' },
    { type: 'sqli', pattern: String.raw`(LOAD_FILE\s*\(|INTO\s+(OUT|DUMP)FILE)`, description: 'File I/O Injection' },
    { type: 'sqli', pattern: String.raw`((%27)|(\'))\s*((\|\+)|(\|\|)|(&&)|(\bAND\b)|(\bOR\b))`, description: 'Quote-based Injection' },
    { type: 'sqli', pattern: String.raw`(\b(CAST|CONVERT|CHAR|CONCAT)\s*\()`, description: 'Data Type/String Manipulation' },

    // --- CROSS-SITE SCRIPTING (XSS) ---
    // Tags
    { type: 'xss', pattern: String.raw`<script\b[^>]*>|<\/script>`, description: 'Script Tags' },
    { type: 'xss', pattern: String.raw`<iframe\b[^>]*>|<frame\b[^>]*>|<object\b[^>]*>|<embed\b[^>]*>`, description: 'Embedding Tags' },
    { type: 'xss', pattern: String.raw`<style\b[^>]*>|<svg\b[^>]*>|<math\b[^>]*>`, description: 'Style/SVG/Math Tags' },
    { type: 'xss', pattern: String.raw`<body\b[^>]*>|<\/body>|<head\b[^>]*>|<meta\b[^>]*>`, description: 'Structure Tags' },

    // Attributes & Handlers
    { type: 'xss', pattern: String.raw`\bon\w+\s*=`, description: 'Event Handlers (onload, onerror, etc.)' },
    { type: 'xss', pattern: String.raw`(href|src|data)[\s]*=[\s]*["']?(javascript:|vbscript:|data:text\/html|file:)`, description: 'Dangerous Protocols' },
    { type: 'xss', pattern: String.raw`style[\s]*=[\s]*["']?.*(expression|behavior|url\s*\(|javascript:)`, description: 'CSS Injection' },

    // JS Functions & DOM
    { type: 'xss', pattern: String.raw`(alert|confirm|prompt|eval|setTimeout|setInterval|Function)\s*\(`, description: 'Dangerous JS Execution' },
    { type: 'xss', pattern: String.raw`document\.(cookie|domain|location|write|body\.innerHTML)`, description: 'DOM/Cookie Access' },
    { type: 'xss', pattern: String.raw`window\.(location|opener|name)`, description: 'Window Object Access' },

    // Encoding
    { type: 'xss', pattern: String.raw`(&#[xX]?[\da-fA-F]+;)|(\\u[\da-fA-F]{4})`, description: 'Suspicious Encoding' }, // Careful with this one
    { type: 'xss', pattern: String.raw`(base64\s*,)`, description: 'Base64 Data URI' }
];

// Perform Truncate and Insert
db.query('TRUNCATE TABLE security_patterns', (err) => {
    if (err) {
        // Fallback if table doesn't exist
        console.log('Table might not exist, creating...');
    }

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

    db.query(createTableQuery, (e) => {
        if (e) {
            console.error('Create table failed:', e.message);
            process.exit(1);
        }

        const values = rules.map(r => [r.type, r.pattern, r.description]);

        db.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [values], (insertErr) => {
            if (insertErr) {
                console.error('Insert failed:', insertErr.message);
            } else {
                console.log(`Successfully inserted ${values.length} comprehensive security rules.`);
            }
            process.exit(0);
        });
    });
});
