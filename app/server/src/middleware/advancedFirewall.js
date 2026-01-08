const db = require('../config/db');

/**
 * Advanced Firewall Middleware
 * Handles whitelist, geo-blocking, and rate limiting
 */

// In-memory cache for performance
const whitelistCache = new Set();
const geoblockCache = new Set();
const rateLimitStore = new Map();

// Refresh caches every 5 minutes
setInterval(() => {
    refreshWhitelist();
    refreshGeoblock();
}, 5 * 60 * 1000);

// Initial load
refreshWhitelist();
refreshGeoblock();

/**
 * Refresh whitelist cache from database
 */
function refreshWhitelist() {
    db.query('SELECT ip FROM firewall_whitelist', (err, results) => {
        if (!err && results) {
            whitelistCache.clear();
            results.forEach(row => whitelistCache.add(row.ip));
            console.log(`[Whitelist] Loaded ${whitelistCache.size} IPs`);
        }
    });
}

/**
 * Refresh geo-block cache from database
 */
function refreshGeoblock() {
    db.query('SELECT country_code FROM firewall_geoblock WHERE is_active = 1', (err, results) => {
        if (!err && results) {
            geoblockCache.clear();
            results.forEach(row => geoblockCache.add(row.country_code.toUpperCase()));
            console.log(`[Geo-Block] Loaded ${geoblockCache.size} blocked countries`);
        }
    });
}

/**
 * Check if IP is whitelisted
 */
const isWhitelisted = (ip) => {
    return whitelistCache.has(ip);
};

/**
 * Check if country is geo-blocked
 */
const isCountryBlocked = (countryCode) => {
    if (!countryCode) return false;
    return geoblockCache.has(countryCode.toUpperCase());
};

/**
 * Rate limiting check
 */
const checkRateLimit = (ip, endpoint = '*') => {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
        // Higher limit for polling endpoints
        const isPolling = endpoint.includes('/operations') || endpoint.includes('/pulse');
        rateLimitStore.set(key, {
            requests: [],
            maxRequests: isPolling ? 120 : 60, // 2 req/sec for polling, 1 req/sec default
            windowSeconds: 60
        });
    }

    const limiter = rateLimitStore.get(key);

    // Remove old requests outside the window
    const windowMs = limiter.windowSeconds * 1000;
    limiter.requests = limiter.requests.filter(timestamp => now - timestamp < windowMs);

    // Check if limit exceeded
    if (limiter.requests.length >= limiter.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.ceil((limiter.requests[0] + windowMs - now) / 1000)
        };
    }

    // Add current request
    limiter.requests.push(now);

    return {
        allowed: true,
        remaining: limiter.maxRequests - limiter.requests.length,
        resetIn: limiter.windowSeconds,
        maxRequests: limiter.maxRequests,
        count: limiter.requests.length
    };
};

/**
 * Get custom rate limit for specific IP
 */
const getCustomRateLimit = (ip, endpoint = '*') => {
    return new Promise((resolve) => {
        db.query(
            'SELECT max_requests, window_seconds FROM firewall_ratelimit WHERE ip = ? AND endpoint = ? AND is_active = 1',
            [ip, endpoint],
            (err, results) => {
                if (err || !results.length) {
                    // Check for wildcard endpoint
                    db.query(
                        'SELECT max_requests, window_seconds FROM firewall_ratelimit WHERE ip = ? AND endpoint = "*" AND is_active = 1',
                        [ip],
                        (err2, results2) => {
                            if (err2 || !results2.length) {
                                resolve(null);
                            } else {
                                resolve(results2[0]);
                            }
                        }
                    );
                } else {
                    resolve(results[0]);
                }
            }
        );
    });
};

const ThreatDetectionService = require('../services/threatDetection');
const { getClientIp } = require('../utils/helpers');

/**
 * Advanced Firewall Middleware
 */
const advancedFirewallCheck = async (req, res, next) => {
    const ip = getClientIp(req);

    // 1. Whitelist Check (highest priority)
    if (isWhitelisted(ip)) {
        req.isWhitelisted = true;
        return next();
    }

    // 2. Geo-blocking Check
    if (req.ipGeo && req.ipGeo.countryCode) {
        if (isCountryBlocked(req.ipGeo.countryCode)) {
            console.log(`[Geo-Block] Blocked ${ip} from ${req.ipGeo.country}`);
            return res.status(403).json({
                error: 'Access from your country is not allowed',
                country: req.ipGeo.country
            });
        }
    }

    // 3. Rate Limiting Check
    const endpoint = req.path;
    const customLimit = await getCustomRateLimit(ip, endpoint);
    if (customLimit) {
        const key = `${ip}:${endpoint}`;
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                requests: [],
                maxRequests: customLimit.max_requests,
                windowSeconds: customLimit.window_seconds
            });
        } else {
            const limiter = rateLimitStore.get(key);
            limiter.maxRequests = customLimit.max_requests;
            limiter.windowSeconds = customLimit.window_seconds;
        }
    }

    const rateLimit = checkRateLimit(ip, endpoint);

    // 4. Zero-Day Heuristics & Threat Detection
    // Analyze payload (body + query)
    const payloadBuffer = [
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
        JSON.stringify(req.query || {})
    ].join(' ');

    const context = {
        requestRate: rateLimit.count || 0,
        ip,
        path: req.path
    };

    const threatResult = await ThreatDetectionService.analyzePayload(payloadBuffer, context);

    if (threatResult.score > 0) {
        await ThreatDetectionService.logThreat(ip, threatResult, req);
        await ThreatDetectionService.updateReputation(ip, threatResult.score);

        if (threatResult.score >= 75) {
            console.log(`[Threat-Blocked] IP: ${ip} Score: ${threatResult.score} Findings:`, threatResult.findings);
            return res.status(403).json({
                error: 'Security Violation Detected',
                details: 'Payload heuristics triggered automated block.',
                threatScore: threatResult.score
            });
        }
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.maxRequests || 60);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetIn);

    if (!rateLimit.allowed) {
        console.log(`[Rate-Limit] Blocked ${ip} on ${endpoint}`);
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: rateLimit.resetIn
        });
    }

    next();
};

/**
 * Manual cache refresh functions (for API calls)
 */
const refreshCaches = () => {
    refreshWhitelist();
    refreshGeoblock();
};

module.exports = {
    advancedFirewallCheck,
    isWhitelisted,
    isCountryBlocked,
    checkRateLimit,
    refreshCaches,
    refreshWhitelist,
    refreshGeoblock
};
