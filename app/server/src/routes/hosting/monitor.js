const express = require('express');
const router = express.Router();
const ResourceMonitoringService = require('../../services/ResourceMonitoringService');
const { requireAuth } = require('../../middleware/auth');
const PerformanceService = require('../../services/PerformanceService');
const AlertService = require('../../services/AlertService');
const LogAnalysisService = require('../../services/LogAnalysisService');
const DatabaseMonitorService = require('../../services/DatabaseMonitorService');

router.get('/monitor/realtime', requireAuth, async (req, res) => {
    try {
        const stats = await ResourceMonitoringService.getRealtime();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/mysql/slow-queries', requireAuth, async (req, res) => {
    try {
        const queries = await DatabaseMonitorService.getSlowQueries();
        res.json(queries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/mysql/tables', requireAuth, async (req, res) => {
    try {
        const tables = await DatabaseMonitorService.getTableStats();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/monitor/performance', requireAuth, async (req, res) => {
    try {
        const recommendations = await PerformanceService.getRecommendations();
        const score = await PerformanceService.getPerformanceScore();
        res.json({ recommendations, score });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/alerts/config', requireAuth, async (req, res) => {
    try {
        const configs = await AlertService.getAlertConfigs();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/monitor/alerts/config', requireAuth, async (req, res) => {
    const { metric, threshold, enabled, severity } = req.body;
    try {
        await AlertService.updateConfig(metric, threshold, enabled, severity);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/alerts/active', requireAuth, async (req, res) => {
    try {
        const alerts = await AlertService.getActiveAlerts();
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/monitor/alerts/dismiss/:id', requireAuth, async (req, res) => {
    try {
        await AlertService.dismissAlert(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/logs', requireAuth, async (req, res) => {
    const { domain, type } = req.query;
    try {
        const logs = await LogAnalysisService.getRecentLogs(domain || 'error', type || 'error');
        const analysis = await LogAnalysisService.analyzeLog(logs);
        res.json({ logs, analysis });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/history', requireAuth, async (req, res) => {
    const { websiteId, hours } = req.query;
    try {
        const history = await ResourceMonitoringService.getHistory(websiteId, hours || 24);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor/mysql', requireAuth, async (req, res) => {
    try {
        const stats = await ResourceMonitoringService.getMySQLStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
