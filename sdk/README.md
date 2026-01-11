# 🔌 Yumna Panel Plugin SDK

Official SDK for developing plugins for Yumna Panel v3.0+

## Installation

```bash
npm install -g @yumnapanel/sdk
```

## Quick Start

### 1. Create a New Plugin

```bash
yumna-plugin create my-awesome-plugin
cd my-awesome-plugin
npm install
```

### 2. Edit Your Plugin

Edit `index.js`:

```javascript
const { YumnaPlugin } = require('@yumnapanel/sdk');

class MyAwesomePlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'my-awesome-plugin',
            name: 'My Awesome Plugin',
            version: '1.0.0',
            author: 'Your Name',
            description: 'Does awesome things'
        });
    }

    async initialize() {
        await super.initialize();
        
        // Register hooks
        this.registerHook('user:afterCreate', this.onUserCreate.bind(this));
        
        // Register API routes
        this.registerRoute('GET', '/stats', this.getStats.bind(this));
        
        return true;
    }

    async onUserCreate(data) {
        this.log('info', 'New user created:', data.username);
        // Your custom logic
        return data;
    }

    async getStats(req, res) {
        res.json({
            message: 'Plugin statistics',
            version: this.version
        });
    }
}

module.exports = MyAwesomePlugin;
```

### 3. Validate & Build

```bash
yumna-plugin validate
yumna-plugin build
```

### 4. Install to Yumna Panel

```bash
yumna-plugin install .
```

---

## Plugin Structure

```
my-plugin/
├── manifest.json       # Plugin metadata
├── index.js           # Main entry point
├── package.json       # NPM package config
├── README.md          # Documentation
└── src/               # Source files (optional)
    └── ...
```

---

## Manifest Schema

`manifest.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Plugin description",
  "homepage": "https://github.com/you/my-plugin",
  "repository": "https://github.com/you/my-plugin",
  "license": "MIT",
  "main": "index.js",
  "yumnaPanelVersion": "^3.0.0",
  "dependencies": [],
  "settings": {
    "enabled": true,
    "apiKey": ""
  },
  "permissions": [
    "users:read",
    "websites:write"
  ]
}
```

### Required Fields

- `id` - Unique plugin identifier (lowercase, hyphens)
- `name` - Human-readable name
- `version` - Semver version (e.g., 1.0.0)
- `author` - Author name
- `main` - Entry point file

### Optional Fields

- `description` - Plugin description
- `homepage` - Plugin homepage URL
- `repository` - Source repository URL
- `license` - License type
- `yumnaPanelVersion` - Compatible panel version range
- `dependencies` - Array of plugin dependencies
- `settings` - Default settings object
- `permissions` - Required permissions array

---

## API Reference

### YumnaPlugin Class

Base class for all plugins.

#### Constructor

```javascript
constructor(config)
```

**Parameters:**
- `config.id` - Plugin ID
- `config.name` - Plugin name
- `config.version` - Plugin version
- `config.author` - Author name
- `config.description` - Description
- `config.dependencies` - Dependencies array
- `config.settings` - Default settings

#### Methods

##### initialize()

```javascript
async initialize()
```

Initialize the plugin. Override this method.

**Returns:** `Promise<boolean>`

##### cleanup()

```javascript
async cleanup()
```

Cleanup plugin resources. Override this method.

**Returns:** `Promise<boolean>`

##### registerHook(hookName, handler, priority)

```javascript
registerHook(hookName, handler, priority = 10)
```

Register a hook handler.

**Parameters:**
- `hookName` - Hook name (see Available Hooks)
- `handler` - Handler function
- `priority` - Execution priority (lower = earlier)

**Example:**
```javascript
this.registerHook('user:afterCreate', async (data) => {
    console.log('User created:', data);
    return data;
}, 10);
```

##### registerRoute(method, path, handler, options)

```javascript
registerRoute(method, path, handler, options = {})
```

Register an API route.

**Parameters:**
- `method` - HTTP method (GET, POST, PUT, DELETE)
- `path` - Route path (relative to `/api/plugins/{id}`)
- `handler` - Route handler function
- `options.auth` - Require authentication (default: false)
- `options.admin` - Require admin role (default: false)

**Example:**
```javascript
this.registerRoute('GET', '/hello', async (req, res) => {
    res.json({ message: 'Hello!' });
}, { auth: true });
```

##### getSetting(key, defaultValue)

```javascript
getSetting(key, defaultValue = null)
```

Get plugin setting value.

##### setSetting(key, value)

```javascript
setSetting(key, value)
```

Set plugin setting value.

##### log(level, message, ...args)

```javascript
log(level, message, ...args)
```

Log message with plugin context.

**Levels:** `info`, `warn`, `error`

##### emit(eventName, data)

