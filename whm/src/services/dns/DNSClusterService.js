const pool = require('../../config/db');
const axios = require('axios');

class DNSClusterService {
    constructor() {
        this.clusterNodes = [];
        this.initialized = false;
    }

    /**
     * Initialize DNS cluster service
     */
    async initialize() {
        try {
            await this.loadClusterNodes();
            this.initialized = true;
            console.log(`[DNS Cluster] Initialized with ${this.clusterNodes.length} nodes`);
            return true;
        } catch (error) {
            console.error('[DNS Cluster] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Load cluster nodes from database
     */
    async loadClusterNodes() {
        try {
            const [nodes] = await pool.promise().query(`
                SELECT s.*, 
                       (SELECT COUNT(*) FROM dns_zones WHERE serverId = s.id) as zone_count
                FROM servers s 
                WHERE s.status = 'online' 
                AND s.capabilities LIKE '%dns%'
                ORDER BY s.id
            `);

            this.clusterNodes = nodes.map(node => ({
                id: node.id,
                hostname: node.hostname,
                ip: node.ip,
                port: node.port || 3001,
                apiUrl: `http://${node.ip}:${node.port || 3001}`,
                agentSecret: node.agentSecret,
                isPrimary: node.isPrimary || false,
                zoneCount: node.zone_count || 0,
                status: node.status
            }));

            return this.clusterNodes;
        } catch (error) {
            console.error('[DNS Cluster] Error loading nodes:', error.message);
            return [];
        }
    }

    /**
     * Add a node to DNS cluster
     */
    async addNode(serverId) {
        try {
            const [servers] = await pool.promise().query(
                'SELECT * FROM servers WHERE id = ?',
                [serverId]
            );

            if (servers.length === 0) {
                throw new Error('Server not found');
            }

            const server = servers[0];

            // Update server capabilities to include DNS
            let capabilities = server.capabilities ? JSON.parse(server.capabilities) : [];
            if (!capabilities.includes('dns')) {
                capabilities.push('dns');
                await pool.promise().query(
                    'UPDATE servers SET capabilities = ? WHERE id = ?',
                    [JSON.stringify(capabilities), serverId]
                );
            }

            // Reload cluster nodes
            await this.loadClusterNodes();

            console.log(`[DNS Cluster] Added node: ${server.hostname}`);
            return { success: true, node: server };
        } catch (error) {
            console.error('[DNS Cluster] Add node error:', error.message);
            throw error;
        }
    }

    /**
     * Remove a node from DNS cluster
     */
    async removeNode(serverId) {
        try {
            const [servers] = await pool.promise().query(
                'SELECT * FROM servers WHERE id = ?',
                [serverId]
            );

            if (servers.length === 0) {
                throw new Error('Server not found');
            }

            const server = servers[0];

            // Remove DNS capability
            let capabilities = server.capabilities ? JSON.parse(server.capabilities) : [];
            capabilities = capabilities.filter(c => c !== 'dns');

            await pool.promise().query(
                'UPDATE servers SET capabilities = ? WHERE id = ?',
                [JSON.stringify(capabilities), serverId]
            );

            // Reload cluster nodes
            await this.loadClusterNodes();

            console.log(`[DNS Cluster] Removed node: ${server.hostname}`);
            return { success: true };
        } catch (error) {
            console.error('[DNS Cluster] Remove node error:', error.message);
            throw error;
        }
    }

    /**
     * Sync zone to all cluster nodes
     */
    async syncZoneToCluster(zoneId) {
        try {
            // Get zone details
            const [zones] = await pool.promise().query(
                'SELECT * FROM dns_zones WHERE id = ?',
                [zoneId]
            );

            if (zones.length === 0) {
                throw new Error('Zone not found');
            }

            const zone = zones[0];

            // Get all ACTIVE records for this zone (exclude drafts)
            const [records] = await pool.promise().query(
                "SELECT * FROM dns_records WHERE zoneId = ? AND (status = 'active' OR status IS NULL)",
                [zoneId]
            );

            const results = [];

            // Sync to all cluster nodes
            for (const node of this.clusterNodes) {
                try {
                    const response = await axios.post(
                        `${node.apiUrl}/api/dns/sync-zone`,
                        {
                            zone: zone,
                            records: records
                        },
                        {
                            headers: {
                                'X-Agent-Secret': node.agentSecret
                            },
                            timeout: 10000
                        }
                    );

                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: true,
                        message: response.data.message
                    });

                    console.log(`[DNS Cluster] Synced zone ${zone.domain} to ${node.hostname}`);
                } catch (error) {
                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: false,
                        error: error.message
                    });

                    console.error(`[DNS Cluster] Failed to sync to ${node.hostname}:`, error.message);
                }
            }

            return {
                success: true,
                zone: zone.domain,
                results: results,
                totalNodes: this.clusterNodes.length,
                successCount: results.filter(r => r.success).length
            };
        } catch (error) {
            console.error('[DNS Cluster] Sync zone error:', error.message);
            throw error;
        }
    }

    /**
     * Delete zone from all cluster nodes
     */
    async deleteZoneFromCluster(zoneName) {
        try {
            const results = [];

            for (const node of this.clusterNodes) {
                try {
                    await axios.delete(
                        `${node.apiUrl}/api/dns/zones/${encodeURIComponent(zoneName)}`,
                        {
                            headers: {
                                'X-Agent-Secret': node.agentSecret
                            },
                            timeout: 10000
                        }
                    );

                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: true
                    });

                    console.log(`[DNS Cluster] Deleted zone ${zoneName} from ${node.hostname}`);
                } catch (error) {
                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                zone: zoneName,
                results: results
            };
        } catch (error) {
            console.error('[DNS Cluster] Delete zone error:', error.message);
            throw error;
        }
    }

    /**
     * Get cluster status
     */
    async getClusterStatus() {
        try {
            const nodeStatuses = [];

            for (const node of this.clusterNodes) {
                try {
                    const response = await axios.get(
                        `${node.apiUrl}/api/dns/status`,
                        {
                            headers: {
                                'X-Agent-Secret': node.agentSecret
                            },
                            timeout: 5000
                        }
                    );

                    nodeStatuses.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        ip: node.ip,
                        status: 'online',
                        dnsStatus: response.data,
                        lastCheck: new Date()
                    });
                } catch (error) {
                    nodeStatuses.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        ip: node.ip,
                        status: 'offline',
                        error: error.message,
                        lastCheck: new Date()
                    });
                }
            }

            return {
                totalNodes: this.clusterNodes.length,
                onlineNodes: nodeStatuses.filter(n => n.status === 'online').length,
                offlineNodes: nodeStatuses.filter(n => n.status === 'offline').length,
                nodes: nodeStatuses
            };
        } catch (error) {
            console.error('[DNS Cluster] Status check error:', error.message);
            throw error;
        }
    }

    /**
     * Perform health check on all nodes
     */
    async healthCheck() {
        try {
            const healthResults = [];

            for (const node of this.clusterNodes) {
                try {
                    const startTime = Date.now();

                    const response = await axios.get(
                        `${node.apiUrl}/health`,
                        {
                            headers: {
                                'X-Agent-Secret': node.agentSecret
                            },
                            timeout: 5000
                        }
                    );

                    const responseTime = Date.now() - startTime;

                    healthResults.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        healthy: true,
                        responseTime: responseTime,
                        details: response.data
                    });
                } catch (error) {
                    healthResults.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        healthy: false,
                        error: error.message
                    });
                }
            }

            return {
                timestamp: new Date(),
                totalNodes: this.clusterNodes.length,
                healthyNodes: healthResults.filter(h => h.healthy).length,
                results: healthResults
            };
        } catch (error) {
            console.error('[DNS Cluster] Health check error:', error.message);
            throw error;
        }
    }

    /**
     * Get cluster statistics
     */
    async getStatistics() {
        try {
            const [zones] = await pool.promise().query(
                'SELECT COUNT(*) as total FROM dns_zones'
            );

            const [records] = await pool.promise().query(
                'SELECT COUNT(*) as total FROM dns_records'
            );

            const clusterStatus = await this.getClusterStatus();

            return {
                totalZones: zones[0].total,
                totalRecords: records[0].total,
                clusterNodes: this.clusterNodes.length,
                onlineNodes: clusterStatus.onlineNodes,
                offlineNodes: clusterStatus.offlineNodes,
                averageZonesPerNode: this.clusterNodes.length > 0
                    ? Math.round(zones[0].total / this.clusterNodes.length)
                    : 0
            };
        } catch (error) {
            console.error('[DNS Cluster] Statistics error:', error.message);
            return {
                totalZones: 0,
                totalRecords: 0,
                clusterNodes: 0,
                onlineNodes: 0,
                offlineNodes: 0
            };
        }
    }

    /**
     * Sync all zones to a specific node (useful for new nodes)
     */
    async syncAllZonesToNode(serverId) {
        try {
            const node = this.clusterNodes.find(n => n.id === serverId);

            if (!node) {
                throw new Error('Node not found in cluster');
            }

            // Get all zones
            const [zones] = await pool.promise().query('SELECT * FROM dns_zones');

            const results = [];

            for (const zone of zones) {
                try {
                    // Get records for this zone
                    const [records] = await pool.promise().query(
                        'SELECT * FROM dns_records WHERE zoneId = ?',
                        [zone.id]
                    );

                    await axios.post(
                        `${node.apiUrl}/api/dns/sync-zone`,
                        {
                            zone: zone,
                            records: records
                        },
                        {
                            headers: {
                                'X-Agent-Secret': node.agentSecret
                            },
                            timeout: 10000
                        }
                    );

                    results.push({
                        zoneId: zone.id,
                        domain: zone.domain,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        zoneId: zone.id,
                        domain: zone.domain,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                node: node.hostname,
                totalZones: zones.length,
                successCount: results.filter(r => r.success).length,
                results: results
            };
        } catch (error) {
            console.error('[DNS Cluster] Sync all zones error:', error.message);
            throw error;
        }
    }

    /**
     * Enable DNSSEC for a zone on its primary node (and sync to others if needed)
     */
    async enableDNSSEC(zoneId) {
        try {
            const [zones] = await pool.promise().query('SELECT * FROM dns_zones WHERE id = ?', [zoneId]);
            if (zones.length === 0) throw new Error('Zone not found');
            const zone = zones[0];

            const results = [];
            let dsRecords = [];

            // In a master-slave setups, normally only the master needs to sign
            // but for PowerDNS Native/Live-signing, it's safer to ensure it's enabled 
            // on the node assigned to this zone (or all cluster nodes if shared DB)

            for (const node of this.clusterNodes) {
                try {
                    const response = await axios.post(
                        `${node.apiUrl}/api/dns/zones/${encodeURIComponent(zone.domain)}/dnssec`,
                        {},
                        {
                            headers: { 'X-Agent-Secret': node.agentSecret },
                            timeout: 15000
                        }
                    );

                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: true,
                        details: response.data
                    });

                    // Collect DS records if returned
                    if (response.data.keys && response.data.keys.includes('DS =')) {
                        // Extract DS records from pdnsutil show-zone output if possible
                        // For now we just take the whole output if it contains keys
                        dsRecords.push(response.data.keys);
                    }
                } catch (error) {
                    results.push({
                        nodeId: node.id,
                        hostname: node.hostname,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: results.some(r => r.success),
                domain: zone.domain,
                results: results,
                dnssec: {
                    enabled: true,
                    raw_output: dsRecords[0] || 'DNSSEC enabled, but DS records could not be parsed automatically. Please check pdnsutil show-zone manually.'
                }
            };
        } catch (error) {
            console.error('[DNS Cluster] DNSSEC error:', error.message);
            throw error;
        }
    }
}

module.exports = new DNSClusterService();
