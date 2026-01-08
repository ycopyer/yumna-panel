const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');
const os = require('os');
const WebServerService = require('./webserver');
const { findPHPDir } = require('../utils/phpUtils');

const APPS_DIR = os.platform() === 'win32' ? 'C:\\YumnaPanel\\bin\\apps' : '/usr/local/yumnapanel/apps';
const TEMP_DIR = os.platform() === 'win32' ? 'C:\\YumnaPanel\\temp' : '/tmp/yumnapanel_temp';
const isWin = os.platform() === 'win32';

class PluginService {

    constructor() {
        if (!fs.existsSync(APPS_DIR)) {
            fs.mkdirSync(APPS_DIR, { recursive: true });
        }
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    }

    getAvailablePlugins() {
        const plugins = [
            {
                id: 'phpmyadmin',
                name: 'phpMyAdmin',
                description: 'A popular tool written in PHP, intended to handle the administration of MySQL over the Web.',
                version: '5.2.1',
                icon: 'Database',
                category: 'Database Base',
                installed: fs.existsSync(path.join(APPS_DIR, 'phpmyadmin'))
            },
            {
                id: 'docker',
                name: 'Docker Desktop',
                description: 'Manage containers, images, and applications. (Requires Manual Installer interaction)',
                version: 'Latest',
                icon: 'Box',
                category: 'DevOps',
                installed: false // Difficult to detect accurately without shell check, assuming false for installer trigger
            },
            {
                id: 'composer',
                name: 'Composer',
                description: 'Dependency Manager for PHP.',
                version: '2.x',
                icon: 'Package',
                category: 'PHP',
                installed: fs.existsSync('C:\\YumnaPanel\\bin\\php\\composer.phar')
            }
        ];

        // Re-check dynamic statuses if needed
        // For Docker, we might check binary presence
        try {
            // Check docker
            // const isDocker = execSync('docker -v').toString();
            // plugins.find(p => p.id === 'docker').installed = true;
        } catch (e) { }

        return plugins;
    }

