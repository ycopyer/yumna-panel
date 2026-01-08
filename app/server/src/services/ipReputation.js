const axios = require('axios');
const db = require('../config/db');

/**
 * IP Reputation Service
 * Integrates with AbuseIPDB API to check IP reputation
 */

const ABUSEIPDB_API_KEY = process.env.ABUSE_IPDB_KEY || process.env.ABUSEIPDB_API_KEY || '';
const CACHE_DURATION_HOURS = 24;

// Initialize Table if not exists
db.query(`
    CREATE TABLE IF NOT EXISTS ip_reputation_cache (
        ip VARCHAR(45) PRIMARY KEY,
        abuse_score INT DEFAULT 0,
        is_whitelisted TINYINT(1) DEFAULT 0,
        is_tor TINYINT(1) DEFAULT 0,
        usage_type VARCHAR(255),
        isp VARCHAR(255),
        domain VARCHAR(255),
        total_reports INT DEFAULT 0,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) console.error('[DB] Failed to initialize ip_reputation_cache:', err.message);
});

/**
 * Check IP reputation using AbuseIPDB
 * @param {string} ip - IP address to check
 * @returns {Promise<Object>} Reputation data
 */
const checkIPReputation = async (ip) => {
    // Skip local IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
            ip,
            abuseScore: 0,
            isWhitelisted: false,
            isTor: false,
            totalReports: 0,
            usageType: 'Private',
            isp: 'Local Network'
        };
    }

    // Check cache first
    const cached = await getCachedReputation(ip);
    if (cached) {
        return cached;
    }

    // If no API key, return neutral score
    if (!ABUSEIPDB_API_KEY) {
        console.log('AbuseIPDB API key not configured, skipping reputation check');
        return {
            ip,
            abuseScore: 0,
            isWhitelisted: false,
            isTor: false,
            totalReports: 0,
            usageType: 'Unknown',
            isp: 'Unknown'
        };
    }

    try {
        const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            params: {
                ipAddress: ip,
                maxAgeInDays: 90,
                verbose: true
            },
            headers: {
                'Key': ABUSEIPDB_API_KEY,
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        const data = response.data.data;
        const reputation = {
            ip,
            abuseScore: data.abuseConfidenceScore || 0,
            isWhitelisted: data.isWhitelisted || false,
            isTor: data.isTor || false,
            totalReports: data.totalReports || 0,
            usageType: data.usageType || 'Unknown',
            isp: data.isp || 'Unknown',
            domain: data.domain || null
        };

        // Cache the result
        await cacheReputation(reputation);

        return reputation;
    } catch (error) {
        console.error('AbuseIPDB API Error:', error.message);
        // Return neutral score on error
        return {
            ip,
            abuseScore: 0,
            isWhitelisted: false,
            isTor: false,
            totalReports: 0,
            usageType: 'Unknown',
            isp: 'Unknown'
        };
    }
};

/**
 * Get FULL IP details including reports from AbuseIPDB
 * @param {string} ip - IP address to check
 * @returns {Promise<Object>} Full detail data
 */
const getIPAbuseDetails = async (ip) => {
    // Skip local IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
            ipAddress: ip,
            isPublic: false,
            abuseConfidenceScore: 0,
            countryCode: 'LCL',
            countryName: 'Local Network',
            isp: 'Internal Infrastructure',
            usageType: 'Private IP Address',
            reports: []
        };
    }

    if (!ABUSEIPDB_API_KEY) {
        throw new Error('AbuseIPDB API key not configured');
    }

    try {
        const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            params: {
                ipAddress: ip,
                maxAgeInDays: 90,
                verbose: true
            },
            headers: {
                'Key': ABUSEIPDB_API_KEY,
                'Accept': 'application/json'
            },
            timeout: 8000
        });

        if (!response.data || !response.data.data) {
            return { error: 'Invalid response from AbuseIPDB' };
        }

        return response.data.data;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.errors?.[0]?.detail || error.message;
        console.error(`[AbuseIPDB] Full Detail Error (${status}):`, msg);
        return { error: `AbuseIPDB Error: ${msg}`, status };
    }
};

/**
 * Get cached reputation data
 */
const getCachedReputation = (ip) => {
    return new Promise((resolve) => {
        const query = `
            SELECT * FROM ip_reputation_cache 
            WHERE ip = ? 
            AND last_checked > DATE_SUB(NOW(), INTERVAL ? HOUR)
        `;

        db.query(query, [ip, CACHE_DURATION_HOURS], (err, results) => {
            if (err || !results.length) {
                resolve(null);
            } else {
                const row = results[0];
                resolve({
                    ip: row.ip,
                    abuseScore: row.abuse_score,
                    isWhitelisted: row.is_whitelisted,
                    isTor: row.is_tor,
                    totalReports: row.total_reports,
                    usageType: row.usage_type,
                    isp: row.isp,
                    domain: row.domain
                });
            }
        });
    });
};

/**
 * Cache reputation data
 */
const cacheReputation = (reputation) => {
    return new Promise((resolve) => {
        const query = `
            INSERT INTO ip_reputation_cache 
            (ip, abuse_score, is_whitelisted, is_tor, usage_type, isp, domain, total_reports, last_checked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                abuse_score = VALUES(abuse_score),
                is_whitelisted = VALUES(is_whitelisted),
                is_tor = VALUES(is_tor),
                usage_type = VALUES(usage_type),
                isp = VALUES(isp),
                domain = VALUES(domain),
                total_reports = VALUES(total_reports),
                last_checked = NOW()
        `;

        db.query(query, [
            reputation.ip,
            reputation.abuseScore,
            reputation.isWhitelisted,
            reputation.isTor,
            reputation.usageType,
            reputation.isp,
            reputation.domain,
            reputation.totalReports
        ], (err) => {
            if (err) console.error('Cache error:', err);
            resolve();
        });
    });
};

/**
 * Report IP to AbuseIPDB
 */
const reportIP = async (ip, categories, comment) => {
    if (!ABUSEIPDB_API_KEY) {
        console.log('AbuseIPDB API key not configured, skipping report');
        return false;
    }

    try {
        await axios.post('https://api.abuseipdb.com/api/v2/report', {
            ip,
            categories: categories.join(','), // e.g., [18, 21] for brute force
            comment
        }, {
            headers: {
                'Key': ABUSEIPDB_API_KEY,
                'Accept': 'application/json'
            }
        });

        console.log(`Reported IP ${ip} to AbuseIPDB`);
        return true;
    } catch (error) {
        console.error('AbuseIPDB Report Error:', error.message);
        return false;
    }
};

module.exports = {
    checkIPReputation,
    getIPAbuseDetails,
    reportIP
};
