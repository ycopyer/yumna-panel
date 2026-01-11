const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const { existsSync } = require('fs');

class WebServerService {
    /**
     * Get platform specific paths
     */
    static getConfigs() {
        const isWin = os.platform() === 'win32';
        const panelRoot = 'C:\\YumnaPanel';

        if (isWin) {
            const nginxBase = `${panelRoot}\\bin\\web\\nginx`;
            const nginxConfig = `${panelRoot}\\etc\\nginx`;

            const apacheBase = `${panelRoot}\\bin\\web\\apache`;
            const apacheConfig = `${panelRoot}\\etc\\apache2`;

            return {
                isWin,
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

    static async ensureDocumentRoot(rootPath, domain) {
        try {
            await fs.mkdir(rootPath, { recursive: true });
            const indexPath = path.join(rootPath, 'index.html');
            const indexPhpPath = path.join(rootPath, 'index.php');

            try {
                await fs.access(indexPath);
            } catch {
                try {
                    await fs.access(indexPhpPath);
                } catch {
                    const defaultHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ${domain}</title><style>body{font-family:sans-serif;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0}h1{font-size:3rem;background:linear-gradient(to right,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}.card{background:rgba(255,255,255,0.05);padding:2rem;border-radius:1rem;border:1px solid rgba(255,255,255,0.1);max-width:500px;text-align:center}</style></head><body><div class="card"><h1>${domain}</h1><p>Typically, this page serves as a placeholder until you upload your own content.</p><p style="color:#6366f1;font-weight:bold;margin-top:2rem">Managed by Yumna Panel</p></div></body></html>`;
                    await fs.writeFile(indexPath, defaultHtml);
                }
            }
        } catch (e) {
            console.error('[AGENT] Failed to create document root:', e);
        }
    }

    static async createNginxVHost({ domain, rootPath, phpVersion = '8.2', ssl = false, customCert = null, customKey = null, stack = 'nginx' }) {
        const { nginx, isWin } = this.getConfigs();
        const normalizedRoot = rootPath.replace(/\\/g, '/');
        const vPart = phpVersion.replace(/[^0-9]/g, '');
        const phpPort = isWin ? (vPart.length >= 2 ? `90${vPart.substring(0, 2)}` : '9000') : null;

        // Ensure Root exists
        await this.ensureDocumentRoot(normalizedRoot, domain);

        let config = '';
        const sslPath = 'C:/YumnaPanel/etc/ssl';
        const logDir = 'C:/YumnaPanel/logs/nginx';

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

        domain = domain.trim().replace(/^\.*|\.*$/g, '');
        const wwwDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
        const baseDomain = domain.startsWith('www.') ? domain.substring(4) : domain;

        // SSL Config Block
        const sslBlock = `
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

    ssl_certificate "${customCert || `${sslPath}/${baseDomain}-chain.pem`}";
    ssl_certificate_key "${customKey || `${sslPath}/${baseDomain}-key.pem`}";

    if (-f $document_root/.yumna_maintenance) {
        return 503;
    }
    error_page 503 /yumna_maintenance.html;
    location = /yumna_maintenance.html {
        alias "C:/YumnaPanel/etc/nginx/html/maintenance.html";
        allow all;
        internal;
    }

    ${locationBlock}

    location = /yumna_blocked.html {
        alias "C:/YumnaPanel/etc/nginx/html/403.html";
        allow all;
        internal;
    }
}`;

        // HTTP Config Block
        const httpBlock = `
server {
    listen 80;
    server_name ${baseDomain} ${wwwDomain};
    root "${normalizedRoot}";
    index index.php index.html;

    access_log "${logDir}/${baseDomain}.access.log";
    error_log "${logDir}/${baseDomain}.error.log";

    if (-f $document_root/.yumna_maintenance) {
        return 503;
    }
    error_page 503 /yumna_maintenance.html;
    location = /yumna_maintenance.html {
        alias "C:/YumnaPanel/etc/nginx/html/maintenance.html";
        allow all;
        internal;
    }

    ${locationBlock}

    location = /yumna_blocked.html {
        alias "C:/YumnaPanel/etc/nginx/html/403.html";
        allow all;
        internal;
    }
}`;

        config = ssl ? sslBlock : httpBlock;

        const fileName = isWin ? `${baseDomain}.conf` : baseDomain;
        const availablePath = path.join(nginx.available, fileName);

        await fs.mkdir(nginx.available, { recursive: true });
        await fs.writeFile(availablePath, config);

        if (!isWin) {
            const enabledPath = path.join(nginx.enabled, fileName);
            await fs.symlink(availablePath, enabledPath).catch(() => { });
        }

        return new Promise((resolve, reject) => {
            exec(nginx.reload, (err) => {
                if (err) return reject(new Error(`Nginx reload failed: ${err.message}`));
                console.log('[AGENT] Nginx VHost created & reloaded.');
                resolve({ success: true, path: availablePath });
            });
        });
    }

    static async createApacheVHost(domain, rootPath, port = 8080) {
        const { apache, isWin } = this.getConfigs();
        const normalizedRoot = rootPath.replace(/\\/g, '/');

        domain = domain.trim().replace(/^\.*|\.*$/g, '');
        const wwwDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
        const baseDomain = domain.startsWith('www.') ? domain.substring(4) : domain;

        const config = `
<VirtualHost *:${port}>
    ServerAdmin webmaster@${baseDomain}
    DocumentRoot "${normalizedRoot}"
    ServerName ${baseDomain}
    ServerAlias ${wwwDomain}
    
    <Directory "${normalizedRoot}">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog "logs/${baseDomain}-error.log"
    CustomLog "logs/${baseDomain}-access.log" common
</VirtualHost>
`;
        const fileName = isWin ? `${baseDomain}.conf` : `${baseDomain}.conf`;
        const availablePath = path.join(apache.available, fileName);

        await fs.mkdir(apache.available, { recursive: true });
        await fs.writeFile(availablePath, config);

        if (!isWin) {
            const enabledPath = path.join(apache.enabled, fileName);
            await fs.symlink(availablePath, enabledPath).catch(() => { });
        }

        return new Promise((resolve, reject) => {
            exec(apache.reload, (err) => {
                if (err) return reject(new Error(`Apache reload failed: ${err.message}`));
                console.log('[AGENT] Apache VHost created & reloaded.');
                resolve({ success: true });
            });
        });
    }

    static async removeApacheVHost(domain) {
        const { apache, isWin } = this.getConfigs();
        const fileName = isWin ? `${domain}.conf` : `${domain}.conf`;
        const availablePath = path.join(apache.available, fileName);

        try {
            await fs.unlink(availablePath).catch(() => { });
            exec(apache.reload);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    static async createSite(options) {
        const { domain, rootPath, phpVersion, stack } = options;

        // Ensure Root exists
        await this.ensureDocumentRoot(rootPath.replace(/\\/g, '/'), domain);

        if (stack === 'apache') {
            await this.createApacheVHost(domain, rootPath, 80);
            await this.removeNginxVHost(domain); // Cleanup
        } else if (stack === 'hybrid') {
            await this.createNginxVHost(options); // Nginx Proxy
            await this.createApacheVHost(domain, rootPath, 8080); // Apache Backend
        } else {
            // Default Nginx
            await this.createNginxVHost(options);
            await this.removeApacheVHost(domain); // Cleanup
        }
        return { success: true, message: 'Site configuration applied' };
    }

    static async removeSite(domain) {
        await this.removeNginxVHost(domain);
        await this.removeApacheVHost(domain);
        return { success: true };
    }

    static async setMaintenance(rootPath, enabled) {
        const maintenanceFile = path.join(rootPath, '.yumna_maintenance');
        try {
            if (enabled) {
                await fs.writeFile(maintenanceFile, '1');
            } else {
                await fs.unlink(maintenanceFile).catch(() => { });
            }
            return { success: true };
        } catch (e) {
            throw new Error(`Failed to toggle maintenance: ${e.message}`);
        }
    }

    // Alias for internal Nginx cleanup
    static async removeNginxVHost(domain) {
        return this.removeVHost(domain);
    }

    static async getConfig(domain, stack) {
        const { nginx, apache, isWin } = this.getConfigs();
        let filePath;

        if (stack === 'apache') {
            const fileName = isWin ? `${domain}.conf` : `${domain}.conf`;
            filePath = path.join(apache.available, fileName);
        } else {
            const fileName = isWin ? `${domain}.conf` : domain;
            filePath = path.join(nginx.available, fileName);
        }

        try {
            const content = await fs.readFile(filePath, 'utf8');
            return { config: content, type: stack || 'nginx' };
        } catch (e) {
            throw new Error('Config file not found');
        }
    }

    static async saveConfig(domain, stack, content) {
        const { nginx, apache, isWin } = this.getConfigs();
        let filePath;
        let reloadCmd;

        if (stack === 'apache') {
            const fileName = isWin ? `${domain}.conf` : `${domain}.conf`;
            filePath = path.join(apache.available, fileName);
            reloadCmd = apache.reload;
        } else {
            const fileName = isWin ? `${domain}.conf` : domain;
            filePath = path.join(nginx.available, fileName);
            reloadCmd = nginx.reload;
        }

        try {
            await fs.writeFile(filePath, content);
            exec(reloadCmd);
            return { success: true };
        } catch (e) {
            throw new Error('Failed to save config: ' + e.message);
        }
    }

    static async getLogs(domain, type) {
        // type: access or error
        const logDir = 'C:/YumnaPanel/logs/nginx'; // TODO: Dynamic based on stack
        const logFile = path.join(logDir, `${domain}.${type}.log`);

        try {
            if (!existsSync(logFile)) return { logs: '' };
            // Read last 50KB or 100 lines
            const content = await fs.readFile(logFile, 'utf8');
            // enhance: read only tail
            const lines = content.split('\n').slice(-100).join('\n');
            return { logs: lines };
        } catch (e) {
            return { logs: 'Could not read logs.' };
        }
    }
}
module.exports = WebServerService;
