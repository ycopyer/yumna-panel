const http = require('http');
const httpProxy = require('http-proxy');
const pool = require('../config/db');

/**
 * Load Balancer Service
 * Distributes requests across WHM cluster nodes
 */
class LoadBalancerService {
    constructor() {
        this.proxy = httpProxy.createProxyServer({});
        this.nodes = [];
        this.currentIndex = 0;
        this.initialized = false;
    }

    /**
     * Initialize load balancer
     */
    async initialize() {
        try {
            await this.loadNodes();
            this.setupProxyErrorHandling();
            this.initialized = true;
            console.log('[Load Balancer] Service initialized');
            return true;
        } catch (error) {
            console.error('[Load Balancer] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Load healthy nodes from database
     */
    async loadNodes() {
        try {
            const [nodes] = await pool.promise().query(`
                SELECT * FROM whm_cluster_nodes 
                WHERE is_enabled = 1 AND status = 'healthy'
                ORDER BY priority ASC
            `);

            this.nodes = nodes.map(node => ({
                id: node.id,
                hostname: node.hostname,
                ip: node.ip,
                port: node.port,
                target: `http://${node.ip}:${node.port}`,
                weight: 100 - node.priority, // Higher priority = higher weight
                currentConnections: 0
            }));

            console.log(`[Load Balancer] Loaded ${this.nodes.length} healthy nodes`);
            return this.nodes;
        } catch (error) {
            console.error('[Load Balancer] Error loading nodes:', error.message);
            return [];
        }
    }

    /**
     * Get next node using round-robin algorithm
     */
    getNextNode() {
        if (this.nodes.length === 0) {
            return null;
        }

        const node = this.nodes[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.nodes.length;
        return node;
    }

    /**
     * Get node using least connections algorithm
     */
    getLeastConnectionsNode() {
        if (this.nodes.length === 0) {
            return null;
        }

        return this.nodes.reduce((min, node) =>
            node.currentConnections < min.currentConnections ? node : min
        );
    }

    /**
     * Get node using weighted round-robin
     */
    getWeightedNode() {
        if (this.nodes.length === 0) {
            return null;
        }

        const totalWeight = this.nodes.reduce((sum, node) => sum + node.weight, 0);
        let random = Math.random() * totalWeight;

        for (const node of this.nodes) {
            random -= node.weight;
            if (random <= 0) {
                return node;
            }
        }

        return this.nodes[0];
    }

    /**
     * Handle incoming request
     */
    async handleRequest(req, res, algorithm = 'round-robin') {
        try {
            let targetNode;

            switch (algorithm) {
                case 'least-connections':
                    targetNode = this.getLeastConnectionsNode();
                    break;
                case 'weighted':
                    targetNode = this.getWeightedNode();
                    break;
                case 'round-robin':
                default:
                    targetNode = this.getNextNode();
                    break;
            }

            if (!targetNode) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'No healthy backend nodes available'
                }));
                return;
            }

            // Increment connection count
            targetNode.currentConnections++;

            // Add load balancer headers
            req.headers['X-Forwarded-For'] = req.connection.remoteAddress;
            req.headers['X-Forwarded-Proto'] = req.connection.encrypted ? 'https' : 'http';
            req.headers['X-Load-Balancer'] = 'Yumna-HA';

            // Proxy request
            this.proxy.web(req, res, {
                target: targetNode.target
            }, (error) => {
                targetNode.currentConnections--;
                if (error) {
                    console.error('[Load Balancer] Proxy error:', error.message);
                }
            });

            // Decrement on response finish
            res.on('finish', () => {
                targetNode.currentConnections--;
            });

        } catch (error) {
            console.error('[Load Balancer] Request handling error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal load balancer error'
            }));
        }
    }

    /**
     * Setup proxy error handling
     */
    setupProxyErrorHandling() {
        this.proxy.on('error', (err, req, res) => {
            console.error('[Load Balancer] Proxy error:', err.message);

            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Bad Gateway',
                    message: 'Backend server unavailable'
                }));
            }
        });

        this.proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add load balancer response headers
            proxyRes.headers['X-Served-By'] = 'Yumna-Load-Balancer';
        });
    }

    /**
     * Get load balancer statistics
     */
    getStatistics() {
        return {
            totalNodes: this.nodes.length,
            nodes: this.nodes.map(node => ({
                id: node.id,
                hostname: node.hostname,
                target: node.target,
                currentConnections: node.currentConnections,
                weight: node.weight
            })),
            algorithm: 'round-robin',
            initialized: this.initialized
        };
    }

    /**
     * Reload nodes from database
     */
    async reload() {
        await this.loadNodes();
        console.log('[Load Balancer] Nodes reloaded');
    }

    /**
     * Create HTTP server with load balancing
     */
    createServer(port = 8080) {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(port, () => {
            console.log(`[Load Balancer] Server listening on port ${port}`);
        });

        return server;
    }
}

module.exports = new LoadBalancerService();
