require('dotenv').config();
const express = require('express');
const si = require('systeminformation');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.AGENT_PORT || 3000;

// Utility for async error handling
const asyncHandler = fn => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(err => {
        console.error(`[Agent] Async Error in ${req.method} ${req.path}:`, err);
        next(err);
    });
};

app.use(express.json());

// Agent Identity
const AGENT_ID = process.env.AGENT_ID || 'local-agent';
const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

// Auth Middleware
const requireAuth = (req, res, next) => {
    // Exempt heartbeat from auth for easier status checks
    if (req.path === '/heartbeat') return next();

    const token = req.headers['x-agent-secret'];
    if (!token || token !== AGENT_SECRET) {
        // Log unauthorized attempt
        console.warn(`[AUTH] Unauthorized access attempt from ${req.ip} to ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Protect Routes
app.use((req, res, next) => {
    console.log(`[Agent] ${req.method} ${req.url}`);
    next();
});
app.use(requireAuth);

// --- Internal API: WebServer Management ---
app.post('/web/vhost', asyncHandler(async (req, res) => {
    // Expects { domain, rootPath, phpVersion, ssl, ... }
    try {
        const WebServerService = require('./services/WebServerService');
        const result = await WebServerService.createSite(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

app.delete('/web/vhost/:domain', asyncHandler(async (req, res) => {
    const WebServerService = require('./services/WebServerService');
    const result = await WebServerService.removeSite(req.params.domain);
    res.json(result);
}));

app.post('/web/maintenance', asyncHandler(async (req, res) => {
    const WebServerService = require('./services/WebServerService');
    const { rootPath, enabled } = req.body;
    const result = await WebServerService.setMaintenance(rootPath, enabled);
    res.json(result);
}));

app.post('/web/app/install', asyncHandler(async (req, res) => {
    const AppInstallerService = require('./services/AppInstallerService');
    const result = await AppInstallerService.installApp(req.body);
    res.json(result);
}));

app.get('/git/key', asyncHandler(async (req, res) => {
    const GitService = require('./services/GitService');
    const pubKey = await GitService.getPublicKey();
    res.json({ publicKey: pubKey });
}));

app.post('/git/deploy', asyncHandler(async (req, res) => {
    const GitService = require('./services/GitService');
    const taskService = require('./services/TaskService');

    const jobId = taskService.createTask('git_deploy', { repo: req.body.repoUrl });

    // Run in background
    GitService.deploy(req.body, jobId).catch(err => {
        console.error(`[GIT] Background deploy error for ${jobId}:`, err.message);
    });

    res.json({ jobId });
}));

app.get('/task/:id', asyncHandler(async (req, res) => {
    const taskService = require('./services/TaskService');
    const task = taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
}));

app.post('/system/restart', asyncHandler(async (req, res) => {
    const systemService = require('./services/SystemService');
    const { service } = req.body;
    const result = await systemService.restartService(service);
    res.json(result);
}));

app.get('/system/logs', asyncHandler(async (req, res) => {
    const systemService = require('./services/SystemService');
    const { lines } = req.query;
    const result = await systemService.getSystemLogs(lines);
    res.json(result);
}));

app.post('/system/exec', asyncHandler(async (req, res) => {
    let { command, cwd, root } = req.body;
    const { exec } = require('child_process');

    // Resolve absolute base
    const baseDir = cwd || root || process.cwd();

    // If command is 'cd something'
    if (command.trim().startsWith('cd ')) {
        const targetDir = command.trim().substring(3).trim();
        const newPath = path.resolve(baseDir, targetDir);

        // Root Jail Enforcement
        if (root && !newPath.startsWith(path.resolve(root))) {
            return res.json({
                output: `cd: ${targetDir}: Access denied (Jailed to ${root})`,
                error: 'Jail violation',
                cwd: baseDir
            });
        }

        const fs = require('fs').promises;
        try {
            const stats = await fs.stat(newPath);
            if (stats.isDirectory()) {
                return res.json({ output: '', stdout: '', stderr: '', error: null, cwd: newPath });
            }
        } catch (e) {
            return res.json({ output: `cd: ${targetDir}: No such directory`, error: e.message, cwd: baseDir });
        }
    }

    // Regular Command Execution with Jail enforcement
    const finalCwd = (root && !baseDir.startsWith(path.resolve(root))) ? path.resolve(root) : baseDir;

    exec(command, { cwd: finalCwd }, (error, stdout, stderr) => {
        res.json({
            output: stdout || stderr || (error ? error.message : ''),
            stdout,
            stderr,
            error: error ? error.message : null,
            cwd: finalCwd
        });
    });
}));



app.get('/web/config', asyncHandler(async (req, res) => {
    try {
        const WebServerService = require('./services/WebServerService');
        const { domain, stack } = req.query;
        const result = await WebServerService.getConfig(domain, stack);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
}));

app.put('/web/config', asyncHandler(async (req, res) => {
    try {
        const WebServerService = require('./services/WebServerService');
        const { domain, stack, content } = req.body;
        const result = await WebServerService.saveConfig(domain, stack, content);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

app.get('/web/logs', asyncHandler(async (req, res) => {
    const WebServerService = require('./services/WebServerService');
    const { domain, type } = req.query;
    const result = await WebServerService.getLogs(domain, type);
    res.json(result);
}));

// --- Internal API: SSL Management ---
app.post('/ssl/letsencrypt', asyncHandler(async (req, res) => {
    const SSLService = require('./services/SSLService');
    const { domain, rootPath, wildcard } = req.body;
    const result = await SSLService.issueLetsEncrypt(domain, rootPath, wildcard);
    res.json(result);
}));

app.post('/ssl/custom', asyncHandler(async (req, res) => {
    const SSLService = require('./services/SSLService');
    const { domain, cert, key, chain } = req.body;
    const result = await SSLService.saveCustomSSL(domain, cert, key, chain);
    res.json(result);
}));

// --- Internal API: Database Management ---
app.get('/db/stats', asyncHandler(async (req, res) => {
    const DatabaseService = require('./services/DatabaseService');
    const result = await DatabaseService.getStats(req.query.name);
    res.json(result);
}));

app.post('/db/create', asyncHandler(async (req, res) => {
    const DatabaseService = require('./services/DatabaseService');
    const { name, user, password } = req.body;
    const result = await DatabaseService.createDatabase(name, user, password);
    res.json(result);
}));

app.post('/db/drop', asyncHandler(async (req, res) => {
    const DatabaseService = require('./services/DatabaseService');
    const { name, user } = req.body;
    const result = await DatabaseService.dropDatabase(name, user);
    res.json(result);
}));

app.post('/db/clone', asyncHandler(async (req, res) => {
    const DatabaseService = require('./services/DatabaseService');
    const { source, target, user, password } = req.body;
    const result = await DatabaseService.cloneDatabase(source, target, user, password);
    res.json(result);
}));

// --- Internal API: File Management ---
app.get('/fs/ls', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.list(root, path);
    res.json(result);
}));

app.get('/fs/stat', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.stat(root, path);
    res.json(result);
}));

app.get('/stats/pulse', asyncHandler(async (req, res) => {
    const StatsService = require('./services/StatsService');
    const result = await StatsService.getPulse();
    res.json(result);
}));

app.post('/fs/mkdir', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.body;
    const result = await FileService.mkdir(root, path);
    res.json(result);
}));

app.post('/fs/delete', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, recursive } = req.body;
    const result = await FileService.delete(root, path, recursive);
    res.json(result);
}));

app.post('/fs/rename', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, oldPath, newPath } = req.body;
    const result = await FileService.rename(root, oldPath, newPath);
    res.json(result);
}));

app.post('/fs/chmod', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, mode } = req.body;
    const result = await FileService.chmod(root, path, mode);
    res.json(result);
}));

app.get('/fs/read', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.readFile(root, path);
    res.json(result);
}));

app.post('/fs/write', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, content, encoding } = req.body;
    const result = await FileService.writeFile(root, path, content, encoding);
    res.json(result);
}));

app.post('/fs/copy', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, destPath } = req.body;
    const result = await FileService.copy(root, path, destPath);
    res.json(result);
}));

app.post('/fs/touch', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.body;
    const result = await FileService.touch(root, path);
    res.json(result);
}));

app.post('/fs/symlink', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, target } = req.body;
    const result = await FileService.symlink(root, path, target);
    res.json(result);
}));

app.get('/fs/exists', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.exists(root, path);
    res.json(result);
}));

app.post('/fs/zip', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, files, archiveName } = req.body;
    const result = await FileService.zip(root, path, files, archiveName);
    res.json(result);
}));

app.post('/fs/unzip', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, destination } = req.body;
    const result = await FileService.unzip(root, path, destination);
    res.json(result);
}));

app.post('/fs/tar', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, files, archiveName, compress } = req.body;
    const result = await FileService.tar(root, path, files, archiveName, compress);
    res.json(result);
}));

app.post('/fs/untar', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, destination } = req.body;
    const result = await FileService.untar(root, path, destination);
    res.json(result);
}));

app.post('/fs/gzip', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.body;
    const result = await FileService.gzip(root, path);
    res.json(result);
}));

app.post('/fs/gunzip', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.body;
    const result = await FileService.gunzip(root, path);
    res.json(result);
}));

app.get('/fs/search', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, pattern, maxDepth } = req.query;
    const result = await FileService.search(root, path, pattern, parseInt(maxDepth));
    res.json(result);
}));

app.get('/fs/grep', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, query, recursive, ignoreCase } = req.query;
    const result = await FileService.grep(root, path, query, recursive === 'true', ignoreCase === 'true');
    res.json(result);
}));

app.get('/fs/du', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.du(root, path);
    res.json(result);
}));

app.get('/fs/file-type', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path } = req.query;
    const result = await FileService.fileType(root, path);
    res.json(result);
}));

app.get('/fs/checksum', asyncHandler(async (req, res) => {
    const FileService = require('./services/FileService');
    const { root, path, algorithm } = req.query;
    const result = await FileService.checksum(root, path, algorithm);
    res.json(result);
}));

app.post('/fs/upload/init', asyncHandler(async (req, res) => {
    const { name, size } = req.body;
    // Just a placeholder for compatibility, actual chunking handled in /chunk
    res.json({ success: true, message: 'Upload initialized' });
}));

app.post('/fs/upload/chunk', asyncHandler(async (req, res) => {
    const { root, path: relPath, name, data, index } = req.body;
    const FileService = require('./services/FileService');
    const fullPath = FileService.resolveSafePath(root, relPath);
    const filePath = path.join(fullPath, name);

    await require('fs').promises.mkdir(path.dirname(filePath), { recursive: true });
    const buffer = Buffer.from(data, 'base64');

    if (parseInt(index) === 0) {
        await require('fs').promises.writeFile(filePath, buffer);
    } else {
        await require('fs').promises.appendFile(filePath, buffer);
    }
    res.json({ success: true, index });
}));

app.post('/fs/upload/complete', asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Upload complete' });
}));

app.get('/fs/download', (req, res) => {
    // This one is not asyncHandler because we pipe
    try {
        const FileService = require('./services/FileService');
        const { root, path } = req.query;
        const stream = FileService.createReadStream(root, path);
        stream.on('error', (err) => res.status(500).json({ error: err.message }));
        stream.pipe(res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Internal API: Security ---
app.post('/firewall/sync', asyncHandler(async (req, res) => {
    const FirewallService = require('./services/FirewallService');
    const { rules, patterns } = req.body;
    const result = await FirewallService.sync(rules, patterns);
    res.json(result);
}));

// --- Internal API: DNS Management ---
app.use('/api/dns', require('./routes/dns'));

// --- Internal API: Docker Management ---
// Existing Docker routes...
const DockerService = require('./services/DockerService');
const dockerService = new DockerService();

// Health & Stats
app.get('/heartbeat', async (req, res) => {
    try {
        const StatsService = require('./services/StatsService');
        const stats = await StatsService.getPulse();
        const dockerStatus = await dockerService.isDockerAvailable();

        res.json({
            agentId: AGENT_ID,
            version: require('../package.json').version,
            status: 'online',
            components: {
                docker: dockerStatus ? 'running' : 'unavailable'
            },
            metrics: {
                cpu_load: stats.cpu.percentage,
                mem_used: stats.memory.used,
                mem_total: stats.memory.total,
                network: stats.network,
                storage: stats.storage,
                uptime: stats.uptime
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Docker Endpoints
app.get('/docker/containers', async (req, res) => {
    const containers = await dockerService.getContainers(req.query.all === 'true');
    res.json(containers);
});

app.post('/docker/containers', async (req, res) => {
    try {
        const result = await dockerService.createContainer(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/docker/containers/:id/:action', async (req, res) => {
    try {
        const { id, action } = req.params;
        let result;
        switch (action) {
            case 'start': result = await dockerService.startContainer(id); break;
            case 'stop': result = await dockerService.stopContainer(id); break;
            case 'restart': result = await dockerService.restartContainer(id); break;
            case 'remove': result = await dockerService.removeContainer(id); break;
            default: return res.status(400).json({ error: 'Invalid action' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Custom error handler for JSON responses
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`[Agent Error Handler] ${req.method} ${req.path} -> ${status}: ${message}`);
    if (err.stack) console.error(err.stack);

    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    res.status(status).json({
        success: false,
        error: message,
        code: err.code || 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' || true ? { stack: err.stack } : {}) // Keep stack for now to debug
    });
});

app.listen(PORT, () => {
    console.log(`[Agent] Server Executor running on port ${PORT}`);

    // Yumna Tunnel (Reverse Connection)
    const tunnelClient = require('./services/TunnelClientService');
    tunnelClient.start();
});
