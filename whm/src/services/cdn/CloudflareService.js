const axios = require('axios');

/**
 * Cloudflare CDN Service
 * Manages Cloudflare integration for CDN and security
 */
class CloudflareService {
    constructor() {
        this.apiKey = process.env.CLOUDFLARE_API_KEY || '';
        this.email = process.env.CLOUDFLARE_EMAIL || '';
        this.baseURL = 'https://api.cloudflare.com/client/v4';
        this.initialized = false;
    }

    /**
     * Initialize Cloudflare service
     */
    async initialize() {
        try {
            if (!this.apiKey || !this.email) {
                console.warn('[Cloudflare] API credentials not configured');
                return false;
            }

            // Verify credentials
            const verified = await this.verifyCredentials();
            if (verified) {
                this.initialized = true;
                console.log('[Cloudflare] Service initialized');
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Cloudflare] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Verify API credentials
     */
    async verifyCredentials() {
        try {
            const response = await this.request('GET', '/user/tokens/verify');
            return response.success;
        } catch (error) {
            console.error('[Cloudflare] Credential verification failed:', error.message);
            return false;
        }
    }

    /**
     * Make API request
     */
    async request(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'X-Auth-Email': this.email,
                    'X-Auth-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('[Cloudflare] API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * List zones
     */
    async listZones() {
        try {
            const response = await this.request('GET', '/zones');
            return response.result || [];
        } catch (error) {
            console.error('[Cloudflare] List zones error:', error.message);
            return [];
        }
    }

    /**
     * Get zone by domain
     */
    async getZone(domain) {
        try {
            const response = await this.request('GET', `/zones?name=${domain}`);
            return response.result?.[0] || null;
        } catch (error) {
            console.error('[Cloudflare] Get zone error:', error.message);
            return null;
        }
    }

    /**
     * Create zone
     */
    async createZone(domain) {
        try {
            const response = await this.request('POST', '/zones', {
                name: domain,
                jump_start: true
            });

            console.log(`[Cloudflare] Zone created: ${domain}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Create zone error:', error.message);
            throw error;
        }
    }

    /**
     * Delete zone
     */
    async deleteZone(zoneId) {
        try {
            await this.request('DELETE', `/zones/${zoneId}`);
            console.log(`[Cloudflare] Zone deleted: ${zoneId}`);
            return true;
        } catch (error) {
            console.error('[Cloudflare] Delete zone error:', error.message);
            return false;
        }
    }

    /**
     * Purge cache
     */
    async purgeCache(zoneId, options = {}) {
        try {
            const data = options.purgeEverything
                ? { purge_everything: true }
                : { files: options.files || [] };

            await this.request('POST', `/zones/${zoneId}/purge_cache`, data);
            console.log(`[Cloudflare] Cache purged for zone: ${zoneId}`);
            return true;
        } catch (error) {
            console.error('[Cloudflare] Purge cache error:', error.message);
            return false;
        }
    }

    /**
     * Get cache settings
     */
    async getCacheSettings(zoneId) {
        try {
            const response = await this.request('GET', `/zones/${zoneId}/settings/cache_level`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Get cache settings error:', error.message);
            return null;
        }
    }

    /**
     * Update cache settings
     */
    async updateCacheSettings(zoneId, level) {
        try {
            const response = await this.request('PATCH', `/zones/${zoneId}/settings/cache_level`, {
                value: level // 'aggressive', 'basic', 'simplified'
            });

            console.log(`[Cloudflare] Cache settings updated: ${level}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Update cache settings error:', error.message);
            throw error;
        }
    }

    /**
     * Get SSL settings
     */
    async getSSLSettings(zoneId) {
        try {
            const response = await this.request('GET', `/zones/${zoneId}/settings/ssl`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Get SSL settings error:', error.message);
            return null;
        }
    }

    /**
     * Update SSL settings
     */
    async updateSSLSettings(zoneId, mode) {
        try {
            const response = await this.request('PATCH', `/zones/${zoneId}/settings/ssl`, {
                value: mode // 'off', 'flexible', 'full', 'strict'
            });

            console.log(`[Cloudflare] SSL settings updated: ${mode}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Update SSL settings error:', error.message);
            throw error;
        }
    }

    /**
     * Get firewall rules
     */
    async getFirewallRules(zoneId) {
        try {
            const response = await this.request('GET', `/zones/${zoneId}/firewall/rules`);
            return response.result || [];
        } catch (error) {
            console.error('[Cloudflare] Get firewall rules error:', error.message);
            return [];
        }
    }

    /**
     * Create firewall rule
     */
    async createFirewallRule(zoneId, rule) {
        try {
            const response = await this.request('POST', `/zones/${zoneId}/firewall/rules`, [rule]);
            console.log(`[Cloudflare] Firewall rule created`);
            return response.result?.[0];
        } catch (error) {
            console.error('[Cloudflare] Create firewall rule error:', error.message);
            throw error;
        }
    }

    /**
     * Get analytics
     */
    async getAnalytics(zoneId, since = -10080) {
        try {
            const response = await this.request('GET', `/zones/${zoneId}/analytics/dashboard?since=${since}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Get analytics error:', error.message);
            return null;
        }
    }

    /**
     * Get DNS records
     */
    async getDNSRecords(zoneId) {
        try {
            const response = await this.request('GET', `/zones/${zoneId}/dns_records`);
            return response.result || [];
        } catch (error) {
            console.error('[Cloudflare] Get DNS records error:', error.message);
            return [];
        }
    }

    /**
     * Create DNS record
     */
    async createDNSRecord(zoneId, record) {
        try {
            const response = await this.request('POST', `/zones/${zoneId}/dns_records`, record);
            console.log(`[Cloudflare] DNS record created: ${record.name}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Create DNS record error:', error.message);
            throw error;
        }
    }

    /**
     * Update DNS record
     */
    async updateDNSRecord(zoneId, recordId, record) {
        try {
            const response = await this.request('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record);
            console.log(`[Cloudflare] DNS record updated: ${recordId}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Update DNS record error:', error.message);
            throw error;
        }
    }

    /**
     * Delete DNS record
     */
    async deleteDNSRecord(zoneId, recordId) {
        try {
            await this.request('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
            console.log(`[Cloudflare] DNS record deleted: ${recordId}`);
            return true;
        } catch (error) {
            console.error('[Cloudflare] Delete DNS record error:', error.message);
            return false;
        }
    }

    /**
     * Enable development mode
     */
    async setDevelopmentMode(zoneId, enabled) {
        try {
            const response = await this.request('PATCH', `/zones/${zoneId}/settings/development_mode`, {
                value: enabled ? 'on' : 'off'
            });

            console.log(`[Cloudflare] Development mode: ${enabled ? 'enabled' : 'disabled'}`);
            return response.result;
        } catch (error) {
            console.error('[Cloudflare] Development mode error:', error.message);
            throw error;
        }
    }

    /**
     * Get zone statistics
     */
    async getZoneStats(zoneId) {
        try {
            const [analytics, settings] = await Promise.all([
                this.getAnalytics(zoneId),
                this.getCacheSettings(zoneId)
            ]);

            return {
                analytics,
                cacheLevel: settings?.value,
                requests: analytics?.totals?.requests?.all || 0,
                bandwidth: analytics?.totals?.bandwidth?.all || 0,
                threats: analytics?.totals?.threats?.all || 0
            };
        } catch (error) {
            console.error('[Cloudflare] Get zone stats error:', error.message);
            return null;
        }
    }
}

module.exports = new CloudflareService();
