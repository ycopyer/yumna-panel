const pool = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AppSchedulerService {
    static async init() {
        console.log('[AppScheduler] Initializing application health and update tasks...');
        // Run health check every 30 minutes
        setInterval(() => this.runHealthChecks(), 30 * 60 * 1000);
        // Run update check once a day
        setInterval(() => this.runUpdateChecks(), 24 * 60 * 60 * 1000);

        // Initial run after start
        setTimeout(() => {
            this.runHealthChecks();
            this.runUpdateChecks();
        }, 10000);
    }

    static async runHealthChecks() {
        console.log('[AppScheduler] Running health checks for installed applications...');
        try {
            const [apps] = await pool.promise().query(`
                SELECT a.*, w.domain 
                FROM installed_applications a
                JOIN websites w ON a.websiteId = w.id
                WHERE a.status = 'active'
            `);

            for (const app of apps) {
                let status = 'healthy';
                try {
                    // Simple HTTP check
                    const response = await axios.get(`http://${app.domain}`, { timeout: 5000 });
                    if (response.status >= 400) status = 'degraded';
                } catch (error) {
                    status = 'offline';
                }

                await pool.promise().query(
                    'UPDATE installed_applications SET health_status = ?, last_health_verified = CURRENT_TIMESTAMP WHERE id = ?',
                    [status, app.id]
                );
            }
        } catch (error) {
            console.error('[AppScheduler] Health check failed:', error.message);
        }
    }

    static async runUpdateChecks() {
        console.log('[AppScheduler] Checking for application updates...');
        try {
            const [apps] = await pool.promise().query(`
                SELECT a.*, t.slug as template_slug, t.version as latest_version
                FROM installed_applications a
                JOIN application_templates t ON a.templateId = t.id
                WHERE a.status = 'active'
            `);

            for (const app of apps) {
                let hasUpdate = false;

                // Static comparison with template version
                // In a real panel, we'd call external APIs (wordpress.org/v1/updates, etc.)
                if (app.version !== app.latest_version && app.latest_version !== 'latest') {
                    hasUpdate = true;
                }

                await pool.promise().query(
                    'UPDATE installed_applications SET update_available = ? WHERE id = ?',
                    [hasUpdate, app.id]
                );

                // Auto-update if enabled
                if (hasUpdate && app.auto_update_enabled) {
                    console.log(`[AppScheduler] Auto-updating ${app.name} (${app.domain})...`);
                    this.triggerUpdate(app.id);
                }
            }
        } catch (error) {
            console.error('[AppScheduler] Update check failed:', error.message);
        }
    }

    static async triggerUpdate(appId) {
        // Placeholder for real update logic
        // This would involve calling AppInstallerService.upgradeApp(appId)
        await pool.promise().query('UPDATE installed_applications SET status = ? WHERE id = ?', ['updating', appId]);

        // Simulate update time
        setTimeout(async () => {
            const [app] = await pool.promise().query('SELECT t.version FROM installed_applications a JOIN application_templates t ON a.templateId = t.id WHERE a.id = ?', [appId]);
            const newVersion = app[0]?.version || 'updated';

            await pool.promise().query('UPDATE installed_applications SET status = ?, version = ?, update_available = FALSE WHERE id = ?',
                ['active', newVersion, appId]);
            console.log(`[AppScheduler] Update completed for App ID: ${appId}`);
        }, 5000);
    }
}

module.exports = AppSchedulerService;
