const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const haService = require('../services/HAService');
const dbReplication = require('../services/DatabaseReplicationService');
const loadBalancer = require('../services/LoadBalancerService');
const sessionMgmt = require('../services/SessionManagementService');

/**
 * GET /api/ha/status
 * Get HA cluster status
 */
router.get('/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const clusterStatus = await haService.getClusterStatus();
        const dbStatus = await dbReplication.checkReplicationStatus();
        const lbStats = loadBalancer.getStatistics();
        const sessionStats = await sessionMgmt.getStatistics();

        res.json({
            success: true,
            cluster: clusterStatus,
            database: dbStatus,
            loadBalancer: lbStats,
            sessions: sessionStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ha/nodes
 * Get all cluster nodes
 */
router.get('/nodes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const status = await haService.getClusterStatus();
        res.json({
            success: true,
            nodes: status.nodes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ha/nodes
 * Add node to cluster
 */
router.post('/nodes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { hostname, ip, port, priority } = req.body;

        if (!hostname || !ip) {
            return res.status(400).json({ error: 'Hostname and IP are required' });
        }

        const result = await haService.addNode({
            hostname,
            ip,
            port: port || 4000,
            priority: priority || 100
        });

        res.json({
            success: true,
            message: 'Node added to cluster',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/ha/nodes/:nodeId
 * Remove node from cluster
 */
router.delete('/nodes/:nodeId', requireAuth, requireAdmin, async (req, res) => {
    try {
        await haService.removeNode(parseInt(req.params.nodeId));

        res.json({
            success: true,
            message: 'Node removed from cluster'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ha/failover
 * Trigger manual failover
 */
router.post('/failover', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { targetNodeId } = req.body;

        if (!targetNodeId) {
            return res.status(400).json({ error: 'Target node ID is required' });
        }

        const result = await haService.manualFailover(parseInt(targetNodeId));

        res.json({
            success: true,
            message: 'Failover completed',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ha/failover/history
 * Get failover history
 */
router.get('/failover/history', requireAuth, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await haService.getFailoverHistory(limit);

        res.json({
            success: true,
            history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ha/database/replication
 * Get database replication status
 */
router.get('/database/replication', requireAuth, requireAdmin, async (req, res) => {
    try {
        const status = await dbReplication.checkReplicationStatus();

        res.json({
            success: true,
            replication: status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ha/database/promote
 * Promote slave to master
 */
router.post('/database/promote', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { slaveHost } = req.body;

        if (!slaveHost) {
            return res.status(400).json({ error: 'Slave host is required' });
        }

        const slaveConfig = dbReplication.slaveConfigs.find(s => s.host === slaveHost);

        if (!slaveConfig) {
            return res.status(404).json({ error: 'Slave not found' });
        }

        await dbReplication.promoteSlave(slaveConfig);

        res.json({
            success: true,
            message: 'Slave promoted to master'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ha/loadbalancer/stats
 * Get load balancer statistics
 */
router.get('/loadbalancer/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = loadBalancer.getStatistics();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ha/loadbalancer/reload
 * Reload load balancer nodes
 */
router.post('/loadbalancer/reload', requireAuth, requireAdmin, async (req, res) => {
    try {
        await loadBalancer.reload();

        res.json({
            success: true,
            message: 'Load balancer nodes reloaded'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ha/sessions/stats
 * Get session statistics
 */
router.get('/sessions/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await sessionMgmt.getStatistics();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ha/sessions/cleanup
 * Cleanup expired sessions
 */
router.post('/sessions/cleanup', requireAuth, requireAdmin, async (req, res) => {
    try {
        const cleaned = await sessionMgmt.cleanupExpiredSessions();

        res.json({
            success: true,
            message: `Cleaned up ${cleaned} expired sessions`,
            count: cleaned
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
