const pool = require('../config/db');

class PluginService {
    constructor() {
        this.hooks = {};
        this.plugins = [];
    }

    /**
     * Initialize by loading all active plugins from DB
     */
    async init() {
        try {
            const [rows] = await pool.promise().query('SELECT * FROM plugins WHERE status = "active"');
            this.plugins = rows;
            console.log(`[PLUGINS] Loaded ${rows.length} active plugins`);
        } catch (err) {
            console.error('[PLUGINS] Failed to load plugins:', err);
        }
    }

    /**
     * Emit a hook event. This allows plugins to run code at specific points.
     * Hooks can be 'sync' or 'async'.
     */
    async emit(hookName, data) {
        if (!this.hooks[hookName]) return data;

        console.log(`[PLUGINS] Hook emitted: ${hookName}`);
        let currentData = data;

        for (const hook of this.hooks[hookName]) {
            try {
                // Check if plugin is still active
                const plugin = this.plugins.find(p => p.name === hook.pluginName);
                if (plugin) {
                    currentData = await hook.callback(currentData);
                }
            } catch (err) {
                console.error(`[PLUGINS] Error in hook ${hookName} (Plugin: ${hook.pluginName}):`, err);
            }
        }

        return currentData;
    }

    /**
     * Register a callback for a hook
     */
    registerHook(pluginName, hookName, callback) {
        if (!this.hooks[hookName]) {
            this.hooks[hookName] = [];
        }
        this.hooks[hookName].push({ pluginName, callback });
        console.log(`[PLUGINS] Plugin '${pluginName}' registered hook: ${hookName}`);
    }

    /**
     * Example of a simple built-in plugin mechanism
     */
    installPlugin(pluginManifest) {
        // In a real scenario, this would load code from a file or package
        console.log(`[PLUGINS] Installing plugin: ${pluginManifest.name}`);
    }
}

module.exports = new PluginService();
