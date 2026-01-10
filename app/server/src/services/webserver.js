const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

class WebServerService {
    /**
     * Get platform specific paths
     */
    static getConfigs() {
        const isWin = os.platform() === 'win32';
        const panelRoot = 'C:\\YumnaPanel';

        const useStandalone = require('fs').existsSync(panelRoot);

        if (isWin) {
            const nginxBase = `${panelRoot}\\bin\\web\\nginx`;
            const nginxConfig = `${panelRoot}\\etc\\nginx`;

            const apacheBase = `${panelRoot}\\bin\\web\\apache`;
            const apacheConfig = `${panelRoot}\\etc\\apache2`;

            return {
                isWin,
                useStandalone,
                nginx: {
                    base: nginxBase,
                    available: `${nginxConfig}\\sites-enabled`,
                    enabled: `${nginxConfig}\\sites-enabled`,
                    reload: `taskkill /IM nginx.exe /F & start "" "${nginxBase}\\nginx.exe" -p "${nginxBase}"`
                },
                apache: {
                    base: apacheBase,
                    available: `${apacheConfig}\\sites-enabled`,
                    enabled: `${apacheConfig}\\sites-enabled`,
                    reload: `taskkill /IM httpd.exe /F & start "" "${apacheBase}\\bin\\httpd.exe"`
                }
            };
        }

        return {
            isWin,
            nginx: {
                available: '/etc/nginx/sites-available',
                enabled: '/etc/nginx/sites-enabled',
                reload: 'sudo nginx -s reload'
            },
            apache: {
                available: '/etc/apache2/sites-available',
                enabled: '/etc/apache2/sites-enabled',
                reload: 'sudo systemctl reload apache2'
            }
        };
    }

