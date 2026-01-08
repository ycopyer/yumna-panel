const db = require('../config/db');

console.log('Generating massive security pattern dataset...');

// --- DATA SOURCES ---
const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'NULL', 'FROM', 'WHERE',
    'HAVING', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'FETCH', 'DECLARE', 'SET',
    'EXEC', 'EXECUTE', 'CAST', 'CONVERT', 'CHR', 'CHAR', 'CONCAT', 'COALESCE',
    'VERSION', 'DATABASE', 'USER', 'SESSION_USER', 'SYSTEM_USER', 'CURRENT_USER',
    'LOAD_FILE', 'OUTFILE', 'DUMPFILE', 'PROCEDURE', 'FUNCTION', 'CREATE', 'ALTER',
    'RENAME', 'TRUNCATE', 'REPLACE', 'MERGE', 'CALL', 'DESCRIBE', 'SHOW', 'USE',
    'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'LOCK', 'UNLOCK', 'PREPARE',
    'DEALLOCATE', 'SHUTDOWN', 'AVG', 'SUM', 'COUNT', 'MIN', 'MAX', 'STDDEV', 'VARIANCE',
    'information_schema', 'mysql.user', 'pg_catalog', 'sys.objects', 'xp_cmdshell'
];

const xssTags = [
    'script', 'iframe', 'object', 'embed', 'style', 'svg', 'math', 'img', 'body',
    'head', 'meta', 'link', 'base', 'input', 'form', 'textarea', 'keygen', 'select',
    'button', 'isindex', 'details', 'summary', 'dialog', 'applet', 'video', 'audio',
    'canvas', 'track', 'source', 'frame', 'frameset', 'noframes', 'noscript'
];

const xssEvents = [
    'onabort', 'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onblur', 'oncanplay',
    'oncanplaythrough', 'onchange', 'onclick', 'oncontextmenu', 'oncopy', 'oncuechange',
    'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave',
    'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended',
    'onerror', 'onfocus', 'onhashchange', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress',
    'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmousedown',
    'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onoffline',
    'ononline', 'onpagehide', 'onpageshow', 'onpaste', 'onpause', 'onplay', 'onplaying',
    'onpopstate', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onsearch',
    'onseeked', 'onseeking', 'onselect', 'onstalled', 'onstorage', 'onsubmit', 'onsuspend',
    'ontimeupdate', 'ontoggle', 'onunload', 'onvolumechange', 'onwaiting', 'onwheel'
];

const jsDangerous = [
    'javascript:', 'vbscript:', 'data:text/html', 'file:', 'alert(', 'confirm(', 'prompt(',
    'eval(', 'setTimeout(', 'setInterval(', 'Function(', 'document.cookie', 'document.domain',
    'document.write', 'window.location', 'parent.location', 'top.location'
];

const sqlTautologies = [
    "'1'='1'", '"1"="1"', "1=1", "1 LIKE 1", "'a'='a'", '"a"="a"', "10=10"
];

// --- GENERATOR ---
let rules = [];

// 1. Generate SQL Keyword Rules (Strict Word Boundary)
// Instead of one big regex, we create individual ones for management, 
// though the firewall aggregates them.
sqlKeywords.forEach(kw => {
    rules.push({
        type: 'sqli',
        pattern: String.raw`\b${kw}\b`,
        description: `SQL Keyword: ${kw}`
    });
});

// 2. SQL Hex/Encoding Variants (Simulated)
// For critical few, add hex variants
['UNION', 'SELECT', 'DROP'].forEach(kw => {
    rules.push({
        type: 'sqli',
        pattern: String.raw`0x[0-9a-fA-F]+`, // Generic hex detector
        description: `Possible Hex Encoded Payload related to ${kw}`
    });
});

// 3. SQL Injection Specific Symbols
rules.push({ type: 'sqli', pattern: String.raw`--\s`, description: 'SQL Comment Dash' });
rules.push({ type: 'sqli', pattern: String.raw`#\s`, description: 'SQL Comment Hash' });
rules.push({ type: 'sqli', pattern: String.raw`\/\*`, description: 'SQL Comment Block Start' });
rules.push({ type: 'sqli', pattern: String.raw`\*\/`, description: 'SQL Comment Block End' });
rules.push({ type: 'sqli', pattern: String.raw`;\s*DROP`, description: 'Stacked Drop' });
rules.push({ type: 'sqli', pattern: String.raw`;\s*DELETE`, description: 'Stacked Delete' });
rules.push({ type: 'sqli', pattern: String.raw`;\s*UPDATE`, description: 'Stacked Update' });

sqlTautologies.forEach(t => {
    rules.push({
        type: 'sqli',
        pattern: t.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), // Escape chars
        description: `Tautology: ${t}`
    });
});

// 4. XSS Tags (Opening tags)
xssTags.forEach(tag => {
    rules.push({
        type: 'xss',
        pattern: String.raw`<${tag}\b`,
        description: `Dangerous HTML Tag: <${tag}>`
    });
    rules.push({
        type: 'xss',
        pattern: String.raw`<\/${tag}>`,
        description: `Dangerous HTML Closing Tag: </${tag}>`
    });
});

// 5. XSS Events (Regex to catch attributes)
xssEvents.forEach(evt => {
    rules.push({
        type: 'xss',
        pattern: String.raw`\b${evt}\s*=`,
        description: `XSS Event Handler: ${evt}`
    });
});

// 6. Dangerous JS
jsDangerous.forEach(js => {
    rules.push({
        type: 'xss',
        pattern: js.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"),
        description: `Dangerous JS/Protocol: ${js}`
    });
});

// 7. Polyglots & Common Payloads (Sample)
const payloads = [
    "' OR '1'='1",
    '" OR "1"="1',
    "' OR 1=1 --",
    '" OR 1=1 --',
    "' UNION SELECT",
    '" UNION SELECT',
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "../../etc/passwd",
    "..\\..\\windows\\win.ini"
];

payloads.forEach((p, i) => {
    rules.push({
        type: p.includes('<') ? 'xss' : 'sqli',
        pattern: p.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"),
        description: `Known Payload #${i + 1}`
    });
});


// Filter duplicates
const uniqueRules = [];
const seen = new Set();
rules.forEach(r => {
    const key = r.type + ':' + r.pattern;
    if (!seen.has(key)) {
        seen.add(key);
        uniqueRules.push(r);
    }
});

console.log(`Generated ${uniqueRules.length} unique rules.`);

// INSERT INTO DB
db.query('TRUNCATE TABLE security_patterns', (err) => {
    if (err) console.error('Truncate error (ignoring):', err.message);

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

        // Insert in batches of 100
        const batchSize = 100;
        let p = Promise.resolve();

        for (let i = 0; i < uniqueRules.length; i += batchSize) {
            const batch = uniqueRules.slice(i, i + batchSize).map(r => [r.type, r.pattern, r.description]);
            p = p.then(() => new Promise((resolve, reject) => {
                db.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [batch], (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`Inserted batch ${i} to ${i + batch.length}`);
                        resolve();
                    }
                });
            }));
        }

        p.then(() => {
            console.log('All rules seeded successfully.');
            process.exit(0);
        }).catch(err => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
    });
});
