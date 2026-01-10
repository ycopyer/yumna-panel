const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const Fail2BanService = require('../../services/Fail2BanService');

// ============================================
// FAIL2BAN MANAGEMENT
// ============================================

// Initialize Fail2Ban
router.post('/security/fail2ban/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await Fail2BanService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all jails
router.get('/security/fail2ban/jails', requireAuth, async (req, res) => {
    try {
        const jails = await Fail2BanService.getJails();
        res.json(jails);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update jail
router.post('/security/fail2ban/jails', requireAdmin, async (req, res) => {
    try {
        const { name, config } = req.body;
        const result = await Fail2BanService.updateJail(name, config);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete jail
router.delete('/security/fail2ban/jails/:name', requireAdmin, async (req, res) => {
    try {
        const { name } = req.params;
        const result = await Fail2BanService.deleteJail(name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get banned IPs
router.get('/security/fail2ban/banned', requireAuth, async (req, res) => {
    try {
        const bans = await Fail2BanService.getBannedIPs();
        res.json(bans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ban IP manually
router.post('/security/fail2ban/ban', requireAdmin, async (req, res) => {
    try {
        const { ip, jail, reason } = req.body;
        const result = await Fail2BanService.banIP(ip, jail, reason);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unban IP
router.post('/security/fail2ban/unban', requireAdmin, async (req, res) => {
    try {
        const { ip } = req.body;
        const result = await Fail2BanService.unbanIP(ip);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
router.get('/security/fail2ban/stats', requireAuth, async (req, res) => {
    try {
        const stats = await Fail2BanService.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clean expired bans
router.post('/security/fail2ban/clean', requireAdmin, async (req, res) => {
    try {
        const result = await Fail2BanService.cleanExpiredBans();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// IP ACCESS CONTROL (Whitelist/Blacklist)
// ============================================
const IPAccessControlService = require('../../services/IPAccessControlService');

// Initialize IP Access Control
router.post('/security/ip-access/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await IPAccessControlService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get IP access rules for a website
router.get('/security/ip-access/:websiteId', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const rules = await IPAccessControlService.getRules(parseInt(websiteId));
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add IP access rule
router.post('/security/ip-access/:websiteId', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { ipAddress, ruleType, description } = req.body;
        const userId = req.userId;

        const result = await IPAccessControlService.addRule(
            parseInt(websiteId),
            ipAddress,
            ruleType,
            description,
            userId
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete IP access rule
router.delete('/security/ip-access/rules/:ruleId', requireAuth, async (req, res) => {
    try {
        const { ruleId } = req.params;
        const userId = req.userId;
        const isAdmin = req.userRole === 'admin';

        const result = await IPAccessControlService.deleteRule(
            parseInt(ruleId),
            userId,
            isAdmin
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
router.get('/security/ip-access/:websiteId/stats', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const stats = await IPAccessControlService.getStats(parseInt(websiteId));
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk import
router.post('/security/ip-access/:websiteId/bulk', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { ipList, ruleType } = req.body;
        const userId = req.userId;

        const result = await IPAccessControlService.bulkImport(
            parseInt(websiteId),
            ipList,
            ruleType,
            userId
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export rules
router.get('/security/ip-access/:websiteId/export', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { rule_type } = req.query;

        const result = await IPAccessControlService.exportRules(
            parseInt(websiteId),
            rule_type || null
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear rules
router.delete('/security/ip-access/:websiteId/clear', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { rule_type } = req.query;

        const result = await IPAccessControlService.clearRules(
            parseInt(websiteId),
            rule_type || null
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SECURITY AUDIT LOGS
// ============================================
const SecurityAuditService = require('../../services/SecurityAuditService');

// Initialize Security Audit
router.post('/security/audit/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await SecurityAuditService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Log security event
router.post('/security/audit/log', requireAuth, async (req, res) => {
    try {
        const event = {
            ...req.body,
            user_id: req.userId,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        };

        const result = await SecurityAuditService.logEvent(event);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get audit logs
router.get('/security/audit/logs', requireAuth, async (req, res) => {
    try {
        const filters = {
            event_type: req.query.event_type,
            severity: req.query.severity,
            user_id: req.query.user_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const logs = await SecurityAuditService.getLogs(filters);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
router.get('/security/audit/stats', requireAuth, async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        const stats = await SecurityAuditService.getStats(timeframe);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get event types
router.get('/security/audit/event-types', requireAuth, async (req, res) => {
    try {
        const eventTypes = SecurityAuditService.getEventTypes();
        res.json(eventTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export logs
router.get('/security/audit/export', requireAuth, async (req, res) => {
    try {
        const filters = {
            event_type: req.query.event_type,
            severity: req.query.severity,
            user_id: req.query.user_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const result = await SecurityAuditService.exportLogs(filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=security_audit_logs.csv');
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clean old logs
router.post('/security/audit/clean', requireAdmin, async (req, res) => {
    try {
        const { days_to_keep } = req.body;
        const result = await SecurityAuditService.cleanOldLogs(days_to_keep || 90);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MODSECURITY WAF
// ============================================
const ModSecurityService = require('../../services/ModSecurityService');

// Initialize ModSecurity
router.post('/security/modsecurity/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await ModSecurityService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get WAF Status
router.get('/security/modsecurity/status', requireAuth, async (req, res) => {
    try {
        const status = await ModSecurityService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update WAF Status
router.post('/security/modsecurity/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body; // On, Off, DetectionOnly
        const result = await ModSecurityService.updateStatus(status);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Rules
router.get('/security/modsecurity/rules', requireAuth, async (req, res) => {
    try {
        const rules = await ModSecurityService.getRules();
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Rule
router.post('/security/modsecurity/rules', requireAdmin, async (req, res) => {
    try {
        const { name, content } = req.body;
        const result = await ModSecurityService.saveRule(name, content);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Logs
router.get('/security/modsecurity/logs', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await ModSecurityService.getLogs(limit);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Stats
router.get('/security/modsecurity/stats', requireAuth, async (req, res) => {
    try {
        const stats = await ModSecurityService.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MALWARE SCANNER (ClamAV)
// ============================================
const MalwareScannerService = require('../../services/MalwareScannerService');

// Initialize Scanner
router.post('/security/malware/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await MalwareScannerService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Scan
router.post('/security/malware/scan', requireAuth, async (req, res) => {
    try {
        const { targetPath } = req.body;
        const userId = req.userId;
        const result = await MalwareScannerService.startScan(targetPath, userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Scan History
router.get('/security/malware/history', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const history = await MalwareScannerService.getHistory(limit);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Scan Details
router.get('/security/malware/scan/:id', requireAuth, async (req, res) => {
    try {
        const scan = await MalwareScannerService.getScanDetails(parseInt(req.params.id));
        if (!scan) return res.status(404).json({ error: 'Scan not found' });
        res.json(scan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Scan
router.delete('/security/malware/scan/:id', requireAuth, async (req, res) => {
    try {
        const result = await MalwareScannerService.deleteScan(parseInt(req.params.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// FILE INTEGRITY MONITORING (AIDE)
// ============================================
const FileIntegrityService = require('../../services/FileIntegrityService');

// Initialize Service
router.post('/security/integrity/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await FileIntegrityService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Snapshot
router.post('/security/integrity/snapshots', requireAuth, async (req, res) => {
    try {
        const { targetPath } = req.body;
        const result = await FileIntegrityService.createSnapshot(targetPath, req.userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Snapshots
router.get('/security/integrity/snapshots', requireAuth, async (req, res) => {
    try {
        const snapshots = await FileIntegrityService.getSnapshots();
        res.json(snapshots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Run Integrity Check
router.post('/security/integrity/check', requireAuth, async (req, res) => {
    try {
        const { snapshotId } = req.body;
        const result = await FileIntegrityService.checkIntegrity(snapshotId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Alerts
router.get('/security/integrity/alerts', requireAuth, async (req, res) => {
    try {
        const alerts = await FileIntegrityService.getAlerts();
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resolve Alert
router.post('/security/integrity/alerts/:id/resolve', requireAuth, async (req, res) => {
    try {
        const result = await FileIntegrityService.resolveAlert(parseInt(req.params.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// VULNERABILITY SCANNER
// ============================================
const VulnerabilityScannerService = require('../../services/VulnerabilityScannerService');

// Initialize Service
router.post('/security/vuln/initialize', requireAdmin, async (req, res) => {
    try {
        const result = await VulnerabilityScannerService.initialize();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Scan
router.post('/security/vuln/scan', requireAuth, async (req, res) => {
    try {
        const { target } = req.body;
        const result = await VulnerabilityScannerService.startScan(target, req.userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Scan History
router.get('/security/vuln/history', requireAuth, async (req, res) => {
    try {
        const history = await VulnerabilityScannerService.getHistory();
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Scan Details
router.get('/security/vuln/scan/:id', requireAuth, async (req, res) => {
    try {
        const scan = await VulnerabilityScannerService.getScanDetails(parseInt(req.params.id));
        if (!scan) return res.status(404).json({ error: 'Scan not found' });
        res.json(scan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ============================================
const TwoFactorService = require('../../services/TwoFactorService');

// Get 2FA Status
router.get('/security/2fa/status', requireAuth, async (req, res) => {
    try {
        const enabled = await TwoFactorService.getStatus(req.userId);
        res.json({ enabled });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setup 2FA (Generate Secret)
router.post('/security/2fa/setup', requireAuth, async (req, res) => {
    try {
        const result = await TwoFactorService.generateSecret(req.user.username);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enable 2FA (Verify and Save)
router.post('/security/2fa/enable', requireAuth, async (req, res) => {
    try {
        const { secret, token } = req.body;
        const result = await TwoFactorService.enable(req.userId, secret, token);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Disable 2FA
router.post('/security/2fa/disable', requireAuth, async (req, res) => {
    try {
        const result = await TwoFactorService.disable(req.userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SECURITY DASHBOARD & MONITORING
// ============================================

// Get Dashboard Stats
router.get('/security/stats', requireAuth, async (req, res) => {
    try {
        const stats = await SecurityAuditService.getDashboardStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Login Attempts
router.get('/security/login-attempts', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const attempts = await SecurityAuditService.getLoginAttempts(limit);
        res.json(attempts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Active Sessions
router.get('/security/sessions', requireAuth, async (req, res) => {
    try {
        const sessions = await SecurityAuditService.getActiveSessions();
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Terminate Session
router.delete('/security/sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const result = await SecurityAuditService.terminateSession(req.params.sessionId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Auto-Purge Settings
router.get('/security/auto-purge', requireAuth, async (req, res) => {
    try {
        const settings = await SecurityAuditService.getAutoPurgeSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Auto-Purge Settings
router.post('/security/auto-purge', requireAdmin, async (req, res) => {
    try {
        const { enabled } = req.body;
        const result = await SecurityAuditService.updateAutoPurgeSettings(enabled);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
