const db = require('../config/db');

console.log('Generating ULTIMATE security pattern dataset (Target: 500+ rules)...');

// --- 1. BASE LISTS (From Previous) ---
const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'NULL', 'FROM', 'WHERE',
    'HAVING', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'FETCH', 'DECLARE', 'SET',
    'EXEC', 'EXECUTE', 'CAST', 'CONVERT', 'CHR', 'CHAR', 'CONCAT', 'COALESCE',
    'VERSION', 'DATABASE', 'USER', 'SESSION_USER', 'SYSTEM_USER', 'CURRENT_USER',
    'LOAD_FILE', 'OUTFILE', 'DUMPFILE', 'PROCEDURE', 'FUNCTION', 'CREATE', 'ALTER',
    'RENAME', 'TRUNCATE', 'REPLACE', 'MERGE', 'CALL', 'DESCRIBE', 'SHOW', 'USE',
    'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'LOCK', 'UNLOCK', 'PREPARE',
    'DEALLOCATE', 'SHUTDOWN', 'AVG', 'SUM', 'COUNT', 'MIN', 'MAX', 'STDDEV', 'VARIANCE',
    'information_schema', 'mysql.user', 'pg_catalog', 'sys.objects', 'xp_cmdshell',
    'SYSOBJECTS', 'SYSCOLUMNS', 'SYSTYPES', 'SYSUSERS', 'SYSFILES', 'SYS.PASSWORDS',
    'WAITFOR', 'DELAY', 'SLEEP', 'BENCHMARK', 'PG_SLEEP', 'GENERATE_SERIES'
];

const xssTags = [
    'script', 'iframe', 'object', 'embed', 'style', 'svg', 'math', 'img', 'body',
    'head', 'meta', 'link', 'base', 'input', 'form', 'textarea', 'keygen', 'select',
    'button', 'isindex', 'details', 'summary', 'dialog', 'applet', 'video', 'audio',
    'canvas', 'track', 'source', 'frame', 'frameset', 'noframes', 'noscript', 'html',
    'plaintext', 'xmp', 'listing', 'marquee', 'blink', 'layer', 'ilayer', 'frameset'
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
    'ontimeupdate', 'ontoggle', 'onunload', 'onvolumechange', 'onwaiting', 'onwheel',
    'onanimationstart', 'onanimationend', 'onanimationiteration', 'ontransitionend',
    'onmessage', 'onpopstate', 'onfinish', 'onstart', 'onbounce'
];

const jsDangerous = [
    'javascript:', 'vbscript:', 'jscript:', 'livescript:', 'data:text/html', 'file:',
    'alert(', 'confirm(', 'prompt(', 'eval(', 'setTimeout(', 'setInterval(', 'Function(',
    'document.cookie', 'document.domain', 'document.write', 'window.location',
    'parent.location', 'top.location', 'window.open', 'window.name', 'history.pushState',
    'XMLHttpRequest', 'ActiveXObject', 'FileSystemObject'
];


let rules = [];

// --- GENERATOR LOGIC ---

// 1. Basic Keywords (SQLi)
sqlKeywords.forEach(kw => {
    rules.push({ type: 'sqli', pattern: String.raw`\b${kw}\b`, description: `SQL Keyword: ${kw}` });
    // Add common database-specific variations
    rules.push({ type: 'sqli', pattern: String.raw`\/\*!${kw}`, description: `MySQL Version Comment: ${kw}` });
});

// 2. Tautologies & Logic (SQLi)
const tautologies = [
    "1=1", "1=0", "0=1", "'1'='1'", '"1"="1"', "1 LIKE 1", "1>0", "'a'='a'", "'a'<>'b'",
    "11=11", "100=100", "True", "False", "connection_id()=connection_id()"
];
tautologies.forEach(t => {
    // Escaped version for regex
    const p = t.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    rules.push({ type: 'sqli', pattern: p, description: `Tautology: ${t}` });
    rules.push({ type: 'sqli', pattern: String.raw`\bOR\s+${p}`, description: `OR Tautology: ${t}` });
    rules.push({ type: 'sqli', pattern: String.raw`\bAND\s+${p}`, description: `AND Tautology: ${t}` });
});

