#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLUGIN_TEMPLATE = {
    manifest: {
        id: '',
        name: '',
        version: '1.0.0',
        author: '',
        description: '',
        main: 'index.js',
        yumnaPanelVersion: '^3.0.0',
        dependencies: [],
        settings: {},
        permissions: []
    },
    index: `const { YumnaPlugin } = require('@yumnapanel/sdk');

class MyPlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'my-plugin',
            name: 'My Plugin',
            version: '1.0.0',
            author: 'Your Name',
            description: 'Plugin description'
        });
    }

    async initialize() {
        await super.initialize();
        
        // Register hooks
        this.registerHook('user:afterCreate', this.onUserCreate.bind(this), 10);
        
        // Register routes
        this.registerRoute('GET', '/hello', this.handleHello.bind(this), { auth: true });
        
        this.log('info', 'Plugin initialized successfully');
        return true;
    }

    async onUserCreate(data) {
        this.log('info', 'User created:', data.username);
        // Your custom logic here
        return data;
    }

    async handleHello(req, res) {
        res.json({
            message: 'Hello from My Plugin!',
            version: this.version
        });
    }

    async cleanup() {
        this.log('info', 'Cleaning up plugin');
        await super.cleanup();
        return true;
    }
}

module.exports = MyPlugin;
`,
    readme: `# Plugin Name

Description of your plugin.

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

Add your configuration in \`manifest.json\`.

## Usage

Describe how to use your plugin.

## Hooks

List of hooks used by this plugin:
- \`user:afterCreate\` - Triggered after user creation

## API Routes

- \`GET /api/plugins/my-plugin/hello\` - Test endpoint

## License

MIT
`,
    packageJson: {
        name: '',
        version: '1.0.0',
        description: '',
        main: 'index.js',
        scripts: {
            test: 'echo "Error: no test specified" && exit 1'
        },
        keywords: ['yumna-panel', 'plugin'],
        author: '',
        license: 'MIT',
        peerDependencies: {
            '@yumnapanel/sdk': '^3.0.0'
        }
    }
};

class PluginCLI {
    constructor() {
        this.commands = {
            create: this.createPlugin.bind(this),
            validate: this.validatePlugin.bind(this),
            build: this.buildPlugin.bind(this),
            install: this.installPlugin.bind(this),
            list: this.listPlugins.bind(this),
            help: this.showHelp.bind(this)
        };
    }

    run() {
        const args = process.argv.slice(2);
        const command = args[0] || 'help';

        if (this.commands[command]) {
            this.commands[command](args.slice(1));
        } else {
            console.error(`Unknown command: ${command}`);
            this.showHelp();
            process.exit(1);
        }
    }