    async downloadFile(url, dest) {
        const writer = fs.createWriteStream(dest);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    async installPlugin(id) {
        switch (id) {
            case 'phpmyadmin':
                return await this.installPhpMyAdmin();
            case 'docker':
                return await this.installDocker();
            case 'composer':
                return await this.installComposer();
            default:
                throw new Error('Plugin installation script not found.');
        }
    }

    async uninstallPlugin(id) {
        switch (id) {
            case 'phpmyadmin':
                const pmaPath = path.join(APPS_DIR, 'phpmyadmin');
                if (fs.existsSync(pmaPath)) {
                    await fsp.rm(pmaPath, { recursive: true, force: true });
                }
                // Remove config?
                const confPath = 'C:\\YumnaPanel\\etc\\nginx\\sites-enabled\\phpmyadmin.conf';
                if (fs.existsSync(confPath)) {
                    await fsp.unlink(confPath);
                    // Reload Nginx
                    this.reloadNginx();
                }
                return { message: 'phpMyAdmin removed.' };
            case 'composer':
                if (fs.existsSync('C:\\YumnaPanel\\bin\\php\\composer.phar')) {
                    await fsp.unlink('C:\\YumnaPanel\\bin\\php\\composer.phar');
                }
                return { message: 'Composer removed.' };
            default:
                throw new Error('Plugin uninstallation script not found.');
        }
    }

    // --- Installers ---

    async installPhpMyAdmin() {
        const url = 'https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.zip';
        const zipPath = path.join(TEMP_DIR, 'pma.zip');
        const extractPath = path.join(APPS_DIR, 'phpmyadmin');

        console.log('[Plugin] Downloading phpMyAdmin...');
        await this.downloadFile(url, zipPath);

        console.log('[Plugin] Extracting...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(APPS_DIR, true);

        // Rename folder (it usually extracts as phpMyAdmin-5.2.1-all-languages)
        const entries = fs.readdirSync(APPS_DIR);
        const pmaFolder = entries.find(e => e.startsWith('phpMyAdmin-') && e.endsWith('-languages'));

        console.log(`[Plugin] Extracted to: ${pmaFolder}`);

        if (pmaFolder) {
            const fullSrc = path.join(APPS_DIR, pmaFolder);
            // If target exists, remove it first
            if (fs.existsSync(extractPath)) {
                await fsp.rm(extractPath, { recursive: true, force: true });
            }
            // Retry rename with delay if needed (Windows locking)
            // Retry rename with delay if needed (Windows locking)
            try {
                // Try simple rename first
                await fsp.rename(fullSrc, extractPath);
            } catch (err) {
                console.log('[Plugin] Rename failed, trying copy-delete strategy...', err.message);
                // Fallback: Copy and Delete (Windows EPERM workaround)
                await new Promise(r => setTimeout(r, 1000));

                // Recursive copy function
                async function copyRecursive(src, dest) {
                    const stats = await fsp.stat(src);
                    if (stats.isDirectory()) {
                        await fsp.mkdir(dest, { recursive: true });
                        const entries = await fsp.readdir(src);
                        for (const entry of entries) {
                            await copyRecursive(path.join(src, entry), path.join(dest, entry));
                        }
                    } else {
                        await fsp.copyFile(src, dest);
                    }
                }

                await copyRecursive(fullSrc, extractPath);

                // Try to clean up source, ignore errors if locked
                try {
                    await fsp.rm(fullSrc, { recursive: true, force: true });
                } catch (e) {
                    console.warn('[Plugin] Could not remove source folder after copy, might be locked:', e.message);
                }
            }
        } else {
            console.error('[Plugin] Failed to find extracted phpMyAdmin folder in:', APPS_DIR, entries);
            throw new Error('Failed to find extracted phpMyAdmin folder');
        }

        // Cleanup
        await fsp.unlink(zipPath);

        // Configure Config
        const copyConfig = path.join(extractPath, 'config.sample.inc.php');
        const targetConfig = path.join(extractPath, 'config.inc.php');
        if (fs.existsSync(copyConfig)) {
            let content = await fsp.readFile(copyConfig, 'utf8');
            // Generate random secret
            const secret = require('crypto').randomBytes(16).toString('hex');
            content = content.replace(/\$cfg\['blowfish_secret'\] = '';/, `$cfg['blowfish_secret'] = '${secret}';`);
            content = content.replace(/localhost/, '127.0.0.1'); // Ensure TCP
            await fsp.writeFile(targetConfig, content);
        }

        // --- DYNAMIC PHP CONFIGURATION ---
        // Find best PHP version (prefer 8.2, then 8.1, then 8.3, etc)
        const preferredVersions = ['8.2', '8.1', '8.3', '7.4'];
        let selectedVersion = '8.2';
        let phpDir = null;

        for (const v of preferredVersions) {
            phpDir = findPHPDir(v);
            if (phpDir) {
                selectedVersion = v;
                break;
            }
        }

        // Output warning if no PHP found, but try to proceed with default
        if (!phpDir) {
            console.warn('[Plugin] Could not find preferred PHP version, attempting to use default 8.2.');
        } else {
            // If found via full path (e.g. php-8.2.30...), extract major/minor for port calc
            // If version string is full path or complex, ensure we have a clean "8.2" style string for processing if needed
            // checking if selectedVersion matches '8.2', if it was found via 'findPHPDir' using that search key
        }

        // Calculate Port
        const vPart = selectedVersion.replace(/[^0-9]/g, ''); // 8.2 -> 82
        const phpPort = vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000'; // 9082

        console.log(`[Plugin] Using PHP ${selectedVersion} at ${phpDir || 'default'} on port ${phpPort}`);

        // Ensure PHP Extensions are enabled (mysqli, mbstring, etc)
        if (phpDir) {
            try {
                const iniPath = path.join(phpDir, 'php.ini');
                if (fs.existsSync(iniPath)) {
                    let iniContent = await fsp.readFile(iniPath, 'utf8');
                    let modified = false;

                    const extensions = ['mysqli', 'mbstring', 'openssl', 'curl', 'gd', 'zip'];
                    extensions.forEach(ext => {
                        // Regex to find ; extension=ext or ;extension=ext
                        const regex = new RegExp(`^;\\s*extension\\s*=\\s*${ext}`, 'mi');
                        if (regex.test(iniContent)) {
                            iniContent = iniContent.replace(regex, `extension=${ext}`);
                            modified = true;
                        }
                    });

                    // Also ensure extension_dir is correct
                    const extDirRegex = /^;\s*extension_dir\s*=\s*"ext"/mi;
                    if (extDirRegex.test(iniContent)) {
                        iniContent = iniContent.replace(extDirRegex, 'extension_dir = "ext"');
                        modified = true;
                    }

                    if (modified) {
                        console.log('[Plugin] Enabling required PHP extensions for phpMyAdmin...');
                        await fsp.writeFile(iniPath, iniContent);
                    }
                }
            } catch (err) {
                console.warn('[Plugin] Failed to auto-configure php.ini:', err.message);
            }

            await WebServerService.ensurePHPProcess(phpDir, phpPort);
        }

        // Configure Nginx
        const pmaRoot = isWin ? "C:/YumnaPanel/bin/apps/phpmyadmin" : "/usr/local/yumnapanel/apps/phpmyadmin";

        const confContent = `
server {
    listen 8090;
    server_name localhost;
    root "${pmaRoot}";
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass ${fastCgiPass};
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
        `;

        await fsp.writeFile('C:\\YumnaPanel\\etc\\nginx\\sites-enabled\\phpmyadmin.conf', confContent);

        this.reloadNginx();

        return { message: `phpMyAdmin installed on port 8090(PHP ${selectedVersion})`, url: 'http://localhost:8090' };
    }

    async installComposer() {
        const url = 'https://getcomposer.org/composer.phar';
        const dest = 'C:\\YumnaPanel\\bin\\php\\composer.phar';
        await this.downloadFile(url, dest);

        // Create bat wrapper
        const batContent = `@echo off
php "%~dp0composer.phar" %*
`;
        await fsp.writeFile('C:\\YumnaPanel\\bin\\php\\composer.bat', batContent);

        return { message: 'Composer installed.' };
    }

    async installDocker() {
        if (!isWin) {
            return { message: 'On Linux, please install Docker via terminal: curl -fsSL https://get.docker.com | sh' };
        }

        const url = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
        const dest = path.join(TEMP_DIR, 'DockerInstaller.exe');

        console.log('[Plugin] Downloading Docker Desktop...');
        await this.downloadFile(url, dest);

        console.log('[Plugin] Running Docker Installer...');
        // Launch the graphical installer so the user can see progress and errors
        exec(`start "" "${dest}"`, (err) => {
            if (err) console.error('Docker install trigger failed', err);
        });

        return { message: 'Docker Desktop Installer downloaded. The installation window has been launched on the server desktop. Please complete the setup there.' };
    }

    reloadNginx() {
        exec('taskkill /IM nginx.exe /F & start "" "C:\\YumnaPanel\\bin\\web\\nginx\\nginx.exe" -p "C:\\YumnaPanel\\bin\\web\\nginx"', (err) => {
            if (err) console.error('Nginx reload failed', err);
        });
    }
}

module.exports = new PluginService();
