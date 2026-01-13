require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.WHM_PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
    res.json({
        service: 'Yumna WHM',
        version: '3.1.0',
        status: 'operational'
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/websites', require('./routes/websites'));
app.use('/api/databases', require('./routes/databases'));
app.use('/api/email', require('./routes/email'));
app.use('/api/ftp', require('./routes/ftp'));
app.use('/api/cron', require('./routes/cron'));
app.use('/api/docker', require('./routes/docker'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api', require('./routes/files'));
app.use('/api', require('./routes/security'));
app.use('/api/ssl', require('./routes/ssl'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dns', require('./routes/dns'));
app.use('/api/plugins', require('./routes/plugins'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/git', require('./routes/git'));
app.use('/api/task', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/cloud', require('./routes/cloud'));
app.use('/api/commercial', require('./routes/commercial'));
app.use('/api/ha', require('./routes/ha'));
app.use('/api/cdn', require('./routes/cdn'));
app.use('/api/db-tools', require('./routes/database-tools'));
app.use('/api/wordpress', require('./routes/wordpress'));
app.use('/api', require('./routes/auth')); // Aliases for login, captcha, etc.
app.use('/api', require('./routes/settings'));
app.use('/api', require('./routes/analytics')); // For activity-history without prefix

// Services
const serverNodeService = require('./services/ServerNodeService');
const pluginService = require('./services/PluginService');
const slaMonitor = require('./services/SLAMonitorService');
const dnsCluster = require('./services/dns/DNSClusterService');
const haService = require('./services/HAService');
const dbReplication = require('./services/DatabaseReplicationService');
const loadBalancer = require('./services/LoadBalancerService');
const initV3 = require('./migrations/init_v3');

// Init DB & Services
(async () => {
    await initV3();
    await pluginService.init();
    await dnsCluster.initialize();
    await haService.initialize();
    await dbReplication.initialize();
    await loadBalancer.initialize();
    serverNodeService.start();
    slaMonitor.start();
})();

app.listen(PORT, () => {
    console.log(`[WHM] Control Plane running on port ${PORT}`);
});
