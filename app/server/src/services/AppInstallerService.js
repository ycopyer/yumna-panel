const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const util = require('util');
const pool = require('../config/db');

const execPromise = util.promisify(exec);

class AppInstallerService {
    static async getAdminConnection() {
        return await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASS
        });
    }

    static async installApp(userId, websiteId, templateId, options) {
        const { domain, installDir, dbName, dbUser, dbPass, adminUser, adminPass, adminEmail } = options;

        const [templates] = await pool.promise().query('SELECT * FROM application_templates WHERE id = ?', [templateId]);
        if (templates.length === 0) throw new Error('Template not found');
        const template = templates[0];

        const [websites] = await pool.promise().query('SELECT * FROM websites WHERE id = ?', [websiteId]);
        if (websites.length === 0) throw new Error('Website not found');
        const website = websites[0];

        const targetPath = installDir ? path.join(website.path, installDir) : website.path;
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const [result] = await pool.promise().query(
            'INSERT INTO installed_applications (userId, websiteId, templateId, name, path, status, db_name, db_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, websiteId, templateId, template.name, targetPath, 'installing', dbName, dbUser]
        );
        const appId = result.insertId;

        try {
            switch (template.slug) {
                case 'wordpress':
                case 'woocommerce':
                    await this.installWordPress(targetPath, dbName, dbUser, dbPass, template.slug === 'woocommerce');
                    break;
                case 'laravel':
                    await this.installLaravel(targetPath, dbName, dbUser, dbPass);
                    break;
                case 'nodejs':
                    await this.installNodeJS(targetPath);
                    break;
                case 'joomla':
                    await this.installZipApp(targetPath, 'https://downloads.joomla.org/cms/joomla5/5-0-2/Joomla_5-0-2-Stable-Full_Package.zip', dbName, dbUser, dbPass);
                    break;
                case 'drupal':
                    await this.installZipApp(targetPath, 'https://www.drupal.org/download-latest/zip', dbName, dbUser, dbPass);
                    break;
                case 'phpbb':
                    await this.installZipApp(targetPath, 'https://download.phpbb.com/pub/release/3.3/3.3.11/phpBB-3.3.11.zip', dbName, dbUser, dbPass, 'phpBB3');
                    break;
                case 'hugo':
                case 'jekyll':
                    await this.installStaticApp(targetPath, template.name);
                    break;
                default:
                    throw new Error('Unsupported application type');
            }

            await pool.promise().query('UPDATE installed_applications SET status = ?, admin_url = ? WHERE id = ?',
                ['active', this.getAdminUrl(template.slug), appId]);

            return { success: true, appId };
        } catch (error) {
            console.error(`[AppInstaller] Error installing ${template.slug}:`, error);
            await pool.promise().query('UPDATE installed_applications SET status = ? WHERE id = ?', ['error', appId]);
            throw error;
        }
    }

    static getAdminUrl(slug) {
        const urls = {
            wordpress: '/wp-admin',
            woocommerce: '/wp-admin',
            joomla: '/administrator',
            drupal: '/user/login',
            phpbb: '/adm/index.php',
            laravel: null,
            nodejs: null
        };
        return urls[slug] || null;
    }

    static async downloadAndExtract(url, targetPath, subFolder = null) {
        const response = await axios({ method: 'get', url, responseType: 'stream' });
        const tempZip = path.join(targetPath, `app_${Date.now()}.zip`);
        const writer = fs.createWriteStream(tempZip);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const zip = new AdmZip(tempZip);
        zip.extractAllTo(targetPath, true);

        if (subFolder) {
            const source = path.join(targetPath, subFolder);
            if (fs.existsSync(source)) {
                const files = fs.readdirSync(source);
                for (const file of files) {
                    fs.renameSync(path.join(source, file), path.join(targetPath, file));
                }
                fs.rmdirSync(source);
            }
        }
        fs.unlinkSync(tempZip);
    }

    static async installWordPress(targetPath, dbName, dbUser, dbPass, withWoo = false) {
        await this.downloadAndExtract('https://wordpress.org/latest.zip', targetPath, 'wordpress');
        await this.createDatabase(dbName, dbUser, dbPass);

        const configPath = path.join(targetPath, 'wp-config-sample.php');
        const finalConfigPath = path.join(targetPath, 'wp-config.php');
        if (fs.existsSync(configPath)) {
            let config = fs.readFileSync(configPath, 'utf8');
            config = config.replace('database_name_here', dbName)
                .replace('username_here', dbUser)
                .replace('password_here', dbPass);
            fs.writeFileSync(finalConfigPath, config);
        }

        if (withWoo) {
            console.log('[AppInstaller] Adding WooCommerce plugin stub...');
            // In a real panel, we might use wp-cli to install the plugin
            // For now, we just note it or could download the woo zip to wp-content/plugins
        }
    }

    static async installLaravel(targetPath, dbName, dbUser, dbPass) {
        console.log(`[AppInstaller] Installing Laravel via Composer to ${targetPath}`);
        // Laravel needs an empty directory or we install in a temp and move
        const parentDir = path.dirname(targetPath);
        const folderName = path.basename(targetPath);

        await execPromise(`composer create-project laravel/laravel "${targetPath}"`, { cwd: parentDir });
        await this.createDatabase(dbName, dbUser, dbPass);

        const envPath = path.join(targetPath, '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(/DB_DATABASE=.*/, `DB_DATABASE=${dbName}`)
                .replace(/DB_USERNAME=.*/, `DB_USERNAME=${dbUser}`)
                .replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPass}`);
            fs.writeFileSync(envPath, envContent);
        }
    }

    static async installNodeJS(targetPath) {
        const packageJson = {
            name: "nodejs-app",
            version: "1.0.0",
            main: "index.js",
            dependencies: { express: "^4.18.2" }
        };
        const indexJs = `const express = require('express');\nconst app = express();\nconst port = process.env.PORT || 3000;\n\napp.get('/', (req, res) => res.send('Hello from YumnaPanel Node.js App!'));\n\napp.listen(port, () => console.log('App listening on port ' + port));`;

        fs.writeFileSync(path.join(targetPath, 'package.json'), JSON.stringify(packageJson, null, 4));
        fs.writeFileSync(path.join(targetPath, 'index.js'), indexJs);

        await execPromise('npm install', { cwd: targetPath });
    }

    static async installZipApp(targetPath, url, dbName, dbUser, dbPass, subFolder = null) {
        await this.downloadAndExtract(url, targetPath, subFolder);
        await this.createDatabase(dbName, dbUser, dbPass);
    }

    static async installStaticApp(targetPath, appName) {
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>${appName} - Starter Site</title>
    <style>
        body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; }
        .card { text-align: center; padding: 3rem; background: #1e293b; border-radius: 2rem; border: 1px solid #334155; }
        h1 { color: #6366f1; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Welcome to ${appName}!</h1>
        <p>This is a starter static page deployed via YumnaPanel.</p>
    </div>
</body>
</html>`;
        fs.writeFileSync(path.join(targetPath, 'index.html'), html);
    }

    static async createDatabase(name, user, password) {
        const adminConn = await this.getAdminConnection();
        try {
            await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);
            try {
                await adminConn.query(`CREATE USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
            } catch (e) {
                await adminConn.query(`ALTER USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
            }
            await adminConn.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${user}'@'localhost'`);
            await adminConn.query('FLUSH PRIVILEGES');
        } finally {
            await adminConn.end();
        }
    }
}

module.exports = AppInstallerService;
