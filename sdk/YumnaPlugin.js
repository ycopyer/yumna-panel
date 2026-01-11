/**
 * Yumna Panel Plugin SDK
 * Base class for all plugins
 */

class YumnaPlugin {
    constructor(config = {}) {
        this.id = config.id || 'unknown-plugin';
        this.name = config.name || 'Unknown Plugin';
        this.version = config.version || '1.0.0';
        this.author = config.author || 'Unknown';
        this.description = config.description || '';
        this.dependencies = config.dependencies || [];
        this.hooks = new Map();
        this.routes = [];
        this.settings = config.settings || {};
        this.initialized = false;
    }

    /**
     * Initialize plugin
     * Override this method in your plugin
     */
    async initialize() {
        console.log(`[Plugin] Initializing ${this.name} v${this.version}`);
        this.initialized = true;
        return true;
    }

    /**
     * Cleanup plugin resources
     * Override this method in your plugin
     */
    async cleanup() {
        console.log(`[Plugin] Cleaning up ${this.name}`);
        this.hooks.clear();
        this.routes = [];
        this.initialized = false;
        return true;
    }

    /**
     * Register a hook handler
     * @param {string} hookName - Name of the hook
     * @param {Function} handler - Handler function
     * @param {number} priority - Execution priority (lower = earlier)
     */
    registerHook(hookName, handler, priority = 10) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }

        this.hooks.get(hookName).push({
            handler,
            priority,
            plugin: this.id
        });

        // Sort by priority
        this.hooks.get(hookName).sort((a, b) => a.priority - b.priority);

        console.log(`[Plugin] ${this.name} registered hook: ${hookName} (priority: ${priority})`);
    }

    /**
     * Register an API route
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} path - Route path
     * @param {Function} handler - Route handler
     * @param {Object} options - Route options (auth, admin, etc.)
     */
    registerRoute(method, path, handler, options = {}) {
        this.routes.push({
            method: method.toUpperCase(),
            path: `/api/plugins/${this.id}${path}`,
            handler,
            options,
            plugin: this.id
        });

        console.log(`[Plugin] ${this.name} registered route: ${method} ${path}`);
    }

    /**
     * Get plugin setting
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if not found
     */
    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    /**
     * Set plugin setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    setSetting(key, value) {
        this.settings[key] = value;
    }

    /**
     * Get plugin metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            version: this.version,
            author: this.author,
            description: this.description,
            dependencies: this.dependencies,
            initialized: this.initialized,
            hooks: Array.from(this.hooks.keys()),
            routes: this.routes.map(r => `${r.method} ${r.path}`)
        };
    }

    /**
     * Log message with plugin context
     */
    log(level, message, ...args) {
        const prefix = `[Plugin:${this.name}]`;
        switch (level) {
            case 'error':
                console.error(prefix, message, ...args);
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'info':
            default:
                console.log(prefix, message, ...args);
                break;
        }
    }

    /**
     * Emit an event (for plugin-to-plugin communication)
     */
    emit(eventName, data) {
        console.log(`[Plugin] ${this.name} emitted event: ${eventName}`);
        // This will be handled by the plugin manager
        return { event: eventName, plugin: this.id, data };
    }
}

/**
 * Plugin manifest schema
 */
const PluginManifestSchema = {
    id: 'string (required, unique)',
    name: 'string (required)',
    version: 'string (required, semver)',
    author: 'string (required)',
    description: 'string',
    homepage: 'string (url)',
    repository: 'string (url)',
    license: 'string',
    dependencies: 'array of strings',
    yumnaPanelVersion: 'string (semver range)',
    main: 'string (entry point file)',
    settings: 'object (default settings)',
    permissions: 'array of strings'
};

/**
 * Available hooks in Yumna Panel
 */
const AvailableHooks = {
    // User hooks
    'user:beforeCreate': 'Before user creation',
    'user:afterCreate': 'After user creation',
    'user:beforeUpdate': 'Before user update',
    'user:afterUpdate': 'After user update',
    'user:beforeDelete': 'Before user deletion',
    'user:afterDelete': 'After user deletion',

    // Website hooks
    'website:beforeCreate': 'Before website creation',
    'website:afterCreate': 'After website creation',
    'website:beforeDelete': 'Before website deletion',
    'website:afterDelete': 'After website deletion',

    // Database hooks
    'database:beforeCreate': 'Before database creation',
    'database:afterCreate': 'After database creation',
    'database:beforeDelete': 'Before database deletion',
    'database:afterDelete': 'After database deletion',

    // DNS hooks
    'dns:beforeZoneCreate': 'Before DNS zone creation',
    'dns:afterZoneCreate': 'After DNS zone creation',
    'dns:beforeRecordCreate': 'Before DNS record creation',
    'dns:afterRecordCreate': 'After DNS record creation',

    // Payment hooks
    'payment:beforeProcess': 'Before payment processing',
    'payment:afterProcess': 'After payment processing',
    'payment:beforeRefund': 'Before refund processing',
    'payment:afterRefund': 'After refund processing',

    // Billing hooks
    'invoice:beforeCreate': 'Before invoice creation',
    'invoice:afterCreate': 'After invoice creation',
    'invoice:beforePay': 'Before invoice payment',
    'invoice:afterPay': 'After invoice payment',

    // System hooks
    'system:beforeBackup': 'Before system backup',
    'system:afterBackup': 'After system backup',
    'system:beforeRestore': 'Before system restore',
    'system:afterRestore': 'After system restore',

    // UI hooks
    'ui:dashboardWidget': 'Add dashboard widget',
    'ui:sidebarMenu': 'Add sidebar menu item',
    'ui:userMenu': 'Add user menu item',
    'ui:settingsPage': 'Add settings page'
};

module.exports = {
    YumnaPlugin,
    PluginManifestSchema,
    AvailableHooks
};
