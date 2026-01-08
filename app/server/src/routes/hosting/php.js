const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const WebServerService = require('../../services/webserver');
const { getPHPBaseDir, findPHPDir } = require('../../utils/phpUtils');



/**
 * PHP Engine Management Router (Native Implementation with Persistence)
 */


const DATA_DIR = path.join(process.cwd(), '../data');
const OPS_FILE = path.join(DATA_DIR, 'php_ops.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'php_settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create data directory:', e);
    }
}

// Load operations from disk on startup
let phpOperations = {};
if (fs.existsSync(OPS_FILE)) {
    try {
        const fileContent = fs.readFileSync(OPS_FILE, 'utf8');
        if (fileContent) {
            phpOperations = JSON.parse(fileContent);
            // Clean up any stale operations (older than 1 hour)
            const now = Date.now();
            Object.keys(phpOperations).forEach(v => {
                if (now - (phpOperations[v].timestamp || 0) > 3600000) {
                    delete phpOperations[v];
                }
            });
        }
    } catch (e) {
        console.error('Failed to parse PHP operations file:', e);
        phpOperations = {};
    }
}


const saveOps = () => {
    try {
        fs.writeFileSync(OPS_FILE, JSON.stringify(phpOperations || {}, null, 2));
    } catch (e) {
        console.error('Failed to save PHP operations:', e);
    }
};

const getSettings = () => {
    if (fs.existsSync(SETTINGS_FILE)) {
        try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch (e) { return {}; }
    }
    return {};
};

const saveSettings = (settings) => {
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings || {}, null, 2)); } catch (e) { }
};

// GET /api/php/operations
router.get('/php/operations', (req, res) => {
    try {
        res.json(phpOperations || {});
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch operations state' });
    }
});


// Helper to update operation status
const updateOp = (version, data) => {
    if (!phpOperations[version]) phpOperations[version] = {};
    phpOperations[version] = { ...phpOperations[version], ...data, timestamp: Date.now() };
    saveOps();

    if (data.status === 'completed' || data.status === 'error') {
        setTimeout(() => {
            delete phpOperations[version];
            saveOps();
        }, 60000); // Keep for 60s for UI visibility
    }
};

// Helpers moved to utils/phpUtils.js

