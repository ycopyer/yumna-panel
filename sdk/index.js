/**
 * Yumna Panel SDK
 * Official SDK for developing plugins
 * 
 * @version 3.0.0
 * @author Yumna Panel Team
 * @license MIT
 */

const { YumnaPlugin, PluginManifestSchema, AvailableHooks } = require('./YumnaPlugin');

/**
 * SDK Version
 */
const SDK_VERSION = '3.0.0';

/**
 * Minimum Yumna Panel version required
 */
const MIN_PANEL_VERSION = '3.0.0';

/**
 * Plugin helper utilities
 */
const PluginUtils = {
    /**
     * Validate plugin manifest
     */
    validateManifest(manifest) {
        const required = ['id', 'name', 'version', 'author', 'main'];
        const missing = required.filter(field => !manifest[field]);

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate version format
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(manifest.version)) {
            throw new Error('Invalid version format. Use semver (e.g., 1.0.0)');
        }

        return true;
    },

    /**
     * Check if hook name is valid
     */
    isValidHook(hookName) {
        return hookName in AvailableHooks;
    },

    /**
     * Get all available hooks
     */
    getAvailableHooks() {
        return { ...AvailableHooks };
    },

    /**
     * Parse semver version
     */
    parseVersion(version) {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!match) {
            throw new Error('Invalid version format');
        }

        return {
            major: parseInt(match[1]),
            minor: parseInt(match[2]),
            patch: parseInt(match[3])
        };
    },

    /**
     * Compare versions
     */
    compareVersions(v1, v2) {
        const ver1 = this.parseVersion(v1);
        const ver2 = this.parseVersion(v2);

        if (ver1.major !== ver2.major) {
            return ver1.major - ver2.major;
        }
        if (ver1.minor !== ver2.minor) {
            return ver1.minor - ver2.minor;
        }
        return ver1.patch - ver2.patch;
    },

    /**
     * Check version compatibility
     */
    isCompatible(pluginVersion, panelVersion) {
        try {
            const plugin = this.parseVersion(pluginVersion);
            const panel = this.parseVersion(panelVersion);

            // Major version must match
            return plugin.major === panel.major;
        } catch (error) {
            return false;
        }
    }
};

/**
 * Plugin API helpers
 */
const PluginAPI = {
    /**
     * Create a standardized API response
     */
    createResponse(success, data = null, error = null) {
        return {
            success,
            data,
            error,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Create success response
     */
    success(data) {
        return this.createResponse(true, data, null);
    },

    /**
     * Create error response
     */
    error(message, code = 'PLUGIN_ERROR') {
        return this.createResponse(false, null, { message, code });
    },

    /**
     * Validate request data
     */
    validateRequest(data, schema) {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            if (rules.required && !data[field]) {
                errors.push(`${field} is required`);
            }

            if (data[field] && rules.type) {
                const actualType = typeof data[field];
                if (actualType !== rules.type) {
                    errors.push(`${field} must be ${rules.type}`);
                }
            }

            if (data[field] && rules.pattern) {
                if (!rules.pattern.test(data[field])) {
                    errors.push(`${field} format is invalid`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

/**
 * Plugin logger
 */
class PluginLogger {
    constructor(pluginName) {
        this.pluginName = pluginName;
    }

    log(level, message, ...args) {
        const prefix = `[Plugin:${this.pluginName}]`;
        const timestamp = new Date().toISOString();

        switch (level) {
            case 'error':
                console.error(`${timestamp} ${prefix} [ERROR]`, message, ...args);
                break;
            case 'warn':
                console.warn(`${timestamp} ${prefix} [WARN]`, message, ...args);
                break;
            case 'debug':
                if (process.env.DEBUG) {
                    console.log(`${timestamp} ${prefix} [DEBUG]`, message, ...args);
                }
                break;
            case 'info':
            default:
                console.log(`${timestamp} ${prefix} [INFO]`, message, ...args);
                break;
        }
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
}

// Export SDK components
module.exports = {
    // Core
    YumnaPlugin,
    SDK_VERSION,
    MIN_PANEL_VERSION,

    // Schema
    PluginManifestSchema,
    AvailableHooks,

    // Utilities
    PluginUtils,
    PluginAPI,
    PluginLogger,

    // Convenience exports
    createPlugin: (config) => new YumnaPlugin(config),
    createLogger: (pluginName) => new PluginLogger(pluginName)
};
