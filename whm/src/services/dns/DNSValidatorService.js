const net = require('net');

class DNSValidatorService {
    /**
     * Validate DNS record format
     */
    static validateFormat(type, name, content, priority, routing_policy) {
        if (!type || !name || !content) {
            throw new Error('Missing required fields: type, name, content');
        }

        // Validate Status
        const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid record type: ${type}`);
        }

        // Validate Name (basic hostname check)
        const nameRegex = /^(@|\*|[a-zA-Z0-9-_.]+)$/;
        if (!nameRegex.test(name)) {
            throw new Error('Invalid record name format');
        }

        // Content Validation by Type
        switch (type) {
            case 'A':
                if (!net.isIPv4(content)) throw new Error('Invalid IPv4 address');
                break;
            case 'AAAA':
                if (!net.isIPv6(content)) throw new Error('Invalid IPv6 address');
                break;
            case 'CNAME':
            case 'NS':
            case 'MX':
                // Allow simple hostname checks, ideally FQDN or relative
                // Simple regex for domain/hostname
                if (!/^[a-zA-Z0-9-._]+$/.test(content)) throw new Error(`Invalid content for ${type}`);
                break;
            case 'TXT':
                // TXT is generally freeform but sometimes quoted
                break;
            case 'SRV':
                // SRV format often: weight port target
                // We'll assume the 'priority' field is handled separately, content usually "weight port target"
                // Or sometimes splits properties. Panel seems one 'content' field.
                // Simplified check:
                if (content.trim().length === 0) throw new Error('Content cannot be empty');
                break;
        }

        // Priority validation
        if (['MX', 'SRV'].includes(type)) {
            if (priority === undefined || priority === null || isNaN(priority) || priority < 0 || priority > 65535) {
                throw new Error('Invalid priority (0-65535)');
            }
        }

        // Routing Policy Validation (Stage 6)
        if (routing_policy) {
            if (!routing_policy.type) throw new Error('Routing policy missing "type"');
            const validPolicies = ['weighted', 'geo', 'failover'];
            if (!validPolicies.includes(routing_policy.type)) throw new Error(`Invalid policy type: ${routing_policy.type}`);

            if (routing_policy.type === 'weighted') {
                if (typeof routing_policy.weight !== 'number' || routing_policy.weight < 0 || routing_policy.weight > 100) {
                    throw new Error('Weight must be number between 0-100');
                }
            } else if (routing_policy.type === 'geo') {
                if (!routing_policy.region || routing_policy.region.length !== 2) {
                    throw new Error('Geo policy requires valid 2-letter "region" code');
                }
            } else if (routing_policy.type === 'failover') {
                if (!routing_policy.health_check_url || !routing_policy.health_check_url.startsWith('http')) {
                    throw new Error('Failover requires valid "health_check_url"');
                }
            }
        }
    }

    /**
     * Check for conflicts (Duplicates, CNAME collisions)
     * @param {Object} connection - DB Connection or Pool
     * @param {string} zoneId 
     * @param {string} type 
     * @param {string} name 
     * @param {string} content 
     * @param {string|number} excludeId - ID to exclude (for updates)
     */
    static async validateConflicts(connection, zoneId, type, name, content, excludeId = null) {
        // 1. Exact Duplicate Check
        let dupQuery = 'SELECT id FROM dns_records WHERE zoneId = ? AND type = ? AND name = ? AND content = ? AND status != "deleted"';
        let dupOoarams = [zoneId, type, name, content];

        if (excludeId) {
            dupQuery += ' AND id != ?';
            dupOoarams.push(excludeId);
        }

        const [dups] = await connection.promise().query(dupQuery, dupOoarams);
        if (dups.length > 0) {
            throw new Error('Duplicate record already exists');
        }

        // 2. CNAME Conflict Policy:
        // - If creating CNAME: No other records allowed for Same Name (except pending deletes)
        // - If creating Other: No CNAME allowed for Same Name

        let conflictQuery = '';
        let conflictParams = [];

        if (type === 'CNAME') {
            // Check if ANY other record exists with this name
            conflictQuery = 'SELECT type FROM dns_records WHERE zoneId = ? AND name = ? AND status != "deleted"';
            conflictParams = [zoneId, name];
        } else {
            // Check if CNAME exists with this name
            conflictQuery = 'SELECT type FROM dns_records WHERE zoneId = ? AND name = ? AND type = "CNAME" AND status != "deleted"';
            conflictParams = [zoneId, name];
        }

        if (excludeId) {
            conflictQuery += ' AND id != ?';
            conflictParams.push(excludeId);
        }

        const [conflicts] = await connection.promise().query(conflictQuery, conflictParams);

        if (conflicts.length > 0) {
            throw new Error(`CNAME Conflict: Cannot have ${type} record with same name as existing ${conflicts[0].type} record.`);
        }
    }

    /**
     * Analyze record for suggestions and advanced validation
     */
    static analyzeRecord(type, name, content) {
        let suggestion = null;
        let fixedContent = null;
        let warnings = [];

        // 1. Trailing Dot Suggestion (CNAME, MX, NS, SRV)
        if (['CNAME', 'MX', 'NS', 'SRV'].includes(type)) {
            // If it looks like a FQDN (contains dots) but no trailing dot, suggest one
            if (content.includes('.') && !content.endsWith('.')) {
                // Ignore IPs
                if (!net.isIPv4(content) && !net.isIPv6(content)) {
                    suggestion = 'Consider adding a trailing dot for FQDN to prevent double domain appending.';
                    fixedContent = content + '.';
                }
            }
        }

        // 2. SPF Validation
        if (type === 'TXT' && content.toLowerCase().startsWith('v=spf1')) {
            const spfResult = this.validateSPF(content);
            if (!spfResult.valid) warnings.push(spfResult.error);
            if (spfResult.suggestion) suggestion = spfResult.suggestion;
        }

        // 3. DKIM Validation
        if (type === 'TXT' && content.toLowerCase().startsWith('v=dkim1')) {
            const dkimResult = this.validateDKIM(content);
            if (!dkimResult.valid) warnings.push(dkimResult.error);
        }

        // 4. DMARC Validation
        if (type === 'TXT' && name.toLowerCase().startsWith('_dmarc')) {
            const dmarcResult = this.validateDMARC(content);
            if (!dmarcResult.valid) warnings.push(dmarcResult.error);
        }

        return {
            isValid: warnings.length === 0,
            warnings,
            suggestion,
            fixedContent
        };
    }

    static validateSPF(content) {
        // Simple SPF check
        if (!content.includes('all')) return { valid: false, error: 'SPF record missing "all" mechanism (e.g., -all, ~all)' };

        // Suggestion for multiple spaces
        if (content.includes('  ')) return { valid: true, suggestion: 'Remove extra spaces' };

        return { valid: true };
    }

    static validateDKIM(content) {
        // v=DKIM1; k=rsa; p=...
        const parts = content.split(';').map(p => p.trim());
        const hasVersion = parts.some(p => p.toLowerCase().startsWith('v=dkim1'));
        const hasKey = parts.some(p => p.toLowerCase().startsWith('k='));
        const hasPub = parts.some(p => p.toLowerCase().startsWith('p='));

        if (!hasPub) return { valid: false, error: 'DKIM record missing public key (p=...)' };

        return { valid: true };
    }

    static validateDMARC(content) {
        // v=DMARC1; p=none|quarantine|reject
        if (!content.toLowerCase().startsWith('v=dmarc1')) return { valid: false, error: 'Invalid DMARC version (must be v=DMARC1)' };

        if (!content.includes('p=')) return { valid: false, error: 'DMARC record missing policy (p=none|quarantine|reject)' };

        return { valid: true };
    }
}

module.exports = DNSValidatorService;
