const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';

/**
 * Require agent authentication
 */
const requireAgentAuth = (req, res, next) => {
    const token = req.headers['x-agent-secret'];

    if (!token || token !== AGENT_SECRET) {
        console.warn(`[AUTH] Unauthorized DNS access attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

module.exports = {
    requireAgentAuth
};
