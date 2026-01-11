const axios = require('axios');

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.model = 'gemini-pro';
    }

    /**
     * General purpose AI Chat / Troubleshooting
     */
    async ask(prompt, context = '') {
        if (!this.apiKey) {
            return "AI Support is currently in simulation mode. (Please set GEMINI_API_KEY in .env)";
        }

        try {
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                contents: [{
                    parts: [{
                        text: `Context: ${context}\n\nQuestion: ${prompt}\n\nAssistant: Let's solve this efficiently.`
                    }]
                }]
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error('[AI] Gemini API Error:', err.response?.data || err.message);
            return "I encountered an error while processing your request. Please try again later.";
        }
    }

    /**
     * Smart Code Review for Git Deployments
     */
    async reviewCode(codeSnippet) {
        const prompt = `Perform a security and performance code review on the following code. Identify vulnerabilities like SQL injection, XSS, or memory leaks. Provide suggestions in a concise format.\n\nCode:\n${codeSnippet}`;
        return this.ask(prompt, 'System: Security Auditor');
    }

    /**
     * Heuristic Scaling Prediction
     */
    async predictResourceNeeds(historyData) {
        const prompt = `Based on these last 24h metrics: ${JSON.stringify(historyData)}. Predict if the server will need more RAM or CPU in the next 12 hours. Answer with a confidence score and recommendation.`;
        return this.ask(prompt, 'System: Infrastructure Planner');
    }
}

module.exports = new AIService();
