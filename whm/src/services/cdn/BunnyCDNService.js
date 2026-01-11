const axios = require('axios');

/**
 * BunnyCDN Service
 * Manages BunnyCDN integration for content delivery
 */
class BunnyCDNService {
    constructor() {
        this.apiKey = process.env.BUNNYCDN_API_KEY || '';
        this.storageApiKey = process.env.BUNNYCDN_STORAGE_API_KEY || '';
        this.baseURL = 'https://api.bunny.net';
        this.storageURL = 'https://storage.bunnycdn.com';
        this.initialized = false;
    }

    /**
     * Initialize BunnyCDN service
     */
    async initialize() {
        try {
            if (!this.apiKey) {
                console.warn('[BunnyCDN] API key not configured');
                return false;
            }

            this.initialized = true;
            console.log('[BunnyCDN] Service initialized');
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Make API request
     */
    async request(method, endpoint, data = null, useStorage = false) {
        try {
            const config = {
                method,
                url: `${useStorage ? this.storageURL : this.baseURL}${endpoint}`,
                headers: {
                    'AccessKey': useStorage ? this.storageApiKey : this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('[BunnyCDN] API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * List pull zones
     */
    async listPullZones() {
        try {
            const zones = await this.request('GET', '/pullzone');
            return zones || [];
        } catch (error) {
            console.error('[BunnyCDN] List pull zones error:', error.message);
            return [];
        }
    }

    /**
     * Get pull zone
     */
    async getPullZone(zoneId) {
        try {
            const zone = await this.request('GET', `/pullzone/${zoneId}`);
            return zone;
        } catch (error) {
            console.error('[BunnyCDN] Get pull zone error:', error.message);
            return null;
        }
    }

    /**
     * Create pull zone
     */
    async createPullZone(name, originUrl, options = {}) {
        try {
            const data = {
                Name: name,
                OriginUrl: originUrl,
                Type: options.type || 0, // 0 = Standard, 1 = Volume
                StorageZoneId: options.storageZoneId || null,
                EnableGeoZoneUS: options.enableUS !== false,
                EnableGeoZoneEU: options.enableEU !== false,
                EnableGeoZoneASIA: options.enableASIA !== false,
                EnableGeoZoneSA: options.enableSA || false,
                EnableGeoZoneAF: options.enableAF || false,
                CacheControlMaxAgeOverride: options.cacheMaxAge || 0,
                AddHostHeader: options.addHostHeader || false,
                EnableCacheSlice: options.enableCacheSlice || false,
                EnableLogging: options.enableLogging || true
            };

            const zone = await this.request('POST', '/pullzone', data);
            console.log(`[BunnyCDN] Pull zone created: ${name}`);
            return zone;
        } catch (error) {
            console.error('[BunnyCDN] Create pull zone error:', error.message);
            throw error;
        }
    }

    /**
     * Update pull zone
     */
    async updatePullZone(zoneId, updates) {
        try {
            const zone = await this.request('POST', `/pullzone/${zoneId}`, updates);
            console.log(`[BunnyCDN] Pull zone updated: ${zoneId}`);
            return zone;
        } catch (error) {
            console.error('[BunnyCDN] Update pull zone error:', error.message);
            throw error;
        }
    }

    /**
     * Delete pull zone
     */
    async deletePullZone(zoneId) {
        try {
            await this.request('DELETE', `/pullzone/${zoneId}`);
            console.log(`[BunnyCDN] Pull zone deleted: ${zoneId}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Delete pull zone error:', error.message);
            return false;
        }
    }

    /**
     * Purge cache
     */
    async purgeCache(zoneId) {
        try {
            await this.request('POST', `/pullzone/${zoneId}/purgeCache`);
            console.log(`[BunnyCDN] Cache purged for zone: ${zoneId}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Purge cache error:', error.message);
            return false;
        }
    }

    /**
     * Purge URL from cache
     */
    async purgeURL(url) {
        try {
            await this.request('POST', '/purge', { url });
            console.log(`[BunnyCDN] URL purged: ${url}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Purge URL error:', error.message);
            return false;
        }
    }

    /**
     * Get pull zone statistics
     */
    async getStatistics(zoneId, dateFrom = null, dateTo = null) {
        try {
            let endpoint = `/pullzone/${zoneId}/statistics`;

            if (dateFrom && dateTo) {
                endpoint += `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
            }

            const stats = await this.request('GET', endpoint);
            return stats;
        } catch (error) {
            console.error('[BunnyCDN] Get statistics error:', error.message);
            return null;
        }
    }

    /**
     * List storage zones
     */
    async listStorageZones() {
        try {
            const zones = await this.request('GET', '/storagezone');
            return zones || [];
        } catch (error) {
            console.error('[BunnyCDN] List storage zones error:', error.message);
            return [];
        }
    }

    /**
     * Create storage zone
     */
    async createStorageZone(name, region = 'DE') {
        try {
            const data = {
                Name: name,
                Region: region // DE, NY, LA, SG, SYD
            };

            const zone = await this.request('POST', '/storagezone', data);
            console.log(`[BunnyCDN] Storage zone created: ${name}`);
            return zone;
        } catch (error) {
            console.error('[BunnyCDN] Create storage zone error:', error.message);
            throw error;
        }
    }

    /**
     * Delete storage zone
     */
    async deleteStorageZone(zoneId) {
        try {
            await this.request('DELETE', `/storagezone/${zoneId}`);
            console.log(`[BunnyCDN] Storage zone deleted: ${zoneId}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Delete storage zone error:', error.message);
            return false;
        }
    }

    /**
     * Upload file to storage
     */
    async uploadFile(storageZoneName, path, fileBuffer) {
        try {
            const config = {
                method: 'PUT',
                url: `${this.storageURL}/${storageZoneName}/${path}`,
                headers: {
                    'AccessKey': this.storageApiKey,
                    'Content-Type': 'application/octet-stream'
                },
                data: fileBuffer
            };

            await axios(config);
            console.log(`[BunnyCDN] File uploaded: ${path}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Upload file error:', error.message);
            return false;
        }
    }

    /**
     * Delete file from storage
     */
    async deleteFile(storageZoneName, path) {
        try {
            const config = {
                method: 'DELETE',
                url: `${this.storageURL}/${storageZoneName}/${path}`,
                headers: {
                    'AccessKey': this.storageApiKey
                }
            };

            await axios(config);
            console.log(`[BunnyCDN] File deleted: ${path}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Delete file error:', error.message);
            return false;
        }
    }

    /**
     * List files in storage
     */
    async listFiles(storageZoneName, path = '/') {
        try {
            const config = {
                method: 'GET',
                url: `${this.storageURL}/${storageZoneName}/${path}`,
                headers: {
                    'AccessKey': this.storageApiKey
                }
            };

            const response = await axios(config);
            return response.data || [];
        } catch (error) {
            console.error('[BunnyCDN] List files error:', error.message);
            return [];
        }
    }

    /**
     * Add custom hostname
     */
    async addCustomHostname(zoneId, hostname) {
        try {
            const data = { Hostname: hostname };
            await this.request('POST', `/pullzone/${zoneId}/addHostname`, data);
            console.log(`[BunnyCDN] Custom hostname added: ${hostname}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Add hostname error:', error.message);
            return false;
        }
    }

    /**
     * Remove custom hostname
     */
    async removeCustomHostname(zoneId, hostname) {
        try {
            const data = { Hostname: hostname };
            await this.request('DELETE', `/pullzone/${zoneId}/removeHostname`, data);
            console.log(`[BunnyCDN] Custom hostname removed: ${hostname}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Remove hostname error:', error.message);
            return false;
        }
    }

    /**
     * Add free SSL certificate
     */
    async addFreeCertificate(hostname) {
        try {
            const data = { Hostname: hostname };
            await this.request('POST', '/pullzone/loadFreeCertificate', data);
            console.log(`[BunnyCDN] Free SSL certificate added: ${hostname}`);
            return true;
        } catch (error) {
            console.error('[BunnyCDN] Add certificate error:', error.message);
            return false;
        }
    }

    /**
     * Get billing summary
     */
    async getBillingSummary() {
        try {
            const summary = await this.request('GET', '/billing');
            return summary;
        } catch (error) {
            console.error('[BunnyCDN] Get billing error:', error.message);
            return null;
        }
    }
}

module.exports = new BunnyCDNService();