    static async createNginxVHost(domain, rootPath, phpVersion = '8.2', ssl = false, customCert = null, customKey = null, stack = 'nginx') {
        const { nginx, isWin } = this.getConfigs();

        // Normalize path for config file
        const normalizedRoot = rootPath.replace(/\\/g, '/');

        // Calculate dynamic port for PHP version (e.g. 8.2 -> 9082)
        const vPart = phpVersion.replace(/[^0-9]/g, '');
        const phpPort = isWin ? (vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000') : null;

        let config = '';
        const sslPath = 'C:/YumnaPanel/etc/ssl';
        const logDir = 'C:/YumnaPanel/logs/nginx';

        // Logic for different stacks
        let locationBlock = '';
        if (stack === 'hybrid') {
            locationBlock = `
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
`;
        } else {
            locationBlock = `
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_split_path_info ^(.+\\.php)(/.+)$;
        fastcgi_pass ${isWin ? `127.0.0.1:${phpPort}` : `unix:/var/run/php/php${phpVersion}-fpm.sock`};
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
`;
        }

        // Sanitize domain
        domain = domain.trim().replace(/^\.*|\.*$/g, '');
        const wwwDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
        const baseDomain = domain.startsWith('www.') ? domain.substring(4) : domain;

        if (ssl) {
            const certFile = customCert || `${sslPath}/${baseDomain}-chain.pem`;
            const keyFile = customKey || `${sslPath}/${baseDomain}-key.pem`;

            // HTTPS Configuration (with HTTP -> HTTPS Redirect)
            config = `
server {
    listen 80;
    server_name ${baseDomain} ${wwwDomain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${baseDomain} ${wwwDomain};
    root "${normalizedRoot}";
    index index.php index.html;

    access_log "${logDir}/${baseDomain}.access.log";
    error_log "${logDir}/${baseDomain}.error.log";

    ssl_certificate "${certFile}";
    ssl_certificate_key "${keyFile}";

    ${locationBlock}

    location = /yumna_blocked.html {
        alias "C:/YumnaPanel/etc/nginx/html/403.html";
        allow all;
        internal;
    }
}`;
        } else {
            // HTTP Only Configuration
            config = `
server {
    listen 80;
    server_name ${baseDomain} ${wwwDomain};
    root "${normalizedRoot}";
    index index.php index.html;

    access_log "${logDir}/${baseDomain}.access.log";
    error_log "${logDir}/${baseDomain}.error.log";

    ${locationBlock}

    location = /yumna_blocked.html {
        alias "C:/YumnaPanel/etc/nginx/html/403.html";
        allow all;
        internal;
    }
}`;
        }

        const fileName = isWin ? `${baseDomain}.conf` : baseDomain;
        const availablePath = path.join(nginx.available, fileName);

        // 1. Ensure directory exists
        await fs.mkdir(nginx.available, { recursive: true });

        // 2. Write Config
        await fs.writeFile(availablePath, config);
        console.log(`[WEBSERVER] Nginx config created at ${availablePath} (SSL: ${ssl}, Stack: ${stack})`);

        // 3. Symbolic Link (Linux Only)
        if (!isWin) {
            const enabledPath = path.join(nginx.enabled, fileName);
            await fs.symlink(availablePath, enabledPath).catch(() => { });
        }

        // 4. Reload
        exec(nginx.reload, (err) => {
            if (err) console.error(`[WEBSERVER] Failed to reload Nginx: ${err.message}`);
            else console.log('[WEBSERVER] Nginx reloaded successfully');
        });

        // 5. Ensure PHP Process (Windows Only)
        if (isWin && phpPort && stack !== 'hybrid') {
            try {
                const { findPHPDir } = require('../utils/phpUtils');
                const phpDir = findPHPDir(phpVersion);
                if (phpDir) {
                    await this.ensurePHPProcess(phpDir, phpPort);
                }
            } catch (e) {
                console.error('[WEBSERVER] Failed to ensure PHP process:', e);
            }
        }
    }

    static async removeNginxVHost(domain) {
        const { nginx, isWin } = this.getConfigs();
        const fileName = isWin ? `${domain}.conf` : domain;
        const availablePath = path.join(nginx.available, fileName);
        const enabledPath = isWin ? null : path.join(nginx.enabled, fileName);

        try {
            if (enabledPath) await fs.unlink(enabledPath).catch(() => { });
            await fs.unlink(availablePath).catch(() => { });
            exec(nginx.reload);
        } catch (e) { }
    }


    /**
     * Enable SSL for an existing site
     */
    static async enableSSL(domain, rootPath, phpVersion = '8.2', customCert = null, customKey = null) {
        await this.createNginxVHost(domain, rootPath, phpVersion, true, customCert, customKey);
    }

    /**
     * Generate Apache VHost (Cross-Platform)
     */
    static async createApacheVHost(domain, rootPath, port = 80) {
        const { apache, isWin } = this.getConfigs();
        const normalizedRoot = rootPath.replace(/\\/g, '/');
        const logDir = 'C:/YumnaPanel/logs/apache';

        // Sanitize domain
        domain = domain.trim().replace(/^\.*|\.*$/g, '');
        const wwwDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
        const baseDomain = domain.startsWith('www.') ? domain.substring(4) : domain;

        const config = `
<VirtualHost *:${port}>
    ServerName ${baseDomain}
    ServerAlias ${wwwDomain}
    DocumentRoot "${normalizedRoot}"

    ErrorLog "${logDir}/${baseDomain}.error.log"
    CustomLog "${logDir}/${baseDomain}.access.log" combined

    <Directory "${normalizedRoot}">
        AllowOverride All
        <RequireAll>
            Require all granted
            Include "C:/YumnaPanel/etc/apache2/blocked_ips.conf"
        </RequireAll>
    </Directory>
</VirtualHost>`;

        const fileName = `${baseDomain}.conf`;
        const availablePath = path.join(apache.available, fileName);

        await fs.mkdir(apache.available, { recursive: true });
        await fs.writeFile(availablePath, config);
        console.log(`[WEBSERVER] Apache config created at ${availablePath} (Port: ${port})`);

        if (!isWin) {
            exec(`sudo a2ensite ${fileName}`);
        }

        exec(apache.reload, (err) => {
            if (err) console.error(`[WEBSERVER] Failed to reload Apache: ${err.message}`);
            else console.log('[WEBSERVER] Apache reloaded successfully');
        });
    }

    static async removeApacheVHost(domain) {
        const { apache, isWin } = this.getConfigs();
        const fileName = `${domain}.conf`;
        const availablePath = path.join(apache.available, fileName);

        try {
            if (!isWin) exec(`sudo a2dissite ${fileName}`);
            await fs.unlink(availablePath).catch(() => { });
            exec(apache.reload);
        } catch (e) { }
    }

    /**
     * Start/Stop PHP FastCGI process on Windows
     */
    static async ensurePHPProcess(phpPath, port) {
        if (os.platform() !== 'win32') return;

        const { spawn } = require('child_process');
        const cgiExe = path.join(phpPath, 'php-cgi.exe');

        if (!require('fs').existsSync(cgiExe)) {
            console.error(`[PHP-CGI] Executable missing: ${cgiExe}`);
            return;
        }

        // Kill existing process on this port first
        exec(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`, () => {
            console.log(`[PHP-CGI] Initializing PHP on port ${port}...`);
            const phpProcess = spawn(cgiExe, ['-b', `127.0.0.1:${port}`], {
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, PHP_FCGI_MAX_REQUESTS: '0' }
            });
            phpProcess.unref();
        });
    }

    /**
     * Restart PHP service (Linux) or cycle php-cgi (Windows)
     */
    static async restartPHP(phpVersion) {
        const isWin = os.platform() === 'win32';
        if (!isWin) {
            exec(`sudo systemctl restart php${phpVersion}-fpm`);
            return;
        }

        // Windows logic
        const { findPHPDir } = require('../utils/phpUtils');
        const phpDir = findPHPDir(phpVersion);

        if (phpDir) {
            const vPart = phpVersion.replace(/[^0-9]/g, '');
            const phpPort = vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000';
            await this.ensurePHPProcess(phpDir, phpPort);
        }
    }

    /**
     * Start all PHP versions currently required by hosted websites
     */
    static async initializePHPServices() {
        if (os.platform() !== 'win32') return;

        const db = require('../config/db');
        db.query('SELECT DISTINCT phpVersion FROM websites WHERE status = "active"', async (err, results) => {
            if (err || !results) return;

            console.log(`[WEBSERVER] Initializing PHP services for ${results.length} versions...`);
            for (const row of results) {
                const version = row.phpVersion;
                const vPart = version.replace(/[^0-9]/g, '');
                const port = vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000';

                const { findPHPDir } = require('../utils/phpUtils');
                const phpDir = findPHPDir(version);
                if (phpDir) {
                    await this.ensurePHPProcess(phpDir, port);
                }
            }
        });
    }
}

module.exports = WebServerService;
