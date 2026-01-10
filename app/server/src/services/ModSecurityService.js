const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ModSecurityService {
    constructor() {
        this.configDir = 'C:/YumnaPanel/etc/nginx/modsecurity';
        this.rulesDir = path.join(this.configDir, 'rules');
        this.logPath = 'C:/YumnaPanel/logs/modsecurity';
    }

    /**
     * Initialize ModSecurity structure
     */
    async initialize() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await fs.mkdir(this.rulesDir, { recursive: true });
            await fs.mkdir(this.logPath, { recursive: true });

            // Create main modsecurity.conf if not exists
            const mainConfig = path.join(this.configDir, 'modsecurity.conf');
            try {
                await fs.access(mainConfig);
            } catch {
                await fs.writeFile(mainConfig, this.getDefaultMainConfig());
            }

            // Create basic rules file
            const basicRules = path.join(this.rulesDir, 'basic_rules.conf');
            try {
                await fs.access(basicRules);
            } catch {
                await fs.writeFile(basicRules, this.getDefaultRules());
            }

            return { success: true };
        } catch (err) {
            console.error('[ModSecurity] Initialization failed:', err);
            return { success: false, error: err.message };
        }
    }

    getDefaultMainConfig() {
        return `# ModSecurity Main Configuration
SecRuleEngine On
SecRequestBodyAccess On
SecRequestBodyLimit 13107200
SecRequestBodyNoFilesLimit 131072
SecRequestBodyInMemoryLimit 131072
SecRequestBodyLimitAction Reject
SecRule \
    "&ARGS|&ARGS_NAMES|&QUERY_STRING|&QUERY_STRING_NAMES|&REQUEST_BODY|&REQUEST_BODY_NAMES|&REQUEST_HEADERS|&REQUEST_HEADERS_NAMES|&REQUEST_FILENAME|&REQUEST_LINE|&REQUEST_METHOD|&REQUEST_PROTOCOL|&STATUS" \
    "@gt 0" \
    "id:200002,phase:1,t:none,t:urlDecodeUni,block,msg:'Request Entity Too Large'"

SecResponseBodyAccess On
SecResponseBodyMimeType text/plain text/html text/xml
SecResponseBodyLimit 524288
SecResponseBodyLimitAction ProcessPartial

SecTmpDir C:/YumnaPanel/tmp
SecDataDir C:/YumnaPanel/tmp

SecAuditEngine RelevantOnly
SecAuditLogRelevantStatus "^(?:5|4(?!04))"
SecAuditLogParts ABIJDEFHKZ
SecAuditLogType Serial
SecAuditLog ${this.logPath}/modsec_audit.log

# Include Rules
Include ${this.rulesDir}/*.conf
`;
    }

    getDefaultRules() {
        return `# Basic Protection Rules
SecRule REQUEST_HEADERS:User-Agent "sqlmap|nikto|dirbuster|gobuster" \
    "id:1000,phase:1,deny,status:403,msg:'Scanner detected'"

SecRule ARGS "@detectSQLi" \
    "id:1001,phase:2,deny,status:403,msg:'SQL Injection attempt detected'"

SecRule ARGS "@detectXSS" \
    "id:1002,phase:2,deny,status:403,msg:'XSS attempt detected'"
`;
    }

    /**
     * Get WAF status
     */
    async getStatus() {
        const mainConfig = path.join(this.configDir, 'modsecurity.conf');
        try {
            const content = await fs.readFile(mainConfig, 'utf8');
            const match = content.match(/SecRuleEngine\s+(On|Off|DetectionOnly)/i);
            return {
                enabled: match ? match[1] : 'Unknown',
                configPath: mainConfig,
                logPath: this.logPath
            };
        } catch (err) {
            return { enabled: 'Not Initialized', error: err.message };
        }
    }

    /**
     * Update WAF status
     */
    async updateStatus(status) {
        const mainConfig = path.join(this.configDir, 'modsecurity.conf');
        try {
            let content = await fs.readFile(mainConfig, 'utf8');
            content = content.replace(/SecRuleEngine\s+(On|Off|DetectionOnly)/i, `SecRuleEngine ${status}`);
            await fs.writeFile(mainConfig, content);
            return { success: true, status };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Get all rules
     */
    async getRules() {
        try {
            const files = await fs.readdir(this.rulesDir);
            const rules = [];
            for (const file of files) {
                if (file.endsWith('.conf')) {
                    const content = await fs.readFile(path.join(this.rulesDir, file), 'utf8');
                    rules.push({ name: file, content });
                }
            }
            return rules;
        } catch (err) {
            return [];
        }
    }

    /**
     * Save rule file
     */
    async saveRule(name, content) {
        const filePath = path.join(this.rulesDir, name);
        try {
            await fs.writeFile(filePath, content);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Get audit logs
     */
    async getLogs(limit = 100) {
        const logFile = path.join(this.logPath, 'modsec_audit.log');
        try {
            const content = await fs.readFile(logFile, 'utf8');
            const lines = content.split('\n').filter(l => l.trim()).reverse();
            return lines.slice(0, limit);
        } catch (err) {
            return [];
        }
    }

    /**
     * Get statistics from logs
     */
    async getStats() {
        const logs = await this.getLogs(1000);
        const stats = {
            total_blocks: 0,
            sqli_blocks: 0,
            xss_blocks: 0,
            scanner_blocks: 0,
            top_targets: {},
            top_attackers: {}
        };

        logs.forEach(log => {
            if (log.includes('deny') || log.includes('Reject')) stats.total_blocks++;
            if (log.toLowerCase().includes('sqli')) stats.sqli_blocks++;
            if (log.toLowerCase().includes('xss')) stats.xss_blocks++;
            if (log.toLowerCase().includes('scanner')) stats.scanner_blocks++;

            // Extract IP (mock extraction for demo stats)
            const ipMatch = log.match(/\[client\s+([\d\.]+)\]/);
            if (ipMatch) {
                const ip = ipMatch[1];
                stats.top_attackers[ip] = (stats.top_attackers[ip] || 0) + 1;
            }
        });

        return stats;
    }
}

module.exports = new ModSecurityService();
