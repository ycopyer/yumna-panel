const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const serverNodeService = require('../services/ServerNodeService');

const { encrypt } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const agentDeploymentService = require('../services/AgentDeploymentService');
const agentUpgradeService = require('../services/AgentUpgradeService');

// List all servers
router.get('/', requireAuth, async (req, res) => {
    try {
        const [servers] = await pool.promise().query('SELECT id, name, hostname, ip, is_local, status, cpu_usage, ram_usage, disk_usage, last_seen, agent_version, connection_type, agent_id FROM servers');
        const path = require('path');
        const fs = require('fs');
        let masterVersion = '0.0.0';
        try {
            const agentPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '..', 'agent', 'package.json'), 'utf8'));
            masterVersion = agentPkg.version;
        } catch (e) { }

        res.json({ servers, masterVersion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public Install Script Generator
router.get('/install-script', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(401).send('Missing token');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yumna-secret');
        const { agentId, agentSecret, masterHost, secure } = decoded;

        const wsProto = secure ? 'wss' : 'ws';
        const wsUrl = `${wsProto}://${masterHost}/tunnel`;

        const script = `#!/bin/bash
# YumnaPanel Agent Installer
# Auto-generated for Agent ID: ${agentId}
# Host: ${masterHost}

echo "========================================"
echo "   YumnaPanel Agent Installer"
echo "========================================"

# 1. Install Node.js
if ! command -v node &> /dev/null; then
    echo "[+] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "[+] Node.js is already installed."
fi

# 2. Setup Directory
INSTALL_DIR="/opt/yumna-agent"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 3. Clone Agent Code
echo "[+] Fetching Agent Code..."
if [ ! -d ".git" ]; then
    git clone https://github.com/ycopyer/yumna-panel.git temp_repo || echo "Git clone failed."
    if [ -d "temp_repo" ]; then
        cp -r temp_repo/agent/* .
        rm -rf temp_repo
    else
        echo "[-] FAILED to download agent code. Please manually extract 'agent' folder to $INSTALL_DIR"
    fi
fi

# 4. Create .env
echo "[+] Configuring .env..."
cat > .env <<EOF
CONNECTION_MODE=tunnel
MASTER_URL=${wsUrl}
AGENT_ID=${agentId}
AGENT_SECRET=${agentSecret}
EOF

# 5. Install Dependencies
echo "[+] Installing Dependencies..."
npm install --production

# 6. Start Service
echo "[+] Starting Service..."
npm install -g pm2
pm2 delete yumna-agent 2>/dev/null || true
pm2 start src/index.js --name yumna-agent
pm2 save
pm2 startup

echo "========================================"
echo "   Agent Installed & Started!"
echo "   Check status: pm2 status yumna-agent"
echo "========================================"
`;
        res.setHeader('Content-Type', 'text/plain');
        res.send(script);

    } catch (e) {
        res.status(403).send('Link Expired or Invalid');
    }
});