```javascript
emit(eventName, data)
```

Emit an event for plugin-to-plugin communication.

---

## Available Hooks

### User Hooks

- `user:beforeCreate` - Before user creation
- `user:afterCreate` - After user creation
- `user:beforeUpdate` - Before user update
- `user:afterUpdate` - After user update
- `user:beforeDelete` - Before user deletion
- `user:afterDelete` - After user deletion

### Website Hooks

- `website:beforeCreate` - Before website creation
- `website:afterCreate` - After website creation
- `website:beforeDelete` - Before website deletion
- `website:afterDelete` - After website deletion

### Database Hooks

- `database:beforeCreate` - Before database creation
- `database:afterCreate` - After database creation
- `database:beforeDelete` - Before database deletion
- `database:afterDelete` - After database deletion

### DNS Hooks

- `dns:beforeZoneCreate` - Before DNS zone creation
- `dns:afterZoneCreate` - After DNS zone creation
- `dns:beforeRecordCreate` - Before DNS record creation
- `dns:afterRecordCreate` - After DNS record creation

### Payment Hooks

- `payment:beforeProcess` - Before payment processing
- `payment:afterProcess` - After payment processing
- `payment:beforeRefund` - Before refund processing
- `payment:afterRefund` - After refund processing

### Billing Hooks

- `invoice:beforeCreate` - Before invoice creation
- `invoice:afterCreate` - After invoice creation
- `invoice:beforePay` - Before invoice payment
- `invoice:afterPay` - After invoice payment

### System Hooks

- `system:beforeBackup` - Before system backup
- `system:afterBackup` - After system backup
- `system:beforeRestore` - Before system restore
- `system:afterRestore` - After system restore

### UI Hooks

- `ui:dashboardWidget` - Add dashboard widget
- `ui:sidebarMenu` - Add sidebar menu item
- `ui:userMenu` - Add user menu item
- `ui:settingsPage` - Add settings page

---

## Utilities

### PluginUtils

```javascript
const { PluginUtils } = require('@yumnapanel/sdk');

// Validate manifest
PluginUtils.validateManifest(manifest);

// Check hook validity
PluginUtils.isValidHook('user:afterCreate');

// Get available hooks
const hooks = PluginUtils.getAvailableHooks();

// Version comparison
PluginUtils.compareVersions('1.0.0', '2.0.0'); // -1

// Check compatibility
PluginUtils.isCompatible('3.0.0', '3.1.0'); // true
```

### PluginAPI

```javascript
const { PluginAPI } = require('@yumnapanel/sdk');

// Create responses
PluginAPI.success({ data: 'value' });
PluginAPI.error('Error message', 'ERROR_CODE');

// Validate request
const validation = PluginAPI.validateRequest(data, {
    username: { required: true, type: 'string' },
    email: { required: true, pattern: /^.+@.+$/ }
});
```

### PluginLogger

```javascript
const { PluginLogger } = require('@yumnapanel/sdk');

const logger = new PluginLogger('MyPlugin');

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message'); // Only if DEBUG=true
```

---

## CLI Commands

### create

Create a new plugin from template.

```bash
yumna-plugin create <plugin-name>
```

### validate

Validate plugin manifest and structure.

```bash
yumna-plugin validate [path]
```

### build

Build plugin (install dependencies + validate).

```bash
yumna-plugin build [path]
```

### install

Install plugin to Yumna Panel.

```bash
yumna-plugin install <plugin-path>
```

### list

List installed plugins.

```bash
yumna-plugin list
```

---

## Examples

### Example 1: User Notification Plugin

```javascript
const { YumnaPlugin } = require('@yumnapanel/sdk');
const nodemailer = require('nodemailer');

class UserNotificationPlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'user-notifications',
            name: 'User Notifications',
            version: '1.0.0',
            author: 'Your Name'
        });
    }

    async initialize() {
        await super.initialize();
        
        this.registerHook('user:afterCreate', this.sendWelcomeEmail.bind(this));
        
        return true;
    }

    async sendWelcomeEmail(userData) {
        const transporter = nodemailer.createTransporter({
            host: this.getSetting('smtpHost'),
            port: this.getSetting('smtpPort'),
            auth: {
                user: this.getSetting('smtpUser'),
                pass: this.getSetting('smtpPass')
            }
        });

        await transporter.sendMail({
            from: 'noreply@yumnapanel.com',
            to: userData.email,
            subject: 'Welcome to Yumna Panel!',
            text: `Hello ${userData.username}, welcome aboard!`
        });

        this.log('info', `Welcome email sent to ${userData.email}`);
        
        return userData;
    }
}

module.exports = UserNotificationPlugin;
```

### Example 2: Custom Analytics Plugin

