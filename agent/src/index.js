require('dotenv').config();
const express = require('express');
const si = require('systeminformation');

const app = express();
const PORT = process.env.AGENT_PORT || 4001;

// Utility for async error handling
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

app.use(express.json());

// Agent Identity
const AGENT_ID = process.env.AGENT_ID || 'local-agent';
const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

// Auth Middleware
const requireAuth = (req, res, next) => {
    const token = req.headers['x-agent-secret'];
    if (!token || token !== AGENT_SECRET) {
        // Log unauthorized attempt
        console.warn(`[AUTH] Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Protect Routes (except simple health check if needed, but heartbeat reveals stats so protect it)
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
    const { root, path, content } = req.body;
    const result = await FileService.writeFile(root, path, content);
    res.json(result);
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
    const { rules } = req.body;
    const result = await FirewallService.sync(rules);
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


app.listen(PORT, () => {
    console.log(`[Agent] Server Executor running on port ${PORT}`);
});
