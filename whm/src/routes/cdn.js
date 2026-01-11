const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const cloudflareService = require('../services/cdn/CloudflareService');
const bunnyCDNService = require('../services/cdn/BunnyCDNService');

/**
 * GET /api/cdn/cloudflare/zones
 * List Cloudflare zones
 */
router.get('/cloudflare/zones', requireAuth, requireAdmin, async (req, res) => {
    try {
        const zones = await cloudflareService.listZones();
        res.json({ success: true, zones });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/cdn/cloudflare/purge
 * Purge Cloudflare cache
 */
router.post('/cloudflare/purge', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { zoneId, files } = req.body;
        const result = await cloudflareService.purgeCache(zoneId, {
            purgeEverything: !files,
            files
        });
        res.json({ success: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/cdn/bunny/zones
 * List BunnyCDN zones
 */
router.get('/bunny/zones', requireAuth, requireAdmin, async (req, res) => {
    try {
        const zones = await bunnyCDNService.listPullZones();
        res.json({ success: true, zones });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/cdn/bunny/purge
 * Purge BunnyCDN cache
 */
router.post('/bunny/purge', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { zoneId, url } = req.body;
        let result;
        if (url) {
            result = await bunnyCDNService.purgeURL(url);
        } else {
            result = await bunnyCDNService.purgeCache(zoneId);
        }
        res.json({ success: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
