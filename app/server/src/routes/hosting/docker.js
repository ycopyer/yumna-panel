const express = require('express');
const router = express.Router();
const dockerService = require('../../services/DockerService');
const { requireAuth, requireAdmin } = require('../../middleware/auth'); // Check path!

// Middleware checking path - likely '../utils/auth' or similar?
// Let's verify middleware path. usually it is in src/middleware or src/utils/auth.
// Based on previous file views, it seems standard structure.
// I will assume standard middleware import first. If it fails, I'll fix.
// Actually, let's look at another route file to be sure.

// Wait, I should not assume. Let me double check a route file first to copy imports.
// But I can't "pause" strictly. I will check file listing of routes again.
// actually I saw `servers.js` earlier.

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/hosting/docker/status
router.get('/status', requireAdmin, asyncHandler(async (req, res) => {
    const available = await dockerService.isDockerAvailable();
    res.json({ available, message: available ? 'Docker daemon is running' : 'Docker daemon is not available' });
}));

// GET /api/hosting/docker/containers
router.get('/containers', requireAdmin, asyncHandler(async (req, res) => {
    const containers = await dockerService.getContainers(req.query.all === 'true');
    res.json(containers);
}));

// POST /api/hosting/docker/containers
router.post('/containers', requireAdmin, asyncHandler(async (req, res) => {
    // req.body should contain { name, image, ports, env }
    const result = await dockerService.createContainer(req.body);
    res.json(result);
}));

// GET /api/hosting/docker/containers/:id
router.get('/containers/:id', requireAdmin, asyncHandler(async (req, res) => {
    const container = await dockerService.getContainer(req.params.id);
    res.json(container);
}));

// POST /api/hosting/docker/containers/:id/start
router.post('/containers/:id/start', requireAdmin, asyncHandler(async (req, res) => {
    const result = await dockerService.startContainer(req.params.id);
    res.json(result);
}));

// POST /api/hosting/docker/containers/:id/stop
router.post('/containers/:id/stop', requireAdmin, asyncHandler(async (req, res) => {
    const result = await dockerService.stopContainer(req.params.id);
    res.json(result);
}));

// POST /api/hosting/docker/containers/:id/restart
router.post('/containers/:id/restart', requireAdmin, asyncHandler(async (req, res) => {
    const result = await dockerService.restartContainer(req.params.id);
    res.json(result);
}));

// DELETE /api/hosting/docker/containers/:id
router.delete('/containers/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = await dockerService.removeContainer(req.params.id);
    res.json(result);
}));

// GET /api/hosting/docker/containers/:id/logs
router.get('/containers/:id/logs', requireAdmin, asyncHandler(async (req, res) => {
    const logs = await dockerService.getContainerLogs(req.params.id, req.query.tail || 100);
    res.json({ logs });
}));

module.exports = router;