// Create Tunnel Server & Get Install Config
router.post('/tunnel', requireAdmin, async (req, res) => {
    const { name, agentId, agentSecret } = req.body;

    // Auto-generate if missing
    const finalAgentId = agentId || `agent-${uuidv4().split('-')[0]}-${Math.floor(Date.now() / 1000)}`;
    const finalSecret = agentSecret || require('crypto').randomBytes(16).toString('hex');

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO servers (name, hostname, ip, is_local, status, connection_type, agent_id, agentSecret)
             VALUES (?, ?, ?, 0, 'offline', 'tunnel', ?, ?)`,
            [name || `Tunnel Server ${finalAgentId}`, `tunnel-${finalAgentId}`, '0.0.0.0', finalAgentId, finalSecret]
        );

        // Generate Token for Installation Script (valid 1 hour)
        const hostWithPort = req.get('host'); // Will include :34567 if accessed that way
        const protocol = req.headers['x-forwarded-proto'] || req.protocol; // http or https

        const installToken = jwt.sign({
            agentId: finalAgentId,
            agentSecret: finalSecret,
            masterHost: hostWithPort,
            secure: protocol === 'https'
        }, process.env.JWT_SECRET || 'yumna-secret', { expiresIn: '1h' });

        const installUrl = `${protocol}://${hostWithPort}/api/servers/install-script?token=${installToken}`;

        res.json({
            success: true,
            id: result.insertId,
            agentId: finalAgentId,
            agentSecret: finalSecret,
            installCommand: `curl -sL "${installUrl}" | bash`
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get server details
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        // Don't leak password
        delete rows[0].ssh_password;
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new server
router.post('/', requireAdmin, async (req, res) => {
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, is_local, connection_type, agent_id, agentSecret } = req.body;

    try {
        const encryptedPass = ssh_password ? encrypt(ssh_password) : null;
        const [result] = await pool.promise().query(
            `INSERT INTO servers (name, hostname, ip, is_local, ssh_user, ssh_password, ssh_port, status, connection_type, agent_id, agentSecret)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', ?, ?, ?)`,
            [name, hostname, ip, is_local ? 1 : 0, ssh_user, encryptedPass, ssh_port || 22, connection_type || 'direct', agent_id, agentSecret]
        );

        // Trigger immediate check
        const newServerId = result.insertId;
        const [newRows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [newServerId]);

        // Sync in background
        if (newRows[0].is_local) {
            serverNodeService.checkLocalAgent(newRows[0]);
        } else {
            // Check remote but only if direct (tunnel waits for incoming)
            if (newRows[0].connection_type === 'direct') {
                serverNodeService.checkRemote(newRows[0]);
            }
        }

        res.json({ message: 'Server added successfully', id: newServerId });
    } catch (error) {
        console.error('Add server error:', error);
        res.status(500).json({ error: 'Failed to add server' });
    }
});

// Update server
router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, hostname, ip, ssh_user, ssh_password, ssh_port, status } = req.body;

    try {
        let query = 'UPDATE servers SET name = ?, hostname = ?, ip = ?, ssh_user = ?, ssh_port = ?, status = ?';
        let params = [name, hostname, ip, ssh_user, ssh_port, status];

        if (ssh_password) {
            query += ', ssh_password = ?';
            params.push(encrypt(ssh_password));
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.promise().query(query, params);
        res.json({ message: 'Server updated successfully' });
    } catch (error) {
        console.error('Update server error:', error);
        res.status(500).json({ error: 'Failed to update server' });
    }
});

// Remove server
router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting the local master node if it's the only one/critical
        const [rows] = await pool.promise().query('SELECT is_local FROM servers WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].is_local) {
            return res.status(400).json({ error: 'Cannot delete the Local Master Node' });
        }

        await pool.promise().query('DELETE FROM servers WHERE id = ?', [id]);
        res.json({ message: 'Server removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const agentApi = axios.create({
    headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
});

// Force Sync
router.post('/:id/sync', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        if (server.is_local) {
            await serverNodeService.checkLocalAgent(server);
        } else {
            await serverNodeService.checkRemote(server);
        }
        res.json({ message: 'Sync triggered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/restart', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { service } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        const baseURL = server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`;

        const response = await agentApi.post(`${baseURL}/system/restart`, { service });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/logs', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { lines } = req.query;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Server not found' });

        const server = rows[0];
        const baseURL = server.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${server.ip}:4001`;

        const response = await agentApi.get(`${baseURL}/system/logs`, { params: { lines } });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Deploy Agent to Remote Server
router.post('/:id/deploy-agent', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { dbConfig } = req.body;
    try {
        const result = await agentDeploymentService.deploy(id, dbConfig);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check Deployment Status
router.get('/:id/deploy-status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const status = agentDeploymentService.getDeploymentStatus(id);
    res.json({ status });
});


// Upgrade Agent on Remote Server (Background Task)
router.post('/:id/upgrade-agent', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await agentUpgradeService.upgrade(id, req);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/upgrade-status', requireAdmin, (req, res) => {
    const { id } = req.params;
    res.json({ status: agentUpgradeService.getUpgradeStatus(id) });
});

module.exports = router;