// 3. Union-Based Injections (Deep)
for (let i = 1; i <= 10; i++) {
    const nulls = Array(i).fill('NULL').join(',');
    const nums = Array(i).fill('1').join(',');
    rules.push({ type: 'sqli', pattern: String.raw`UNION\s+SELECT\s+${nulls}`, description: `Union Select NULLs (${i})` });
    rules.push({ type: 'sqli', pattern: String.raw`UNION\s+SELECT\s+${nums}`, description: `Union Select Integers (${i})` });
    rules.push({ type: 'sqli', pattern: String.raw`UNION\s+ALL\s+SELECT\s+${nulls}`, description: `Union All Select NULLs (${i})` });
}

// 4. XSS Tags (Open, Close, Malformed)
xssTags.forEach(tag => {
    rules.push({ type: 'xss', pattern: String.raw`<${tag}\b`, description: `HTML Tag: <${tag}>` });
    rules.push({ type: 'xss', pattern: String.raw`<\/${tag}>`, description: `HTML Closing Tag: </${tag}>` });
    // Malformed/Obfuscated
    rules.push({ type: 'xss', pattern: String.raw`<${tag}\/`, description: `Self-closing variants: <${tag}/>` });
    rules.push({ type: 'xss', pattern: String.raw`<${tag}\s`, description: `Tag with space: <${tag} ` });
});

// 5. XSS Attributes
xssEvents.forEach(evt => {
    rules.push({ type: 'xss', pattern: String.raw`\b${evt}\s*=`, description: `Event Handler: ${evt}` });
    // Case insensitive is handled by regex 'i' flag at runtime, but adding spaced variants helps
    rules.push({ type: 'xss', pattern: String.raw`\b${evt}\s*\/`, description: `Event Handler Slash: ${evt}` });
});

// 6. Dangerous JS & Protocols
jsDangerous.forEach(js => {
    const p = js.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    rules.push({ type: 'xss', pattern: p, description: `Dangerous JS: ${js}` });
});

// 7. Advanced/Obfuscated Payloads (Mix of SQLi and XSS)
const advancedPayloads = [
    { t: 'sqli', p: String.raw`'||'`, d: 'String Concatenation' },
    { t: 'sqli', p: String.raw`' || '`, d: 'String Concatenation (Spaced)' },
    { t: 'sqli', p: String.raw`'+'`, d: 'MSSQL Concatenation' },
    { t: 'sqli', p: String.raw`"--`, d: 'Double Dash Comment' },
    { t: 'sqli', p: String.raw`#`, d: 'Hash Comment' },
    { t: 'sqli', p: String.raw`\/\*`, d: 'Block Comment Start' },
    { t: 'xss', p: String.raw`javascript&colon;`, d: 'Obfuscated Protocol' },
    { t: 'xss', p: String.raw`&#x`, d: 'Hex Entity' },
    { t: 'xss', p: String.raw`%3Cscript`, d: 'URL Encoded script' },
    { t: 'xss', p: String.raw`%3E`, d: 'URL Encoded >' },
    { t: 'sqli', p: String.raw`%27`, d: 'URL Encoded Quote' },
    { t: 'sqli', p: String.raw`%22`, d: 'URL Encoded Double Quote' },
    { t: 'sqli', p: String.raw`@@`, d: 'SQL Variable' }
];

advancedPayloads.forEach(item => {
    rules.push({ type: item.t, pattern: item.p, description: item.d });
});


// Filter duplicates
const uniqueRules = [];
const seen = new Set();
rules.forEach(r => {
    // Normalize logic
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
                        console.log(`Inserted batch ${i} to ${Math.min(i + batchSize, uniqueRules.length)}`);
                        resolve();
                    }
                });
            }));
        }

        p.then(() => {
            console.log('ULTIMATE Security Seed Complete.');
            process.exit(0);
        }).catch(err => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
    });
});
