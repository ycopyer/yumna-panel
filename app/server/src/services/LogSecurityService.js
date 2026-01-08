const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../config/db');
const ThreatDetectionService = require('./threatDetection');

/**
 * LogSecurityService
 * Monitors Web Server (Nginx/Apache) logs in real-time to detect attack patterns
 */
class LogSecurityService {
    constructor() {
        this.watchers = new Map();
        this.logPositions = new Map();
        this.isWin = os.platform() === 'win32';
        this.baseLogPath = this.isWin ? 'C:\\YumnaPanel\\logs' : '/var/log/yumnapanel';

        // Security Tracking & Cache
        this.statusCounters = new Map(); // IP -> { code -> { count, firstHit } }
        this.whitelist = new Set();
        this.geoblock = new Set();
        this.geoCache = new Map(); // IP -> countryCode (Cache for performance)
        this.settings = {
            threshold: 4, // Changed to 4 to match panel default
            codes: ['404', '403'],
            window: 60 // seconds
        };

        // Specific log files to watch (Main logs)
        this.logFiles = [
            path.join(this.isWin ? 'C:\\YumnaPanel\\bin\\web\\nginx\\logs' : '/var/log/nginx', 'access.log'),
            path.join(this.isWin ? 'C:\\YumnaPanel\\bin\\web\\apache2\\logs' : '/var/log/apache2', 'access.log')
        ];

        // Directories to watch (VHost logs)
        this.logDirs = [
            path.join(this.baseLogPath, 'nginx'),
            path.join(this.baseLogPath, 'apache')
        ];

        // Load all configurations from DB
        this.refreshAllConfig();
        setInterval(() => this.refreshAllConfig(), 300000); // Sync every 5 min
    }

    /**
     * Refresh all security configurations from DB (Settings, Whitelist, Geoblock)
     */
    async refreshAllConfig() {
        // 1. Refresh Settings
        db.query(
            'SELECT key_name, value_text FROM settings WHERE key_name IN (?, ?, ?)',
            ['firewall_threshold', 'firewall_window', 'firewall_codes'],
            (err, results) => {
                if (!err && results) {
                    results.forEach(r => {
                        if (r.key_name === 'firewall_threshold') this.settings.threshold = parseInt(r.value_text) || 4;
                        if (r.key_name === 'firewall_window') this.settings.window = parseInt(r.value_text) || 60;
                        if (r.key_name === 'firewall_codes') this.settings.codes = r.value_text.split(',').map(c => c.trim());
                    });
                }
            }
        );

        // 2. Refresh Whitelist
        db.query('SELECT ip FROM firewall_whitelist', (err, results) => {
            if (!err && results) {
                this.whitelist.clear();
                results.forEach(row => this.whitelist.add(row.ip));
            }
        });

        // 3. Refresh Geoblock
        db.query('SELECT country_code FROM firewall_geoblock WHERE is_active = 1', (err, results) => {
            if (!err && results) {
                this.geoblock.clear();
                results.forEach(row => this.geoblock.add(row.country_code.toUpperCase()));
            }
        });

        console.log(`[SECURITY-LOG] Config Synced: ${this.whitelist.size} whitelisted, ${this.geoblock.size} geoblocked.`);
    }

