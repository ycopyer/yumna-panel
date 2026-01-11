const express = require('express');
const router = express.Router();
const aiService = require('../services/AIService');
const { requireAuth } = require('../middleware/auth');

/**
 * AI TROUBLESHOOTING & CONTENT GENERATION
 */

// General Query
router.post('/ask', requireAuth, async (req, res) => {
    const { prompt, context } = req.body;
    try {
        const answer = await aiService.ask(prompt, context);
        res.json({ answer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Smart Code Review
router.post('/code-review', requireAuth, async (req, res) => {
    const { code } = req.body;
    try {
        const review = await aiService.reviewCode(code);
        res.json({ review });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
