const http = require('http');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PANEL_ROOT = 'C:\\YumnaPanel';

function isRunning(processName) {
    try {
        const output = execSync(`tasklist /FI "IMAGENAME eq ${processName}"`, { encoding: 'utf8' });
        return output.toLowerCase().includes(processName.toLowerCase());
    } catch (e) {
        return false;
    }
}

function getProcessUptime(processName) {
    try {
        const output = execSync(`wmic process where "name='${processName}'" get CreationDate`, { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        if (lines.length < 2) return null;

        const rawDate = lines[1].trim(); // Format: 20260108201500.000000+420
        if (!rawDate || rawDate === "") return null;

        const year = rawDate.substr(0, 4);
        const month = rawDate.substr(4, 2) - 1;
        const day = rawDate.substr(6, 2);
        const hour = rawDate.substr(8, 2);
        const min = rawDate.substr(10, 2);
        const sec = rawDate.substr(12, 2);

        const startDate = new Date(year, month, day, hour, min, sec);
        const diffMs = new Date() - startDate;

        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);

        if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
        return `${diffMins}m`;
    } catch (e) {
        return null;
    }
}

function isFirewallEnabled() {
    try {
        const output = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' });
        return output.toLowerCase().includes('on');
    } catch (e) {
        return false;
    }
}

function handleStart() {
    console.log('Starting services via Backend...');
    // MariaDB
    if (!isRunning('mysqld.exe')) {
        spawn(path.join(PANEL_ROOT, 'bin/database/mariadb/bin/mysqld.exe'), [
            `--datadir=${path.join(PANEL_ROOT, 'data/mysql')}`
        ], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
    // Nginx
    if (!isRunning('nginx.exe')) {
        const nginxPath = path.join(PANEL_ROOT, 'bin/web/nginx/nginx.exe');
        if (fs.existsSync(nginxPath)) {
            spawn(nginxPath, [], {
                cwd: path.join(PANEL_ROOT, 'bin/web/nginx'),
                detached: true, stdio: 'ignore', windowsHide: true
            }).unref();
        }
    }
    // PM2
    try {
        execSync('pm2 start ecosystem.config.js --env production', {
            cwd: path.join(PANEL_ROOT, 'app'),
            windowsHide: true,
            stdio: 'ignore'
        });
    } catch (e) { }

    // ClamAV (Optional start on all)
    if (!isRunning('clamd.exe')) {
        const clamPath = path.join(PANEL_ROOT, 'bin/security/clamav/clamd.exe');
        if (fs.existsSync(clamPath)) {
            spawn(clamPath, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
        }
    }
}

function stopSecurity(service) {
    if (service === 'clamav') {
        try { execSync('taskkill /F /IM clamd.exe /T', { windowsHide: true, stdio: 'ignore' }); } catch (e) { }
    } else if (service === 'firewall') {
        try { execSync('netsh advfirewall set allprofiles state off', { windowsHide: true, stdio: 'ignore' }); } catch (e) { }
    }
}

function startSecurity(service) {
    if (service === 'clamav') {
        const paths = [
            path.join(PANEL_ROOT, 'bin/security/clamav/clamd.exe'),
            path.join(PANEL_ROOT, 'bin/security/clamav/bin/clamd.exe')
        ];
        let foundPath = null;
        for (const p of paths) {
            if (fs.existsSync(p)) { foundPath = p; break; }
        }

        if (!foundPath) throw new Error("ClamAV executable not found. Please provision ClamAV first.");
        spawn(foundPath, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } else if (service === 'firewall') {
        execSync('netsh advfirewall set allprofiles state on', { windowsHide: true, stdio: 'ignore' });
    }
}

function handleStop() {
    const cmds = [
        'taskkill /F /IM mysqld.exe /T',
        'taskkill /F /IM nginx.exe /T',
        'taskkill /F /IM httpd.exe /T',
        'taskkill /F /IM clamd.exe /T',
        'pm2 delete yumna-panel'
    ];
    cmds.forEach(cmd => {
        try { execSync(cmd, { windowsHide: true, stdio: 'ignore' }); } catch (e) { }
    });
}

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname.toLowerCase();

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`[REQ] ${req.method} ${pathname}`);

    // Serve Global Control UI
    if (pathname === '/' || pathname === '/index.html') {
        const uiPath = path.join(PANEL_ROOT, 'ControlCenter.html');
        if (fs.existsSync(uiPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync(uiPath));
        } else {
            res.writeHead(404);
            res.end('UI File Not Found at ' + uiPath);
        }
        return;
    }

    // Serve Logo Route
    if (pathname === '/logo') {
        const logoPath = path.join(PANEL_ROOT, 'app', 'client', 'public', 'YumnaPanel-Logo.png');
        if (fs.existsSync(logoPath)) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(fs.readFileSync(logoPath));
        } else {
            res.writeHead(404);
            res.end();
        }
        return;
    }

    // API endpoints
    if (pathname === '/api/status' && req.method === 'GET') {
        const uptimeSec = os.uptime();
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);

        const status = {
            nginx: isRunning('nginx.exe') || isRunning('httpd.exe'),
            nginxUptime: getProcessUptime('nginx.exe') || getProcessUptime('httpd.exe'),
            mariadb: isRunning('mysqld.exe'),
            mariadbUptime: getProcessUptime('mysqld.exe'),
            node: isRunning('node.exe'),
            nodeUptime: getProcessUptime('node.exe'),
            clamav: isRunning('clamd.exe'),
            firewall: isFirewallEnabled(),
            uptime: `${days}d ${hours}h ${mins}m`,
            serverTime: new Date().toLocaleTimeString()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
    } else if (pathname === '/api/start' && req.method === 'POST') {
        handleStart();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } else if (pathname === '/api/stop' && req.method === 'POST') {
        handleStop();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } else if (pathname === '/api/open-folder' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { folder } = JSON.parse(body);
                const fullPath = path.isAbsolute(folder) ? folder : path.join(PANEL_ROOT, folder);
                console.log('Action: Launching VBS Folder Opener for', fullPath);

                // Using the VBScript helper is the most reliable way to 
                // "break out" of a hidden background process to open a GUI folder.
                const { spawn } = require('child_process');
                const vbsPath = path.join(PANEL_ROOT, 'scripts', 'run', 'open_url.vbs');
                spawn('wscript.exe', [vbsPath, fullPath], { windowsHide: true });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.error('Open folder error:', e.message);
                res.writeHead(400);
                res.end();
            }
        });
    } else if (pathname === '/api/toggle-security' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { service, action } = JSON.parse(body);
                let result = { success: true };
                try {
                    if (action === 'start') startSecurity(service);
                    else stopSecurity(service);
                } catch (err) {
                    result = { success: false, error: err.message };
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400); res.end();
            }
        });
    } else if (pathname === '/api/save-settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const settings = JSON.parse(body);
                const dataDir = path.join(PANEL_ROOT, 'data');
                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                const settingsPath = path.join(dataDir, 'cc_settings.json');
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400);
                res.end();
            }
        });
    } else if (pathname === '/api/settings' && req.method === 'GET') {
        const settingsPath = path.join(PANEL_ROOT, 'data', 'cc_settings.json');
        let settings = { autostart: true, notify: true, analytics: false };
        if (fs.existsSync(settingsPath)) {
            try {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            } catch (e) { }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(settings));
    } else {
        console.log('404 Route Not Found:', pathname);
        res.writeHead(404);
        res.end('Route Not Found');
    }
});

server.listen(5001, () => {
    console.log('Control Center Backend running on port 5001');
});