    /**
     * Start the monitoring service
     */
    async start() {
        console.log('[SECURITY-LOG] Initializing Web Server Log Monitor...');

        // 1. Ensure log directories exist
        const allDirs = [...this.logDirs, ...this.logFiles.map(f => path.dirname(f))];
        for (const dir of allDirs) {
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`[SECURITY-LOG] Created log directory: ${dir}`);
                } catch (e) { }
            }
        }

        // 2. Initial scan of existing log files
        this.scanAll();

        // 3. Watch directories for new log files
        for (const dir of this.logDirs) {
            if (fs.existsSync(dir)) {
                fs.watch(dir, (eventType, filename) => {
                    if (filename && filename.endsWith('.access.log')) {
                        const filePath = path.join(dir, filename);
                        if (fs.existsSync(filePath) && !this.watchers.has(filePath)) {
                            this.watchFile(filePath);
                        }
                    }
                });
            }
        }

        // Periodic scan for new files
        setInterval(() => this.scanAll(), 60000);
    }

    /**
     * Scan all configured files and directories
     */
    scanAll() {
        // Scan specific files
        for (const filePath of this.logFiles) {
            if (fs.existsSync(filePath) && !this.watchers.has(filePath)) {
                this.watchFile(filePath);
            }
        }

        // Scan directories
        for (const dir of this.logDirs) {
            try {
                if (!fs.existsSync(dir)) continue;
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (file.endsWith('.access.log')) {
                        const filePath = path.join(dir, file);
                        if (!this.watchers.has(filePath)) {
                            this.watchFile(filePath);
                        }
                    }
                }
            } catch (e) {
                console.error(`[SECURITY-LOG] Error scanning directory ${dir}:`, e.message);
            }
        }
    }

    /**
     * Watch a specific log file
     */
    watchFile(filePath) {
        console.log(`[SECURITY-LOG] Now watching: ${filePath}`);

        // Get current size to start watching from the end (don't parse entire history on restart)
        try {
            const stats = fs.statSync(filePath);
            this.logPositions.set(filePath, stats.size);

            const msg = `[SECURITY-LOG] Now watching: ${filePath} (Size: ${stats.size})`;
            console.log(msg);
            fs.appendFileSync('C:\\YumnaPanel\\logs\\security_init.log', `[${new Date().toISOString()}] ${msg}\n`);

            const watcher = fs.watch(filePath, (eventType) => {
                if (eventType === 'change') {
                    this.processChanges(filePath);
                }
            });

            this.watchers.set(filePath, watcher);
        } catch (e) {
            console.error(`[SECURITY-LOG] Failed to watch ${filePath}:`, e.message);
        }
    }

    /**
     * Read and process new lines in a log file
     */
    processChanges(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const prevSize = this.logPositions.get(filePath) || 0;
            const curSize = stats.size;

            if (curSize <= prevSize) {
                this.logPositions.set(filePath, curSize);
                return;
            }

            const bufferSize = curSize - prevSize;
            const buffer = Buffer.alloc(bufferSize);
            const fd = fs.openSync(filePath, 'r');

            fs.readSync(fd, buffer, 0, bufferSize, prevSize);
            fs.closeSync(fd);

            this.logPositions.set(filePath, curSize);

            const newContent = buffer.toString('utf8');
            const lines = newContent.split(/\r?\n/);

            for (const line of lines) {
                if (line.trim()) {
                    this.analyzeLogLine(line, filePath);
                }
            }
        } catch (e) {
            // File might have been rotated or deleted
            if (e.code === 'ENOENT') {
                this.stopWatching(filePath);
            }
        }
    }

    /**
     * Stop watching a file
     */
    stopWatching(filePath) {
        const watcher = this.watchers.get(filePath);
        if (watcher) {
            watcher.close();
            this.watchers.delete(filePath);
            this.logPositions.delete(filePath);
            console.log(`[SECURITY-LOG] Stopped watching: ${filePath}`);
        }
    }

    /**
     * Parse Nginx/Apache Combined Log Line and Analyze
     * Format: IP - - [Date] "Method Path Protocol" Status Size "Referer" "User-Agent"
     */
    async analyzeLogLine(line, filePath) {
        fs.appendFileSync('C:\\YumnaPanel\\logs\\security_debug.log', `[${new Date().toISOString()}] Processing line from ${path.basename(filePath)}: ${line.substring(0, 100)}\n`);
        try {
            // Updated Regex for combined log format (Captures: IP, Method, Path, Status)
            const logMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}).*?"(\w+)\s+(.*?)\s+.*?"\s+(\d{3})\s+/);
            if (!logMatch) return;

            const [_, ip, method, fullPath, status] = logMatch;

            // 1. Whitelist Check (Critical: Never block whitelisted IPs)
            if (this.whitelist.has(ip)) return;

            const domain = path.basename(filePath).replace('.access.log', '');

            // 2. Fetch Geo Info & Log to Map (Optional: Log all hits to map if desired)
            const geo = await this.getIPGeo(ip);

            // 3. Geo-blocking Check
            if (this.geoblock.size > 0 && geo && geo.countryCode) {
                if (this.geoblock.has(geo.countryCode.toUpperCase())) {
                    console.warn(`[SECURITY-LOG] Geo-blocked IP ${ip} accessed ${domain}`);
                    return this.autoBlockIP(ip, {
                        score: 100,
                        geo,
                        findings: [{ type: 'Geo-Block', detail: `Country ${geo.countryCode} is blocked in panel settings`, score: 100 }]
                    }, fullPath, method, domain);
                }
            }

            // Decoded path for analysis
            let decodedPath = fullPath;
            try { decodedPath = decodeURIComponent(fullPath); } catch (e) { }

            // 4. Monitor for Attack Payloads in URL
            const result = await ThreatDetectionService.analyzePayload(decodedPath);
            if (result.score > 25) {
                console.warn(`[SECURITY-LOG] Threat detected on ${domain}: ${result.score} pts from ${ip}`);
                result.geo = geo;
                if (result.score >= 50) {
                    return this.autoBlockIP(ip, result, decodedPath, method, domain);
                } else {
                    ThreatDetectionService.logThreat(ip, result, { path: decodedPath, method });
                    this.logToMap(ip, geo, `[SOFT-THREAT] ${domain}`, 0);
                }
            }

            // 5. Monitor for Status Code Thresholds (e.g. 404/403 scanner)
            if (this.settings.codes.includes(status)) {
                this.trackStatusCode(ip, status, decodedPath, method, domain, geo);
            }
        } catch (e) {
            // Silently skip unparseable lines
        }
    }

    /**
     * Get Geo Information for IP
     */
    async getIPGeo(ip) {
        if (this.geoCache.has(ip)) return this.geoCache.get(ip);

        try {
            const axios = require('axios');
            const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,countryCode,country,lat,lon`);
            if (res.data.status === 'success') {
                const geo = {
                    countryCode: res.data.countryCode,
                    country: res.data.country,
                    lat: res.data.lat,
                    lon: res.data.lon
                };
                this.geoCache.set(ip, geo);
                if (this.geoCache.size > 5000) this.geoCache.clear();
                return geo;
            }
        } catch (e) { }
        return { countryCode: '??', country: 'Unknown', lat: 0, lon: 0 };
    }

    /**
     * Log activity to login_attempts table to show on the Real-time Map
     */
    logToMap(ip, geo, username, success = 1) {
        db.query(
            'INSERT INTO login_attempts (username, ip, country, lat, lon, success, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, ip, geo.country || 'Unknown', geo.lat || 0, geo.lon || 0, success, 'Yumna Log Monitor']
        );
    }

    /**
     * Track status code hits per IP and block if threshold reached
     */
    trackStatusCode(ip, status, path, method, domain, geo) {
        const now = Math.floor(Date.now() / 1000);

        if (!this.statusCounters.has(ip)) {
            this.statusCounters.set(ip, new Map());
        }

        const ipMap = this.statusCounters.get(ip);
        if (!ipMap.has(status)) {
            ipMap.set(status, { count: 1, firstHit: now });
        } else {
            const data = ipMap.get(status);

            // Log scan attempt to map (every hit)
            this.logToMap(ip, geo, `[SCAN-${status}] ${domain}`, 0);

            // Reset if window expired
            if (now - data.firstHit > this.settings.window) {
                data.count = 1;
                data.firstHit = now;
            } else {
                data.count++;

                // Check threshold
                if (data.count >= this.settings.threshold) {
                    console.warn(`[SECURITY-LOG] IP ${ip} exceeded ${status} threshold (${data.count}/${this.settings.threshold}) on ${domain}`);

                    const blockResult = {
                        score: 100,
                        geo,
                        findings: [{
                            type: `Web Scanner (${status})`,
                            detail: `Detected ${data.count} hits of ${status} in ${this.settings.window}s`,
                            score: 100
                        }]
                    };

                    this.autoBlockIP(ip, blockResult, path, method, domain);

                    // Reset to avoid double blocking immediately
                    ipMap.delete(status);
                }
            }
        }
    }

    /**
     * Auto-block IP and log threat
     */
    async autoBlockIP(ip, result, path, method, domain) {
        const severity = result.score > 80 ? 'Critical' : 'High';
        const reason = `Auto-blocked: ${result.findings[0]?.type || 'Security Threat'} detected on website "${domain}"`;
        const geo = result.geo || { country: 'Unknown', lat: 0, lon: 0 };

        // 1. Update Reputation
        await ThreatDetectionService.updateReputation(ip, result.score);

        // 2. Log Threat
        await ThreatDetectionService.logThreat(ip, result, { path, method });

        // 3. Log to Map as a failed attack
        this.logToMap(ip, geo, `[BLOCK] ${domain}`, 0);

        // 4. Block in Firewall table
        db.query(
            `INSERT INTO firewall (type, target, reason, country, lat, lon, expiresAt) 
             VALUES ('ip', ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE reason = VALUES(reason), expiresAt = VALUES(expiresAt)`,
            [ip, `${reason} (Payload: ${path.substring(0, 50)}...)`, geo.country, geo.lat, geo.lon],
            (err) => {
                if (!err) {
                    console.log(`[SECURITY-LOG] Permanently blocked attacker IP: ${ip}`);
                    // Trigger immediate sync to refresh web server configs
                    const FirewallService = require('./FirewallService');
                    FirewallService.sync();
                }
            }
        );
    }
}

module.exports = new LogSecurityService();