```javascript
const { YumnaPlugin } = require('@yumnapanel/sdk');

class AnalyticsPlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'custom-analytics',
            name: 'Custom Analytics',
            version: '1.0.0',
            author: 'Your Name'
        });
        
        this.stats = {
            users: 0,
            websites: 0,
            databases: 0
        };
    }

    async initialize() {
        await super.initialize();
        
        // Track events
        this.registerHook('user:afterCreate', this.trackUserCreation.bind(this));
        this.registerHook('website:afterCreate', this.trackWebsiteCreation.bind(this));
        this.registerHook('database:afterCreate', this.trackDatabaseCreation.bind(this));
        
        // API endpoints
        this.registerRoute('GET', '/stats', this.getStats.bind(this));
        this.registerRoute('POST', '/reset', this.resetStats.bind(this), { admin: true });
        
        return true;
    }

    async trackUserCreation(data) {
        this.stats.users++;
        this.log('info', `Total users: ${this.stats.users}`);
        return data;
    }

    async trackWebsiteCreation(data) {
        this.stats.websites++;
        return data;
    }

    async trackDatabaseCreation(data) {
        this.stats.databases++;
        return data;
    }

    async getStats(req, res) {
        res.json({
            success: true,
            stats: this.stats
        });
    }

    async resetStats(req, res) {
        this.stats = { users: 0, websites: 0, databases: 0 };
        res.json({ success: true, message: 'Stats reset' });
    }
}

module.exports = AnalyticsPlugin;
```

### Example 3: Backup Notification Plugin

```javascript
const { YumnaPlugin } = require('@yumnapanel/sdk');

class BackupNotificationPlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'backup-notifications',
            name: 'Backup Notifications',
            version: '1.0.0',
            author: 'Your Name'
        });
    }

    async initialize() {
        await super.initialize();
        
        this.registerHook('system:afterBackup', this.onBackupComplete.bind(this));
        this.registerHook('system:beforeBackup', this.onBackupStart.bind(this));
        
        return true;
    }

    async onBackupStart(data) {
        this.log('info', 'Backup started');
        // Send notification
        return data;
    }

    async onBackupComplete(data) {
        this.log('info', 'Backup completed successfully');
        
        // Send success notification via webhook
        const webhookUrl = this.getSetting('webhookUrl');
        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'backup_complete',
                    timestamp: new Date().toISOString(),
                    data: data
                })
            });
        }
        
        return data;
    }
}

module.exports = BackupNotificationPlugin;
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
async onUserCreate(data) {
    try {
        // Your logic
        return data;
    } catch (error) {
        this.log('error', 'Failed to process user creation:', error);
        return data; // Return original data to not break the chain
    }
}
```

### 2. Async Operations

Use async/await for all asynchronous operations:

```javascript
async initialize() {
    await super.initialize();
    await this.loadConfig();
    await this.connectToDatabase();
    return true;
}
```

### 3. Settings Management

Use settings for configuration:

```javascript
const apiKey = this.getSetting('apiKey');
if (!apiKey) {
    this.log('warn', 'API key not configured');
    return;
}
```

### 4. Logging

Use appropriate log levels:

```javascript
this.log('info', 'Normal operation');
this.log('warn', 'Something unusual');
this.log('error', 'Something failed');
```

### 5. Hook Priority

Use priority to control execution order:

```javascript
// Run first
this.registerHook('user:afterCreate', handler1, 1);

// Run later
this.registerHook('user:afterCreate', handler2, 10);
```

---

## Testing

### Unit Testing

```javascript
const MyPlugin = require('./index');

describe('MyPlugin', () => {
    let plugin;

    beforeEach(() => {
        plugin = new MyPlugin();
    });

    test('should initialize', async () => {
        const result = await plugin.initialize();
        expect(result).toBe(true);
        expect(plugin.initialized).toBe(true);
    });

    test('should handle user creation', async () => {
        const data = { username: 'test', email: 'test@example.com' };
        const result = await plugin.onUserCreate(data);
        expect(result).toEqual(data);
    });
});
```

---

## Publishing

### 1. Prepare for Publishing

```bash
# Update version
npm version patch

# Test
yumna-plugin validate
yumna-plugin build
```

### 2. Publish to NPM

```bash
npm publish --access public
```

### 3. Submit to Plugin Marketplace

Visit https://marketplace.yumnapanel.com and submit your plugin.

---

## Support

- **Documentation**: https://docs.yumnapanel.com/sdk
- **Examples**: https://github.com/ycopyer/yumna-panel-plugins
- **Issues**: https://github.com/ycopyer/yumna-panel-sdk/issues
- **Discord**: https://discord.gg/yumnapanel

---

## License

MIT

---

**Last Updated**: January 11, 2026  
**SDK Version**: 3.0.0  
**Compatible with**: Yumna Panel v3.0.0+