    createPlugin(args) {
        const pluginName = args[0];

        if (!pluginName) {
            console.error('Error: Plugin name is required');
            console.log('Usage: yumna-plugin create <plugin-name>');
            process.exit(1);
        }

        const pluginDir = path.join(process.cwd(), pluginName);

        if (fs.existsSync(pluginDir)) {
            console.error(`Error: Directory ${pluginName} already exists`);
            process.exit(1);
        }

        console.log(`Creating plugin: ${pluginName}...`);

        // Create directory structure
        fs.mkdirSync(pluginDir);
        fs.mkdirSync(path.join(pluginDir, 'src'));

        // Create manifest.json
        const manifest = { ...PLUGIN_TEMPLATE.manifest };
        manifest.id = pluginName.toLowerCase().replace(/\s+/g, '-');
        manifest.name = pluginName;
        fs.writeFileSync(
            path.join(pluginDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        // Create index.js
        const indexContent = PLUGIN_TEMPLATE.index
            .replace(/my-plugin/g, manifest.id)
            .replace(/My Plugin/g, pluginName);
        fs.writeFileSync(
            path.join(pluginDir, 'index.js'),
            indexContent
        );

        // Create README.md
        const readmeContent = PLUGIN_TEMPLATE.readme
            .replace(/Plugin Name/g, pluginName)
            .replace(/my-plugin/g, manifest.id);
        fs.writeFileSync(
            path.join(pluginDir, 'README.md'),
            readmeContent
        );

        // Create package.json
        const packageJson = { ...PLUGIN_TEMPLATE.packageJson };
        packageJson.name = `@yumnapanel/plugin-${manifest.id}`;
        packageJson.description = `Yumna Panel plugin: ${pluginName}`;
        fs.writeFileSync(
            path.join(pluginDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Create .gitignore
        fs.writeFileSync(
            path.join(pluginDir, '.gitignore'),
            'node_modules/\n*.log\n.env\n'
        );

        console.log('✓ Plugin created successfully!');
        console.log('\nNext steps:');
        console.log(`  cd ${pluginName}`);
        console.log('  npm install');
        console.log('  # Edit manifest.json and index.js');
        console.log('  yumna-plugin validate');
    }

    validatePlugin(args) {
        const pluginDir = args[0] || process.cwd();
        const manifestPath = path.join(pluginDir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
            console.error('Error: manifest.json not found');
            process.exit(1);
        }

        console.log('Validating plugin...');

        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Validate required fields
            const required = ['id', 'name', 'version', 'author', 'main'];
            const missing = required.filter(field => !manifest[field]);

            if (missing.length > 0) {
                console.error('✗ Validation failed!');
                console.error('Missing required fields:', missing.join(', '));
                process.exit(1);
            }

            // Validate version format (semver)
            const versionRegex = /^\d+\.\d+\.\d+$/;
            if (!versionRegex.test(manifest.version)) {
                console.error('✗ Invalid version format. Use semver (e.g., 1.0.0)');
                process.exit(1);
            }

            // Check if main file exists
            const mainPath = path.join(pluginDir, manifest.main);
            if (!fs.existsSync(mainPath)) {
                console.error(`✗ Main file not found: ${manifest.main}`);
                process.exit(1);
            }

            console.log('✓ Plugin validation passed!');
            console.log('\nPlugin Info:');
            console.log(`  ID: ${manifest.id}`);
            console.log(`  Name: ${manifest.name}`);
            console.log(`  Version: ${manifest.version}`);
            console.log(`  Author: ${manifest.author}`);

        } catch (error) {
            console.error('✗ Validation failed:', error.message);
            process.exit(1);
        }
    }

    buildPlugin(args) {
        const pluginDir = args[0] || process.cwd();

        console.log('Building plugin...');

        try {
            // Run npm install
            console.log('Installing dependencies...');
            execSync('npm install', { cwd: pluginDir, stdio: 'inherit' });

            // Validate
            this.validatePlugin([pluginDir]);

            console.log('✓ Plugin built successfully!');

        } catch (error) {
            console.error('✗ Build failed:', error.message);
            process.exit(1);
        }
    }

    installPlugin(args) {
        const pluginPath = args[0];

        if (!pluginPath) {
            console.error('Error: Plugin path is required');
            console.log('Usage: yumna-plugin install <plugin-path>');
            process.exit(1);
        }

        console.log(`Installing plugin from ${pluginPath}...`);

        try {
            const manifestPath = path.join(pluginPath, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Copy to plugins directory
            const pluginsDir = path.join(process.cwd(), 'plugins');
            if (!fs.existsSync(pluginsDir)) {
                fs.mkdirSync(pluginsDir);
            }

            const targetDir = path.join(pluginsDir, manifest.id);

            // Copy files
            this.copyDirectory(pluginPath, targetDir);

            console.log(`✓ Plugin ${manifest.name} installed successfully!`);
            console.log(`Location: ${targetDir}`);

        } catch (error) {
            console.error('✗ Installation failed:', error.message);
            process.exit(1);
        }
    }

    listPlugins(args) {
        const pluginsDir = path.join(process.cwd(), 'plugins');

        if (!fs.existsSync(pluginsDir)) {
            console.log('No plugins installed');
            return;
        }

        const plugins = fs.readdirSync(pluginsDir)
            .filter(name => {
                const manifestPath = path.join(pluginsDir, name, 'manifest.json');
                return fs.existsSync(manifestPath);
            });

        if (plugins.length === 0) {
            console.log('No plugins installed');
            return;
        }

        console.log('Installed Plugins:\n');

        plugins.forEach(pluginId => {
            const manifestPath = path.join(pluginsDir, pluginId, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            console.log(`  ${manifest.name} (${manifest.id})`);
            console.log(`    Version: ${manifest.version}`);
            console.log(`    Author: ${manifest.author}`);
            console.log(`    Description: ${manifest.description || 'N/A'}`);
            console.log('');
        });
    }

    copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules') {
                    this.copyDirectory(srcPath, destPath);
                }
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    showHelp() {
        console.log(`
Yumna Panel Plugin CLI

Usage: yumna-plugin <command> [options]

Commands:
  create <name>      Create a new plugin
  validate [path]    Validate plugin manifest
  build [path]       Build plugin (install deps + validate)
  install <path>     Install plugin to Yumna Panel
  list               List installed plugins
  help               Show this help message

Examples:
  yumna-plugin create my-awesome-plugin
  yumna-plugin validate ./my-plugin
  yumna-plugin build ./my-plugin
  yumna-plugin install ./my-plugin
  yumna-plugin list

For more information, visit: https://docs.yumnapanel.com/plugins
        `);
    }
}

// Run CLI
if (require.main === module) {
    const cli = new PluginCLI();
    cli.run();
}

module.exports = PluginCLI;
