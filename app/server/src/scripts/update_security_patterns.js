const db = require('../config/db');

const defaultSqli = String.raw`(\b(UNION([\s]+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?|GRANT|REVOKE|SHUTDOWN|DECLARE)\b[\s\S]*|[;]\s*(DECLARE|SET|DROP|EXEC)|(--\s)|(#\s)|(\/\*[\s\S]*?\*\/)|('[\s]*OR[\s]*'1'[\s]*=[\s]*'1)|('[\s]*OR[\s]*1[\s]*=[\s]*1)|(1[\s]*=[\s]*1)|(BENCHMARK\()|(SLEEP\()|(WAITFOR\s+DELAY))`;
const defaultXss = String.raw`(<script\b[^>]*>|<\/script>|<iframe\b[^>]*>|<object\b[^>]*>|<embed\b[^>]*>|<style\b[^>]*>|<svg\b[^>]*>|javascript:|vbscript:|data:text\/html|on\w+\s*=|alert\(|confirm\(|prompt\(|eval\(|document\.cookie|document\.domain)`;

console.log('Updating security patterns in database...');

const queries = [
    { key: 'security_sqli_patterns', value: defaultSqli },
    { key: 'security_xss_patterns', value: defaultXss }
];

let completed = 0;

queries.forEach(q => {
    db.query('INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)',
        [q.key, q.value],
        (err) => {
            if (err) {
                console.error(`Error updating ${q.key}:`, err.message);
            } else {
                console.log(`Successfully updated ${q.key}`);
            }
            completed++;
            if (completed === queries.length) {
                console.log('All patterns updated.');
                process.exit(0);
            }
        });
});
