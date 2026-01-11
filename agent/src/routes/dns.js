const express = require('express');
const router = express.Router();
const powerDNS = require('../services/PowerDNSService');
const { requireAgentAuth } = require('../middleware/auth');

/**
 * GET /api/dns/status
 * Get DNS service status
 */
router.get('/status', requireAgentAuth, async (req, res) => {
    try {
        const status = await powerDNS.getStatus();
        const stats = await powerDNS.getStatistics();

        res.json({
            ...status,
            statistics: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dns/sync-zone
 * Sync a zone to this DNS server
 */
router.post('/sync-zone', requireAgentAuth, async (req, res) => {
    try {
        const { zone, records } = req.body;

        if (!zone || !zone.id) {
            return res.status(400).json({ error: 'Zone data is required' });
        }

        // Sync zone to PowerDNS
        const result = await powerDNS.syncZone(zone.id);

        res.json({
            success: true,
            message: `Zone ${zone.domain} synced successfully`,
            domainId: result.domainId,
            recordCount: records ? records.length : 0
        });
    } catch (error) {
        console.error('[Agent DNS] Sync zone error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/dns/zones/:zoneName
 * Delete a zone from this DNS server
 */
router.delete('/zones/:zoneName', requireAgentAuth, async (req, res) => {
    try {
        const zoneName = decodeURIComponent(req.params.zoneName);

        await powerDNS.deleteZone(zoneName);

        res.json({
            success: true,
            message: `Zone ${zoneName} deleted successfully`
        });
    } catch (error) {
        console.error('[Agent DNS] Delete zone error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dns/zones/:zoneName/notify
 * Notify PowerDNS to reload a zone
 */
router.post('/zones/:zoneName/notify', requireAgentAuth, async (req, res) => {
    try {
        const zoneName = decodeURIComponent(req.params.zoneName);

        await powerDNS.notifyZone(zoneName);

        res.json({
            success: true,
            message: `Zone ${zoneName} notified successfully`
        });
    } catch (error) {
        console.error('[Agent DNS] Notify zone error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dns/zones/:zoneName/dnssec
 * Enable DNSSEC for a zone
 */
router.post('/zones/:zoneName/dnssec', requireAgentAuth, async (req, res) => {
    try {
        const zoneName = decodeURIComponent(req.params.zoneName);

        const result = await powerDNS.enableDNSSEC(zoneName);

        res.json({
            success: true,
            message: `DNSSEC enabled for ${zoneName}`,
            ...result
        });
    } catch (error) {
        console.error('[Agent DNS] DNSSEC error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dns/statistics
 * Get DNS statistics
 */
router.get('/statistics', requireAgentAuth, async (req, res) => {
    try {
        const stats = await powerDNS.getStatistics();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dns/initialize
 * Initialize PowerDNS service
 */
router.post('/initialize', requireAgentAuth, async (req, res) => {
    try {
        const initialized = await powerDNS.initialize();

        res.json({
            success: initialized,
            message: initialized
                ? 'PowerDNS initialized successfully'
                : 'PowerDNS initialization failed'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
