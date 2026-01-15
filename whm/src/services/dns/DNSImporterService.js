const fs = require('fs');

class DNSImporterService {

    /**
     * Parse BIND Zone File Content
     * Very basic parser for standard RR types.
     * @param {string} content 
     */
    static parseBind(content) {
        const lines = content.split('\n');
        const records = [];
        let currentOrigin = '@';
        let defaultTTL = 3600;

        // Simple Regex for standard records
        // Name TTL Class Type Content
        // example.com. 3600 IN A 1.2.3.4

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith(';')) continue;

            // Handle $ORIGIN and $TTL
            if (line.startsWith('$ORIGIN')) {
                currentOrigin = line.split(/\s+/)[1];
                continue;
            }
            if (line.startsWith('$TTL')) {
                defaultTTL = parseInt(line.split(/\s+/)[1]);
                continue;
            }

            // Collapse whitespace
            const parts = line.split(/\s+/);

            // Heuristic Parsing
            // If starts with @ or char, it's name.
            // If starts with IN, usage of previous name? (Not supported in this basic parser, assuming full lines)

            // Standard: Name [TTL] [Class] Type RDATA
            let name = parts[0];
            let ttl = defaultTTL;
            let type = '';
            let contentStr = '';
            let idx = 1;

            // Check if second part is TTL or Class or Type
            if (parts[idx] && parseInt(parts[idx])) {
                ttl = parseInt(parts[idx]);
                idx++;
            }

            if (parts[idx] === 'IN') {
                idx++;
            }

            type = parts[idx];
            idx++;

            contentStr = parts.slice(idx).join(' ');

            if (type && ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'].includes(type.toUpperCase())) {
                records.push({
                    type: type.toUpperCase(),
                    name: name,
                    content: contentStr.replace(/"/g, ''), // Unquote TXT
                    ttl: ttl,
                    priority: type === 'MX' ? parseInt(contentStr.split(' ')[0]) : 0
                });
            }
        }

        return records;
    }

    /**
     * Import from AWS Route53 JSON (ListResourceRecordSets output)
     */
    static parseRoute53(jsonObj) {
        const records = [];
        const rrsets = jsonObj.ResourceRecordSets || [];

        for (const set of rrsets) {
            const name = set.Name.replace(/\.$/, ''); // Remove trailing dot
            const type = set.Type;
            const ttl = set.TTL || 300;

            if (set.ResourceRecords) {
                for (const r of set.ResourceRecords) {
                    records.push({
                        type,
                        name,
                        content: r.Value.replace(/"/g, ''),
                        ttl,
                        priority: 0 // AWS separates priority usually or includes in string
                    });
                }
            }
        }
        return records;
    }
}

module.exports = DNSImporterService;
