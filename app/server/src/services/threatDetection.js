const db = require('../config/db');

/**
 * Shannon Entropy Calculation
 * Measures randomness of a string. 
 * High entropy (> 5.0) often indicates packed/encrypted/obfuscated data.
 */
function calculateEntropy(str) {
    if (!str) return 0;
    const len = str.length;
    const frequencies = {};
    for (let i = 0; i < len; i++) {
        const char = str[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in frequencies) {
        const p = frequencies[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

/**
 * Base Heuristic Rules (Fixed)
 */
const BASE_RULES = [
    { name: 'Base64 Shell Pattern', regex: /([A-Za-z0-9+/]{40,})={0,2}/g, score: 35 },
    { name: 'JS Eval Obfuscation', regex: /eval\s*\(\s*(atob|decodeURIComponent|unescape|String\.fromCharCode)/gi, score: 50 },
    { name: 'Suspicious Function Call', regex: /(system|exec|passthru|shell_exec|proc_open|popen)\s*\(/gi, score: 45 },
    { name: 'Long Hex String', regex: /([0-9a-fA-F]{2}){32,}/g, score: 30 },
    { name: 'PHP Command Injection', regex: /(base64_decode|gzuncompress|str_rot13)\s*\(/gi, score: 40 },
    { name: 'Directory Traversal', regex: /(\.\.\/|\.\.\\)/gi, score: 30 },
    { name: 'Reverse Shell Payload', regex: /(python -c|perl -e|bash -i|nc -e)/gi, score: 55 }
];

let customRules = [];
let lastPatternSync = 0;

/**
 * Load security patterns from DB
 */
async function syncPatterns() {
    if (Date.now() - lastPatternSync < 300000) return; // Sync every 5 min

    return new Promise((resolve) => {
        db.query('SELECT type, pattern, description FROM security_patterns WHERE isActive = 1', (err, results) => {
            if (!err && results) {
                customRules = results.map(r => ({
                    name: `Panel Rule: ${r.description || r.type.toUpperCase()}`,
                    regex: new RegExp(r.pattern, 'gi'),
                    score: r.type === 'sqli' ? 45 : r.type === 'xss' ? 35 : 25
                }));
                lastPatternSync = Date.now();
                console.log(`[SECURITY] Loaded ${customRules.length} custom patterns from panel.`);
            }
            resolve();
        });
    });
}

/**
 * Threat Detection Service
 */
class ThreatDetectionService {
    /**
     * Analyze a payload (e.g., request body, file content as string)
     */
    static async analyzePayload(content, context = {}) {
        if (!content || typeof content !== 'string') return { score: 0, findings: [] };

        let score = 0;
        const findings = [];

        // 1. Entropy Check
        const entropy = calculateEntropy(content);
        if (content.length > 200 && entropy > 5.2) {
            const extra = Math.min(20, (entropy - 5.2) * 10);
            score += 25 + extra;
            findings.push({ type: 'High Entropy', detail: `Entropy: ${entropy.toFixed(2)}`, score: 25 + extra });
        }

        // 2. Heuristic Pattern Matching
        await syncPatterns();
        const allRules = [...BASE_RULES, ...customRules];

        for (const rule of allRules) {
            if (rule.regex.test(content)) {
                score += rule.score;
                findings.push({ type: rule.name, detail: 'Pattern detected in payload', score: rule.score });
                // Reset regex for next search
                rule.regex.lastIndex = 0;
            }
        }

        // 3. Behavioral Factor (contextual)
        if (context.requestRate > 50) {
            score += 15;
            findings.push({ type: 'High Request Rate', detail: `${context.requestRate} req/min`, score: 15 });
        }

        return { score, findings };
    }

    /**
     * Update IP Behavioral Score in DB
     */
    static async updateReputation(ip, addedScore, violationType) {
        return new Promise((resolve) => {
            const query = `
                INSERT INTO security_reputation (ip, behavioral_score, total_violations, last_violation_at, risk_level)
                VALUES (?, ?, 1, NOW(), 'Low')
                ON DUPLICATE KEY UPDATE
                    behavioral_score = behavioral_score + ?,
                    total_violations = total_violations + 1,
                    last_violation_at = NOW(),
                    risk_level = CASE 
                        WHEN behavioral_score > 150 THEN 'Critical'
                        WHEN behavioral_score > 80 THEN 'High'
                        WHEN behavioral_score > 40 THEN 'Medium'
                        ELSE 'Low'
                    END
            `;
            db.query(query, [ip, addedScore, addedScore], (err) => {
                if (err) console.error('[ThreatDetection] Repo update error:', err.message);
                resolve();
            });
        });
    }

    /**
     * Log a detected threat
     */
    static async logThreat(ip, result, req) {
        const severity = result.score > 80 ? 'Critical' : result.score > 50 ? 'High' : result.score > 25 ? 'Medium' : 'Low';
        const details = JSON.stringify(result.findings);

        return new Promise((resolve) => {
            db.query(
                'INSERT INTO threat_logs (ip, threat_type, severity, score, details, request_path, request_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [ip, 'Heuristic/Behavioral', severity, result.score, details, req.path, req.method],
                (err) => {
                    if (err) console.error('[ThreatDetection] Log error:', err.message);
                    resolve();
                }
            );
        });
    }

    /**
     * Get security overview for dashboard
     */
    static async getSecurityStats() {
        return new Promise((resolve) => {
            const queries = {
                recentThreats: 'SELECT * FROM threat_logs ORDER BY created_at DESC LIMIT 50',
                malwareLogs: "SELECT * FROM activity_history WHERE action IN ('malware_blocked', 'ransomware_blocked', 'ransomware_alert') ORDER BY createdAt DESC LIMIT 50",
                highRiskIPs: 'SELECT * FROM security_reputation WHERE behavioral_score > 20 ORDER BY behavioral_score DESC LIMIT 10',
                totalThreats: 'SELECT COUNT(*) as count FROM threat_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
                threatTypes: 'SELECT threat_type, COUNT(*) as count FROM threat_logs GROUP BY threat_type'
            };

            Promise.all([
                new Promise(r => db.query(queries.recentThreats, (e, res) => r(res || []))),
                new Promise(r => db.query(queries.malwareLogs, (e, res) => r(res || []))),
                new Promise(r => db.query(queries.highRiskIPs, (e, res) => r(res || []))),
                new Promise(r => db.query(queries.totalThreats, (e, res) => r(res ? res[0].count : 0))),
                new Promise(r => db.query(queries.threatTypes, (e, res) => r(res || [])))
            ]).then(([recentThreats, malwareLogs, highRiskIPs, totalThreats, threatTypes]) => {

                // Map malware logs to threat format
                const malwareMapped = malwareLogs.map(m => ({
                    id: `mw_${m.id}`, // Virtual ID to prevent collision
                    ip: m.ipAddress,
                    threat_type: m.action.replace('_', ' ').toUpperCase(),
                    severity: 'Critical',
                    score: 100,
                    details: JSON.stringify([{ type: m.action, detail: m.description, score: 100 }]),
                    created_at: m.createdAt
                }));

                // Combine and Sort
                const combinedThreats = [...recentThreats, ...malwareMapped]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 50);

                resolve({ recentThreats: combinedThreats, highRiskIPs, totalThreats, threatTypes });
            });
        });
    }
}

module.exports = ThreatDetectionService;