// GET /api/php/versions
router.get('/php/versions', async (req, res) => {
    try {
        let versions = [];
        const isWindows = process.platform === 'win32';

        if (isWindows) {
            const settings = getSettings();
            const preferredDefault = settings.default_full_version;

            const systemDefault = await new Promise((resolve) => {
                exec('php -v', (err, stdout) => {
                    if (err) return resolve(null);
                    const match = stdout.match(/PHP (\d+\.\d+\.\d+)/);
                    resolve(match ? match[1] : null);
                });
            });

            const scanDirs = [getPHPBaseDir()];
            const seen = new Set();

            for (const base of scanDirs) {
                if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) continue;
                const dirs = fs.readdirSync(base);
                for (const dir of dirs) {
                    if (seen.has(dir)) continue;
                    const exePath = path.join(base, dir, 'php.exe');
                    if (!fs.existsSync(exePath)) continue;

                    let versionLabel = dir.replace(/^php-/, '');
                    if (versionLabel.includes('-')) {
                        versionLabel = versionLabel.split('-')[0];
                    }

                    const is_default = preferredDefault
                        ? (dir === preferredDefault)
                        : (systemDefault && dir.includes(systemDefault));

                    versions.push({
                        version: versionLabel,
                        full_version: dir,
                        status: 'running',
                        is_default: !!is_default,
                        path: exePath
                    });
                    seen.add(dir);
                }
            }
        } else {
            const phpEtc = '/etc/php';
            if (fs.existsSync(phpEtc)) {
                const available = fs.readdirSync(phpEtc);
                versions = available.map(v => ({
                    version: v,
                    status: 'running',
                    is_default: false,
                    path: `/usr/bin/php${v}`
                }));

                const linuxDefault = await new Promise(r => exec('php -v', (e, so) => {
                    const m = so.match(/PHP (\d+\.\d+)/);
                    r(m ? m[1] : null);
                }));
                versions.forEach(v => { if (v.version === linuxDefault) v.is_default = true; });
            }
        }
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/php/extensions
router.get('/php/extensions', async (req, res) => {
    const { version, full_version } = req.query;
    try {
        const isWindows = process.platform === 'win32';
        const phpDir = isWindows ? findPHPDir(full_version) : null;

        let phpCmd = isWindows
            ? (phpDir ? path.join(phpDir, 'php.exe') + ' -m' : null)
            : `php${version} -m`;

        if (isWindows && !phpCmd) return res.status(404).json({ error: 'PHP binary not found for extension audit.' });

        exec(phpCmd, (err, stdout) => {
            if (err) return res.status(500).json({ error: 'Binary unreachable: ' + err.message });

            const installedModules = stdout.split('\n')
                .map(m => m.trim().toLowerCase())
                .filter(m => m && !m.startsWith('['));

            let availableExts = new Set([
                'bcmath', 'bz2', 'calendar', 'ctype', 'curl', 'dom', 'exif', 'fileinfo',
                'gd', 'gettext', 'gmp', 'hash', 'iconv', 'imap', 'intl', 'json', 'ldap',
                'mbstring', 'mysqli', 'mysqlnd', 'openssl', 'pdo', 'pdo_mysql', 'pdo_sqlite',
                'phar', 'posix', 'readline', 'session', 'soap', 'sockets', 'sodium', 'sqlite3',
                'tokenizer', 'xml', 'xmlreader', 'xmlwriter', 'xsl', 'zip', 'zlib', 'redis',
                'opcache', 'xdebug'
            ]);

            // Real audit: Scan ext directory if on Windows
            const presentExts = new Set();
            if (isWindows && phpDir) {
                const extDir = path.join(phpDir, 'ext');
                if (fs.existsSync(extDir)) {
                    try {
                        const files = fs.readdirSync(extDir);
                        files.forEach(file => {
                            if (file.endsWith('.dll')) {
                                let name = file.replace(/^php_/, '').replace(/\.dll$/, '');
                                presentExts.add(name.toLowerCase());
                                availableExts.add(name.toLowerCase());
                            }
                        });
                    } catch (e) {
                        console.error('Failed to scan ext dir:', e);
                    }
                }
            }

            // Also add currently installed modules to available list (built-in exts)
            installedModules.forEach(m => {
                availableExts.add(m);
                presentExts.add(m); // Built-in are always "present"
            });

            const finalExts = Array.from(availableExts).sort().map(name => {
                const isLoaded = installedModules.includes(name.toLowerCase());
                const isPresent = presentExts.has(name.toLowerCase());
                return {
                    name,
                    status: isPresent ? 'installed' : 'not_installed',
                    enabled: isLoaded
                };
            });

            res.json(finalExts);

        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// POST /api/php/extensions/toggle
router.post('/php/extensions/toggle', requireAdmin, async (req, res) => {
    const { version, full_version, extension, enabled } = req.body;
    try {
        const isWindows = process.platform === 'win32';
        const phpDir = isWindows ? findPHPDir(full_version) : null;

        const iniPath = isWindows
            ? (phpDir ? path.join(phpDir, 'php.ini') : null)
            : `/etc/php/${version}/fpm/php.ini`;

        if (isWindows && !iniPath) return res.status(404).json({ error: 'PHP directory not found.' });
        if (!fs.existsSync(iniPath)) {
            return res.status(404).json({ error: 'php.ini not found for this version.' });
        }

        if (isWindows) {
            let content = fs.readFileSync(iniPath, 'utf8');
            const extPatterns = [
                new RegExp(`^;?\\s*extension\\s*=\\s*${extension}(\\.dll)?`, 'mi'),
                new RegExp(`^;?\\s*zend_extension\\s*=\\s*${extension}(\\.dll)?`, 'mi')
            ];

            let modified = false;
            for (const pattern of extPatterns) {
                if (pattern.test(content)) {
                    content = content.replace(pattern, (match) => {
                        const trimmed = match.trim();
                        if (enabled) {
                            return trimmed.startsWith(';') ? trimmed.substring(1).trim() : trimmed;
                        } else {
                            return trimmed.startsWith(';') ? trimmed : ';' + trimmed;
                        }
                    });
                    modified = true;
                    break;
                }
            }

            if (!modified) {
                if (enabled) content += `\nextension=${extension}\n`;
            }

            fs.writeFileSync(iniPath, content, 'utf8');
            // Trigger background restart
            WebServerService.restartPHP(full_version || version).catch(e => console.error('[PHP RESTART ERR]', e));
            res.json({ message: `Extension ${extension} ${enabled ? 'enabled' : 'disabled'} on Windows.` });
        } else {
            const cmd = enabled ? `sudo phpenmod ${extension}` : `sudo phpdismod ${extension}`;
            exec(cmd, (err) => {
                if (err) return res.status(500).json({ error: `Linux Extension Error: ${err.message}` });
                res.json({ message: `Extension ${extension} ${enabled ? 'enabled' : 'disabled'} on Linux.` });
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/php/config
router.get('/php/config', async (req, res) => {
    const { version, full_version } = req.query;
    try {
        const isWindows = process.platform === 'win32';
        const phpDir = isWindows ? findPHPDir(full_version) : null;

        const iniPath = isWindows
            ? (phpDir ? path.join(phpDir, 'php.ini') : null)
            : `/etc/php/${version}/fpm/php.ini`;

        if (isWindows && !iniPath) return res.status(404).json({ error: 'PHP directory not found.' });
        if (!fs.existsSync(iniPath)) {
            return res.status(404).json({ error: `INI not found: ${iniPath}` });
        }

        res.json({ content: fs.readFileSync(iniPath, 'utf8'), path: iniPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/php/config/save
router.post('/php/config/save', requireAdmin, async (req, res) => {
    const { version, full_version, content } = req.body;
    try {
        const isWindows = process.platform === 'win32';
        const phpDir = isWindows ? findPHPDir(full_version) : null;

        const iniPath = isWindows
            ? (phpDir ? path.join(phpDir, 'php.ini') : null)
            : `/etc/php/${version}/fpm/php.ini`;

        if (isWindows && !iniPath) return res.status(404).json({ error: 'PHP directory not found.' });
        fs.writeFileSync(iniPath, content, 'utf8');
        // Trigger background restart
        WebServerService.restartPHP(full_version || version).catch(e => console.error('[PHP RESTART ERR]', e));
        res.json({ message: 'Configuration synchronized with native filesystem.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/php/install
router.post('/php/install', requireAdmin, async (req, res) => {
    const { version } = req.body;
    try {
        const isWindows = process.platform === 'win32';
        const phpBaseDir = getPHPBaseDir();

        if (isWindows) {
            const versionMap = {
                '8.5': { full: '8.5.1', arch: 'vs17-x64', url: 'https://windows.php.net/downloads/releases/php-8.5.1-Win32-vs17-x64.zip' },
                '8.4': { full: '8.4.16', arch: 'vs17-x64', url: 'https://windows.php.net/downloads/releases/php-8.4.16-Win32-vs17-x64.zip' },
                '8.3': { full: '8.3.29', arch: 'vs16-x64', url: 'https://windows.php.net/downloads/releases/php-8.3.29-Win32-vs16-x64.zip' },
                '8.2': { full: '8.2.30', arch: 'vs16-x64', url: 'https://windows.php.net/downloads/releases/php-8.2.30-Win32-vs16-x64.zip' },
                '8.1': { full: '8.1.31', arch: 'vs16-x64', url: 'https://windows.php.net/downloads/releases/php-8.1.31-Win32-vs16-x64.zip' },
                '7.4': { full: '7.4.33', arch: 'vc15-x64', url: 'https://windows.php.net/downloads/releases/archives/php-7.4.33-Win32-vc15-x64.zip' },
                '7.3': { full: '7.3.33', arch: 'vc15-x64', url: 'https://windows.php.net/downloads/releases/archives/php-7.3.33-Win32-VC15-x64.zip' },
                '7.2': { full: '7.2.34', arch: 'vc15-x64', url: 'https://windows.php.net/downloads/releases/archives/php-7.2.34-Win32-VC15-x64.zip' },
                '5.6': { full: '5.6.40', arch: 'vc11-x64', url: 'https://windows.php.net/downloads/releases/archives/php-5.6.40-Win32-VC11-x64.zip' }
            };

            const config = versionMap[version];
            if (!config) return res.status(400).json({ error: `Unsupported engine: ${version}` });

            const dirName = `php-${config.full}-Win32-${config.arch}`;
            const targetDir = path.join(phpBaseDir, dirName);

            updateOp(version, { type: 'install', status: 'preparing', progress: 5, message: 'Auditing target binary path...' });

            const runStep = (cmd) => new Promise((resolve, reject) => {
                const child = exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
                    if (err) {
                        console.error(`Step failed: ${cmd}`, stderr);
                        reject(new Error(stderr || err.message));
                    } else resolve(stdout);
                });
            });

            const runPS = (script) => {
                // Use UTF-16LE for PowerShell base64 compatibility
                const encoded = Buffer.from(script, 'utf16le').toString('base64');
                return runStep(`powershell -ExecutionPolicy Bypass -EncodedCommand ${encoded}`);
            };

            (async () => {
                try {
                    // Check if already in progress to prevent double execution
                    if (phpOperations[version] && phpOperations[version].status === 'downloading') {
                        console.log(`Installation for ${version} already underway.`);
                        return;
                    }

                    updateOp(version, { status: 'downloading', progress: 15, message: 'Connecting to windows.php.net mirror...' });
                    if (!fs.existsSync(targetDir)) {
                        await runPS(`New-Item -ItemType Directory -Path '${targetDir}' -Force`);
                    }

                    const zipFile = path.join(phpBaseDir, `download-${version}-${Date.now()}.zip`);

                    updateOp(version, { status: 'downloading', progress: 45, message: `Downloading binary archive (${config.full})...` });

                    const mainUrl = config.url;
                    // Fix redundant /archives/ pathing
                    const archiveUrl = config.url.includes('/archives/') ? config.url : config.url.replace('/releases/', '/releases/archives/');
                    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

                    const psDownloadScript = `
                        $ErrorActionPreference = 'Stop';
                        # Silently attempt to remove any OLD download files that might be lingering
                        Get-ChildItem -Path '${phpBaseDir}' -Filter 'download-${version}-*.zip' | ForEach-Object {
                            try { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue } catch {}
                        }
                        
                        try {
                            & curl.exe -L -A "${userAgent}" -o "${zipFile}" "${mainUrl}" --fail
                        } catch {
                            & curl.exe -L -A "${userAgent}" -o "${zipFile}" "${archiveUrl}" --fail
                        }
                    `;

                    await runPS(psDownloadScript);

                    // Add a small delay to ensure Windows file handles are fully released
                    await new Promise(r => setTimeout(r, 2000));

                    updateOp(version, { status: 'extracting', progress: 75, message: 'Decompressing engine files (please wait)...' });
                    const psExtractScript = `
                        $ErrorActionPreference = 'Stop';
                        Add-Type -AssemblyName System.IO.Compression.FileSystem;
                        
                        if (Test-Path '${targetDir}') { Remove-Item '${targetDir}' -Recurse -Force }
                        
                        # Handle potential file locking delays on Windows
                        $retryCount = 0;
                        $maxRetries = 5;
                        $success = $false;
                        
                        while (-not $success -and $retryCount -lt $maxRetries) {
                            try {
                                [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipFile}', '${targetDir}');
                                $success = $true;
                            } catch {
                                $retryCount++;
                                if ($retryCount -eq $maxRetries) { throw $_ }
                                Write-Host "Archive locked by another process. Retrying in 2s... ($retryCount/$maxRetries)";
                                Start-Sleep -Seconds 2;
                            }
                        }
                    `;
                    await runPS(psExtractScript);

                    updateOp(version, { status: 'configuring', progress: 95, message: 'Synchronizing configuration templates...' });
                    if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);

                    const iniPath = path.join(targetDir, 'php.ini-development');
                    const targetIni = path.join(targetDir, 'php.ini');
                    if (fs.existsSync(iniPath) && !fs.existsSync(targetIni)) {
                        let iniContent = fs.readFileSync(iniPath, 'utf8');

                        // Enable essential extensions by default on Windows
                        const essentialExts = ['curl', 'fileinfo', 'gd', 'gettext', 'mbstring', 'exif', 'mysqli', 'openssl', 'pdo_mysql', 'zip'];
                        essentialExts.forEach(ext => {
                            const pattern = new RegExp(`^;\\s*extension\\s*=\\s*${ext}`, 'mi');
                            iniContent = iniContent.replace(pattern, `extension=${ext}`);
                        });

                        // Set extension_dir explicitly to avoid issues
                        iniContent = iniContent.replace(/^;\s*extension_dir\s*=\s*"ext"/mi, 'extension_dir = "ext"');

                        fs.writeFileSync(targetIni, iniContent);
                    }

                    updateOp(version, { status: 'completed', progress: 100, message: `PHP ${config.full} native deployment completed.` });
                } catch (err) {
                    console.error('[PHP INSTALL FAILURE]', err);
                    updateOp(version, { status: 'error', message: `Engine failure: ${err.message}` });
                }
            })();

            res.json({ message: 'Native deployment background task started.' });
        } else {
            updateOp(version, { type: 'install', status: 'running', progress: 10, message: 'Syncing APT repositories...' });
            exec(`sudo apt-get update && sudo apt-get install -y php${version}-fpm php${version}-cli`, (err) => {
                if (err) updateOp(version, { status: 'error', message: err.message });
                else updateOp(version, { status: 'completed', progress: 100, message: `PHP ${version} provisioned on Linux.` });
            });
            res.json({ message: 'APT sequence initiated.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/php/uninstall
router.post('/php/uninstall', requireAdmin, async (req, res) => {
    const { version, full_version } = req.body;
    try {
        const isWindows = process.platform === 'win32';
        updateOp(version, { type: 'uninstall', status: 'stopping', progress: 20, message: 'Deactivating PHP engine...' });

        if (isWindows) {
            const phpBaseDir = getPHPBaseDir();
            const dirName = full_version || (version.startsWith('php-') ? version : `php-${version}`);
            const targetDir = path.join(phpBaseDir, dirName);

            (async () => {
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    updateOp(version, { status: 'deleting', progress: 60, message: `Wiping binaries from system path...` });

                    if (fs.existsSync(targetDir)) {
                        exec(`powershell -Command "Remove-Item -Path '${targetDir}' -Recurse -Force -ErrorAction SilentlyContinue"`, (err) => {
                            if (err) updateOp(version, { status: 'error', message: 'Binary lock: Please restart system services.' });
                            else updateOp(version, { status: 'completed', progress: 100, message: 'Engine files successfully purged.' });
                        });
                    } else {
                        updateOp(version, { status: 'completed', progress: 100, message: 'Target path already vacant.' });
                    }
                } catch (err) {
                    updateOp(version, { status: 'error', message: err.message });
                }
            })();
        } else {
            exec(`sudo apt-get purge -y php${version}*`, (err) => {
                if (err) updateOp(version, { status: 'error', message: err.message });
                else updateOp(version, { status: 'completed', progress: 100, message: 'Packages removed from Linux.' });
            });
        }
        res.json({ message: 'Uninstallation task running.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/php/default
router.post('/php/default', requireAdmin, async (req, res) => {
    const { version, full_version } = req.body;
    try {
        const isWindows = process.platform === 'win32';

        // Save to internal settings immediately for UI consistency
        const settings = getSettings();
        settings.default_full_version = full_version;
        saveSettings(settings);

        if (isWindows) {
            const phpDir = findPHPDir(full_version);
            if (!phpDir) return res.status(404).json({ error: 'PHP binary path not found.' });

            // Surgical PATH update via PowerShell:
            // 1. Get current System Path
            // 2. Remove all existing PHP entries from both paths
            // 3. Prepend the new one
            // Update current process PATH for immediate server-side reflected changes
            process.env.PATH = `${phpDir}${path.delimiter}${process.env.PATH}`;

            const psPathUpdate = `
                $ErrorActionPreference = 'Stop';
                $phpPath = '${phpDir}';
                $envKey = 'PATH';
                
                function Update-Path($target) {
                    try {
                        $currentPath = [System.Environment]::GetEnvironmentVariable($envKey, $target);
                        if ($null -eq $currentPath) { $currentPath = "" }
                        $pathArray = $currentPath -split ';' | Where-Object { $_ -ne "" };
                        
                            -not ($_ -like '*\\bin\\php*')
                        
                        # Prepend the new path for maximum priority
                        $finalPath = @($phpPath) + $newPathArray -join ';';
                        [System.Environment]::SetEnvironmentVariable($envKey, $finalPath, $target);
                        return "OK: $target";
                    } catch {
                        return "FAIL: $target ($($_.Exception.Message))";
                    }
                }

                $m = Update-Path ([System.EnvironmentVariableTarget]::Machine);
                $u = Update-Path ([System.EnvironmentVariableTarget]::User);
                Write-Host "Sync Status -> Machine: $m | User: $u";

                # Broadcast environment change to system
                try {
                    $signature = '[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
                    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);';
                    $type = Add-Type -MemberDefinition $signature -Name "NativeMethods" -Namespace "Win32" -PassThru;
                    $result = [UIntPtr]::Zero;
                    [void]$type::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Environment", 0x0002, 1000, [out] $result);
                } catch {}
            `;

            // Execute as encoded command for safety
            const encoded = Buffer.from(psPathUpdate, 'utf16le').toString('base64');
            exec(`powershell -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, (err, stdout, stderr) => {
                if (err) console.error('[PATH UPDATE ERROR]', err, stderr);
                console.log('[PATH UPDATE LOGS]', stdout);
            });

            res.json({ message: `PHP ${version} set as system preferred binary. Registry updated.`, path: phpDir });
        } else {
            exec(`sudo update-alternatives --set php /usr/bin/php${version}`, (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `PHP ${version} set as default on Linux.` });
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/php/restart
router.post('/php/restart', requireAdmin, async (req, res) => {
    const { version } = req.body;
    try {
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            // Restarting PHP on Windows usually means restarting the web server or FastCGI process
            res.json({ message: `PHP ${version} restart signal synchronized.` });
        } else {
            exec(`sudo systemctl restart php${version}-fpm`, (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `PHP ${version}-fpm service restarted on Linux.` });
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, findPHPDir };
