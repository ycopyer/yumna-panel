const pool = require('../config/db');
const axios = require('axios');

/**
 * WHM High Availability Service
 * Manages WHM clustering, failover, and load balancing
 */
class HAService {
    constructor() {
        this.nodes = [];
        this.primaryNode = null;
        this.healthCheckInterval = null;
        this.initialized = false;
    }

    /**
     * Initialize HA service
     */
    async initialize() {
        try {
            await this.loadClusterNodes();
            await this.electPrimaryNode();
            this.startHealthChecks();

            this.initialized = true;
            console.log('[HA] High Availability service initialized');
            return true;
        } catch (error) {
            console.error('[HA] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Load cluster nodes from database
     */
    async loadClusterNodes() {
        try {
            const [nodes] = await pool.promise().query(`
                SELECT * FROM whm_cluster_nodes 
                WHERE is_enabled = 1 
                ORDER BY priority ASC, id ASC
            `);

            this.nodes = nodes.map(node => ({
                id: node.id,
                hostname: node.hostname,
                ip: node.ip,
                port: node.port || 4000,
                priority: node.priority || 100,
                isPrimary: node.is_primary || false,
                isEnabled: node.is_enabled || true,
                lastHealthCheck: null,
                status: 'unknown',
                responseTime: 0
            }));

            console.log(`[HA] Loaded ${this.nodes.length} cluster nodes`);
            return this.nodes;
        } catch (error) {
            console.error('[HA] Error loading nodes:', error.message);
            return [];
        }
    }

    /**
     * Elect primary node
     */
    async electPrimaryNode() {
        try {
            // Check if there's already a primary
            const currentPrimary = this.nodes.find(n => n.isPrimary);

            if (currentPrimary) {
                // Verify primary is healthy
                const healthy = await this.checkNodeHealth(currentPrimary);
                if (healthy) {
                    this.primaryNode = currentPrimary;
                    console.log(`[HA] Primary node: ${currentPrimary.hostname}`);
                    return currentPrimary;
                }
            }

            // Elect new primary (lowest priority number = highest priority)
            const healthyNodes = [];

            for (const node of this.nodes) {
                const healthy = await this.checkNodeHealth(node);
                if (healthy) {
                    healthyNodes.push(node);
                }
            }

            if (healthyNodes.length === 0) {
                console.error('[HA] No healthy nodes available!');
                return null;
            }

            // Sort by priority (lower = higher priority)
            healthyNodes.sort((a, b) => a.priority - b.priority);
            const newPrimary = healthyNodes[0];

            // Update database
            await pool.promise().query(
                'UPDATE whm_cluster_nodes SET is_primary = 0'
            );
            await pool.promise().query(
                'UPDATE whm_cluster_nodes SET is_primary = 1 WHERE id = ?',
                [newPrimary.id]
            );

            newPrimary.isPrimary = true;
            this.primaryNode = newPrimary;

            console.log(`[HA] New primary elected: ${newPrimary.hostname}`);
            return newPrimary;

        } catch (error) {
            console.error('[HA] Election error:', error.message);
            return null;
        }
    }

    /**
     * Check node health
     */
    async checkNodeHealth(node) {
        try {
            const startTime = Date.now();

            const response = await axios.get(`http://${node.ip}:${node.port}/`, {
                timeout: 5000
            });

            const responseTime = Date.now() - startTime;

            node.status = response.status === 200 ? 'healthy' : 'unhealthy';
            node.responseTime = responseTime;
            node.lastHealthCheck = new Date();

            return node.status === 'healthy';

        } catch (error) {
            node.status = 'unhealthy';
            node.responseTime = 0;
            node.lastHealthCheck = new Date();
            return false;
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, 30000); // Every 30 seconds

        console.log('[HA] Health checks started (30s interval)');
    }

    /**
     * Perform health checks on all nodes
     */
    async performHealthChecks() {
        try {
            const checks = this.nodes.map(node => this.checkNodeHealth(node));
            await Promise.all(checks);

            // Check if primary is still healthy
            if (this.primaryNode && this.primaryNode.status !== 'healthy') {
                console.warn('[HA] Primary node unhealthy, triggering failover');
                await this.failover();
            }

            // Update database with health status
            for (const node of this.nodes) {
                await pool.promise().query(
                    'UPDATE whm_cluster_nodes SET status = ?, last_health_check = NOW() WHERE id = ?',
                    [node.status, node.id]
                );
            }

        } catch (error) {
            console.error('[HA] Health check error:', error.message);
        }
    }

    /**
     * Trigger failover to backup node
     */
    async failover() {
        try {
            console.log('[HA] Initiating failover...');

            const oldPrimary = this.primaryNode;
            const newPrimary = await this.electPrimaryNode();

            if (!newPrimary) {
                console.error('[HA] Failover failed: No healthy nodes available');
                return false;
            }

            // Log failover event
            await pool.promise().query(
                `INSERT INTO ha_failover_events 
                (old_primary_id, new_primary_id, reason, created_at) 
                VALUES (?, ?, ?, NOW())`,
                [oldPrimary?.id, newPrimary.id, 'Primary node unhealthy']
            );

            console.log(`[HA] Failover complete: ${oldPrimary?.hostname} → ${newPrimary.hostname}`);
            return true;

        } catch (error) {
            console.error('[HA] Failover error:', error.message);
            return false;
        }
    }

    /**
     * Get cluster status
     */
    async getClusterStatus() {
        try {
            const healthyNodes = this.nodes.filter(n => n.status === 'healthy').length;
            const unhealthyNodes = this.nodes.filter(n => n.status === 'unhealthy').length;

            return {
                initialized: this.initialized,
                totalNodes: this.nodes.length,
                healthyNodes,
                unhealthyNodes,
                primaryNode: this.primaryNode ? {
                    id: this.primaryNode.id,
                    hostname: this.primaryNode.hostname,
                    ip: this.primaryNode.ip,
                    status: this.primaryNode.status,
                    responseTime: this.primaryNode.responseTime
                } : null,
                nodes: this.nodes.map(n => ({
                    id: n.id,
                    hostname: n.hostname,
                    ip: n.ip,
                    status: n.status,
                    isPrimary: n.isPrimary,
                    priority: n.priority,
                    responseTime: n.responseTime,
                    lastHealthCheck: n.lastHealthCheck
                }))
            };
        } catch (error) {
            console.error('[HA] Status error:', error.message);
            return {
                initialized: false,
                error: error.message
            };
        }
    }

    /**
     * Add node to cluster
     */
    async addNode(nodeData) {
        try {
            const [result] = await pool.promise().query(
                `INSERT INTO whm_cluster_nodes 
                (hostname, ip, port, priority, is_enabled) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    nodeData.hostname,
                    nodeData.ip,
                    nodeData.port || 4000,
                    nodeData.priority || 100,
                    true
                ]
            );

            await this.loadClusterNodes();

            console.log(`[HA] Node added: ${nodeData.hostname}`);
            return { success: true, nodeId: result.insertId };

        } catch (error) {
            console.error('[HA] Add node error:', error.message);
            throw error;
        }
    }

    /**
     * Remove node from cluster
     */
    async removeNode(nodeId) {
        try {
            const node = this.nodes.find(n => n.id === nodeId);

            if (node && node.isPrimary) {
                throw new Error('Cannot remove primary node. Elect new primary first.');
            }

            await pool.promise().query(
                'DELETE FROM whm_cluster_nodes WHERE id = ?',
                [nodeId]
            );

            await this.loadClusterNodes();

            console.log(`[HA] Node removed: ${nodeId}`);
            return { success: true };

        } catch (error) {
            console.error('[HA] Remove node error:', error.message);
            throw error;
        }
    }

    /**
     * Manual failover
     */
    async manualFailover(targetNodeId) {
        try {
            const targetNode = this.nodes.find(n => n.id === targetNodeId);

            if (!targetNode) {
                throw new Error('Target node not found');
            }

            const healthy = await this.checkNodeHealth(targetNode);
            if (!healthy) {
                throw new Error('Target node is not healthy');
            }

            // Update primary
            await pool.promise().query(
                'UPDATE whm_cluster_nodes SET is_primary = 0'
            );
            await pool.promise().query(
                'UPDATE whm_cluster_nodes SET is_primary = 1 WHERE id = ?',
                [targetNodeId]
            );

            const oldPrimary = this.primaryNode;
            this.primaryNode = targetNode;
            targetNode.isPrimary = true;

            // Log event
            await pool.promise().query(
                `INSERT INTO ha_failover_events 
                (old_primary_id, new_primary_id, reason, created_at) 
                VALUES (?, ?, ?, NOW())`,
                [oldPrimary?.id, targetNodeId, 'Manual failover']
            );

            console.log(`[HA] Manual failover: ${oldPrimary?.hostname} → ${targetNode.hostname}`);
            return { success: true };

        } catch (error) {
            console.error('[HA] Manual failover error:', error.message);
            throw error;
        }
    }

    /**
     * Get failover history
     */
    async getFailoverHistory(limit = 50) {
        try {
            const [events] = await pool.promise().query(
                `SELECT e.*, 
                        o.hostname as old_hostname, 
                        n.hostname as new_hostname
                 FROM ha_failover_events e
                 LEFT JOIN whm_cluster_nodes o ON e.old_primary_id = o.id
                 LEFT JOIN whm_cluster_nodes n ON e.new_primary_id = n.id
                 ORDER BY e.created_at DESC
                 LIMIT ?`,
                [limit]
            );

            return events;
        } catch (error) {
            console.error('[HA] Failover history error:', error.message);
            return [];
        }
    }

    /**
     * Stop HA service
     */
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        console.log('[HA] Service stopped');
    }
}

module.exports = new HAService();
