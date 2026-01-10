const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class SecurityAuditService {
    /**
     * Initialize security audit system
     */
    async initialize() {
        try {
            const connection = await mysql.createConnection(dbConfig);

            // Create audit logs table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS security_audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    event_type VARCHAR(50) NOT NULL,
                    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
                    user_id INT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    action VARCHAR(255) NOT NULL,
                    details JSON,
                    resource_type VARCHAR(50),
                    resource_id INT,
                    status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_event_type (event_type),
                    INDEX idx_user_id (user_id),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_severity (severity)
                )
            `);

            await connection.end();
            console.log('[Security Audit] Initialized successfully');
            return { success: true };
        } catch (err) {
            console.error('[Security Audit] Initialization failed:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Log security event
     */
    async logEvent(event) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const {
                event_type,
                severity = 'info',
                user_id = null,
                ip_address = null,
                user_agent = null,
                action,
                details = {},
                resource_type = null,
                resource_id = null,
                status = 'success'
            } = event;

            await connection.query(
                `INSERT INTO security_audit_logs 
                (event_type, severity, user_id, ip_address, user_agent, action, details, resource_type, resource_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [event_type, severity, user_id, ip_address, user_agent, action, JSON.stringify(details), resource_type, resource_id, status]
            );

            return { success: true };
        } catch (err) {
            console.error('[Security Audit] Failed to log event:', err);
            return { success: false, error: err.message };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get audit logs with filters
     */
    async getLogs(filters = {}) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const {
                event_type,
                severity,
                user_id,
                start_date,
                end_date,
                limit = 100,
                offset = 0
            } = filters;

            let query = `
                SELECT l.*, u.username, u.email
                FROM security_audit_logs l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (event_type) {
                query += ' AND l.event_type = ?';
                params.push(event_type);
            }

            if (severity) {
                query += ' AND l.severity = ?';
                params.push(severity);
            }

            if (user_id) {
                query += ' AND l.user_id = ?';
                params.push(user_id);
            }

            if (start_date) {
                query += ' AND l.timestamp >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND l.timestamp <= ?';
                params.push(end_date);
            }

            query += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [logs] = await connection.query(query, params);

            // Parse JSON details
            logs.forEach(log => {
                if (log.details) {
                    try {
                        log.details = JSON.parse(log.details);
                    } catch (e) {
                        log.details = {};
                    }
                }
            });

            return logs;
        } finally {
            await connection.end();
        }
    }

    /**
     * Get statistics
     */
    async getStats(timeframe = '24h') {
        const connection = await mysql.createConnection(dbConfig);
        try {
            let timeCondition = '';

            switch (timeframe) {
                case '1h':
                    timeCondition = 'timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
                    break;
                case '24h':
                    timeCondition = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
                    break;
                case '7d':
                    timeCondition = 'timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case '30d':
                    timeCondition = 'timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                default:
                    timeCondition = 'timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
            }

            const [stats] = await connection.query(`
                SELECT 
                    COUNT(*) as total_events,
                    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_events,
                    SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_events,
                    SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info_events,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_events,
                    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_events,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips
                FROM security_audit_logs
                WHERE ${timeCondition}
            `);

            // Get top event types
            const [topEvents] = await connection.query(`
                SELECT event_type, COUNT(*) as count
                FROM security_audit_logs
                WHERE ${timeCondition}
                GROUP BY event_type
                ORDER BY count DESC
                LIMIT 10
            `);

            // Get recent critical events
            const [criticalEvents] = await connection.query(`
                SELECT l.*, u.username
                FROM security_audit_logs l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE ${timeCondition} AND l.severity = 'critical'
                ORDER BY l.timestamp DESC
                LIMIT 10
            `);

            return {
                summary: stats[0],
                top_events: topEvents,
                recent_critical: criticalEvents
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get event types
     */
    getEventTypes() {
        return {
            // Authentication
            'auth.login': 'User login',
            'auth.logout': 'User logout',
            'auth.failed_login': 'Failed login attempt',
            'auth.password_change': 'Password changed',
            'auth.2fa_enabled': '2FA enabled',
            'auth.2fa_disabled': '2FA disabled',

            // User Management
            'user.created': 'User created',
            'user.deleted': 'User deleted',
            'user.updated': 'User updated',
            'user.role_changed': 'User role changed',

            // File Operations
            'file.uploaded': 'File uploaded',
            'file.deleted': 'File deleted',
            'file.downloaded': 'File downloaded',
            'file.shared': 'File shared',

            // Security
            'security.ip_banned': 'IP banned',
            'security.ip_unbanned': 'IP unbanned',
            'security.firewall_rule_added': 'Firewall rule added',
            'security.firewall_rule_deleted': 'Firewall rule deleted',
            'security.access_denied': 'Access denied',

            // System
            'system.backup_created': 'Backup created',
            'system.backup_restored': 'Backup restored',
            'system.settings_changed': 'Settings changed',
            'system.service_started': 'Service started',
            'system.service_stopped': 'Service stopped',

            // Website
            'website.created': 'Website created',
            'website.deleted': 'Website deleted',
            'website.ssl_installed': 'SSL installed',

            // Database
            'database.created': 'Database created',
            'database.deleted': 'Database deleted',
            'database.user_created': 'Database user created'
        };
    }

    /**
     * Delete old logs
     */
    async cleanOldLogs(daysToKeep = 90) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [result] = await connection.query(
                'DELETE FROM security_audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysToKeep]
            );

            return {
                success: true,
                deleted: result.affectedRows
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Export logs to CSV
     */
    /**
     * Export logs to CSV
     */
    async exportLogs(filters = {}) {
        const logs = await this.getLogs({ ...filters, limit: 10000 });

        let csv = 'Timestamp,Event Type,Severity,User,IP Address,Action,Status\n';

        logs.forEach(log => {
            csv += `"${log.timestamp}","${log.event_type}","${log.severity}","${log.username || 'N/A'}","${log.ip_address || 'N/A'}","${log.action}","${log.status}"\n`;
        });

        return {
            success: true,
            csv,
            count: logs.length
        };
    }

    /**
     * Get login attempts
     */
    async getLoginAttempts(limit = 50) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [attempts] = await connection.query(
                'SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT ?',
                [limit]
            );
            return attempts;
        } finally {
            await connection.end();
        }
    }

    /**
     * Get active sessions
     */
    async getActiveSessions() {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [sessions] = await connection.query(`
                SELECT s.*, u.username, u.email 
                FROM active_sessions s
                LEFT JOIN users u ON s.user_id = u.id
                ORDER BY s.last_activity DESC
            `);
            return sessions;
        } finally {
            await connection.end();
        }
    }

    /**
     * Terminate session
     */
    async terminateSession(sessionId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query('DELETE FROM active_sessions WHERE session_id = ?', [sessionId]);
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get unified dashboard stats
     */
    async getDashboardStats() {
        const connection = await mysql.createConnection(dbConfig);
        try {
            // total attempts & failed in 24h
            const [loginStats] = await connection.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
                FROM login_attempts
                WHERE attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            // active sessions count
            const [sessionStats] = await connection.query('SELECT COUNT(*) as count FROM active_sessions');

            // whitelisted IPs
            const [whitelistStats] = await connection.query('SELECT COUNT(*) as count FROM firewall_whitelist');

            // geo-blocked countries
            const [geoStats] = await connection.query('SELECT COUNT(*) as count FROM firewall_geoblock WHERE is_active = 1');

            // top attackers (failed attempts in 24h)
            const [attackers] = await connection.query(`
                SELECT ip, country, COUNT(*) as count
                FROM login_attempts
                WHERE success = 0 AND attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY ip, country
                ORDER BY count DESC
                LIMIT 5
            `);

            // malware/ransomware stats (simulated from threat logs)
            const [threatStats] = await connection.query(`
                SELECT 
                    SUM(CASE WHEN event_type = 'security.malware_detected' THEN 1 ELSE 0 END) as malware,
                    SUM(CASE WHEN event_type = 'security.ransomware_blocked' THEN 1 ELSE 0 END) as ransomware
                FROM security_audit_logs
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const total = loginStats[0].total || 0;
            const successRate = total > 0 ? ((total - loginStats[0].failed) / total * 100).toFixed(1) : '100';

            return {
                totalAttempts: total,
                failedAttempts: loginStats[0].failed || 0,
                successRate: successRate,
                activeSessions: sessionStats[0].count || 0,
                whitelistedIPs: whitelistStats[0].count || 0,
                blockedCountries: geoStats[0].count || 0,
                topAttackers: attackers,
                ransomwareBlocked: threatStats[0]?.ransomware || 0,
                malwareBlocked: threatStats[0]?.malware || 0
            };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get auto-purge setting
     */
    async getAutoPurgeSettings() {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [results] = await connection.query('SELECT value_text FROM settings WHERE key_name = "security_auto_purge"');
            return { enabled: results.length > 0 ? results[0].value_text === 'true' : false };
        } finally {
            await connection.end();
        }
    }

    /**
     * Update auto-purge setting
     */
    async updateAutoPurgeSettings(enabled) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'INSERT INTO settings (key_name, value_text) VALUES ("security_auto_purge", ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)',
                [enabled ? 'true' : 'false']
            );
            return { success: true, enabled };
        } finally {
            await connection.end();
        }
    }
}

module.exports = new SecurityAuditService();
