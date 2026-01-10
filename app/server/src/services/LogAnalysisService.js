const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class LogAnalysisService {
    static async getRecentLogs(domain, type = 'error', limit = 50) {
        const logDir = 'C:\\YumnaPanel\\logs\\nginx';
        const logPath = path.join(logDir, `${domain}.${type}.log`);

        try {
            const content = await fs.readFile(logPath, 'utf8');
            const lines = content.trim().split('\n');
            return lines.slice(-limit).reverse();
        } catch (error) {
            return [`[SYSTEM] No ${type} logs found for ${domain}`];
        }
    }

    static async analyzeLog(lines) {
        const suggestions = [];
        const patterns = [
            { term: 'directory index of .* is forbidden', suggestion: 'Possible missing index.php or index.html in the root directory. Check your Document Root.' },
            { term: 'connect() to unix:.* failed (111: Connection refused)', suggestion: 'PHP-FPM service might be down. Check PHP services in the Services tab.' },
            { term: 'client intended to send too large body', suggestion: 'Upload limit exceeded. Increase client_max_body_size in Nginx config.' },
            { term: 'request surge on /wp-login.php', suggestion: 'Brute force attack detected on WordPress login. Enable rate-limiting or change path.' },
            { term: 'FastCGI sent in stderr: "Primary script unknown"', suggestion: 'Nginx is looking for a file that does not exist. Verify your root path configuration.' },
            { term: 'Too many open files', suggestion: 'System file limit reached. Increase worker_rlimit_nofile in Nginx.' }
        ];

        lines.forEach(line => {
            patterns.forEach(p => {
                if (new RegExp(p.term, 'i').test(line)) {
                    if (!suggestions.some(s => s.suggestion === p.suggestion)) {
                        suggestions.push({
                            type: 'AI-SUGGESTION',
                            cause: line.substring(0, 100) + '...',
                            suggestion: p.suggestion
                        });
                    }
                }
            });
        });

        return suggestions;
    }
}

module.exports = LogAnalysisService;
