const app = require('./app');
const initTables = require('./config/init');
const PORT = process.env.PORT || 5000;

const ComplianceService = require('./services/compliance');
const LogSecurityService = require('./services/LogSecurityService');
const FirewallService = require('./services/FirewallService');
const WebServerService = require('./services/webserver');

// Background Tasks
// Initialize Log Monitoring & Firewall Sync
LogSecurityService.start().catch(e => console.error('[SECURITY-LOG] Startup error:', e));
FirewallService.sync().catch(e => console.error('[FIREWALL] Initial sync error:', e));

// Periodic Firewall Sync (every 5 minutes)
setInterval(() => {
    FirewallService.sync().catch(e => console.error('[FIREWALL] Periodic sync error:', e));
}, 300000);

// Run Retention Cleanup every hour
setInterval(async () => {
    try {
        await ComplianceService.runRetentionCleanup();
    } catch (e) {
        console.error('[SERVER] Retention cleanup failed:', e.message);
    }
}, 3600000);

const startServer = async () => {
    try {
        await initTables();
        app.listen(PORT, () => {
            console.log(`[SERVER] Running on port ${PORT}`);
            // Run once on startup
            ComplianceService.runRetentionCleanup().catch(e => console.error(e));
            WebServerService.initializePHPServices().catch(e => console.error(e));
        });
    } catch (err) {
        console.error('[CRITICAL] Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();
