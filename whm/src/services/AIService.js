const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.model = 'gemini-pro';
        this.knowledgeBase = '';
        this.lastLoad = 0;
    }

    /**
     * Load FAQ and system context from markdown files
     */
    async loadKnowledgeBase() {
        try {
            // Cache knowledge base for 10 minutes
            if (Date.now() - this.lastLoad < 600000 && this.knowledgeBase) return;

            const docsPath = path.join(__dirname, '../../../docs');
            let content = 'YUMNA PANEL KNOWLEDGE BASE:\n\n';

            // Recursive function to load all .md files
            const loadDocsRecursively = (dirPath) => {
                if (!fs.existsSync(dirPath)) return;

                const items = fs.readdirSync(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stats = fs.statSync(fullPath);

                    if (stats.isDirectory()) {
                        // Skip reports/sessions folders to avoid bloat, but include guides/features/security
                        if (['guides', 'features', 'security'].includes(item)) {
                            loadDocsRecursively(fullPath);
                        }
                    } else if (item.endsWith('.md')) {
                        const data = fs.readFileSync(fullPath, 'utf8');
                        const relativePath = path.relative(docsPath, fullPath);
                        content += `--- FILE: ${relativePath} ---\n${data}\n\n`;
                    }
                }
            };

            // First load root docs
            const rootFiles = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));
            for (const file of rootFiles) {
                const data = fs.readFileSync(path.join(docsPath, file), 'utf8');
                content += `--- FILE: ${file} ---\n${data}\n\n`;
            }

            // Then load important subdirectories
            loadDocsRecursively(path.join(docsPath, 'features'));
            loadDocsRecursively(path.join(docsPath, 'guides'));
            loadDocsRecursively(path.join(docsPath, 'security'));

            this.knowledgeBase = content;
            this.lastLoad = Date.now();
            console.log(`[AI] Knowledge base loaded (${this.knowledgeBase.length} bytes from ${content.split('--- FILE:').length - 1} documents)`);
        } catch (err) {
            console.error('[AI] Failed to load knowledge base:', err.message);
        }
    }

    /**
     * General purpose AI Chat / Troubleshooting
     */
    async ask(prompt, context = '') {
        await this.loadKnowledgeBase();

        if (!this.apiKey) {
            console.log('[AI] API Key missing, entering offline search mode...');
            return this.localSearch(prompt);
        }

        try {
            const systemContext = `
You are the Yumna AI Assistant, a helpful and expert technical support for YumnaPanel v3.
Use the following Knowledge Base to answer user questions about the panel. 
If the answer is not in the knowledge base, use your general expertise but prefer the panel's specific way of doing things.
Always respond in the same language as the user (Indonesian/English).

---
${this.knowledgeBase}
---

User Context: ${context}
`;

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                contents: [{
                    parts: [{
                        text: `${systemContext}\n\nQuestion: ${prompt}\n\nAssistant:`
                    }]
                }]
            });

            const answer = response.data.candidates[0].content.parts[0].text;
            return {
                answer,
                suggestions: this.getRelatedSuggestions(answer)
            };
        } catch (err) {
            console.error('[AI] Gemini API Error:', err.response?.data || err.message);
            return {
                answer: "I encountered an error while processing your request. Please try again later.",
                suggestions: ["Bagaimana cara tambah website?", "Lupa password admin?"]
            };
        }
    }

    getRelatedSuggestions(text = '') {
        const textLower = text.toLowerCase();

        // Topic-based suggestion groups
        const groups = {
            website: ['Ganti versi PHP?', 'Instal SSL?', 'Apa itu Hybrid Stack?', 'Deployment Node.js/Python?'],
            email: ['Akses Webmail?', 'Setup SPF, DKIM, DMARC?', 'Cara buat akun Email?', 'Setup DNS Cluster?'],
            security: ['Apa itu FraudGuard?', 'Bagaimana caraa setup Firewall?', 'Blokir IP mencurigakan?', 'Instal SSL?'],
            database: ['Cara Remote Database?', 'Akses phpMyAdmin?', 'Buat database baru?', 'Backup Database?'],
            file: ['Upload file cepat?', 'Cara kompres ZIP?', 'Setup akun FTP?', 'Panduan File Operations?'],
            dns: ['Cara setup DNS Cluster?', 'Atur Nameserver?', 'Apa itu SPF & DKIM?'],
            backup: ['Backup ke Google Drive/S3?', 'Restore data website?', 'Auto-backup harian?'],
            multi: ['Setup Multi-Server Integration?', 'Apa itu Agent Node?', 'Apa itu Reverse Tunnel?']
        };

        let suggestions = [];

        // 1. Detect Topic from the answer text
        if (textLower.includes('website') || textLower.includes('domain') || textLower.includes('php')) {
            suggestions = groups.website;
        } else if (textLower.includes('email') || textLower.includes('mail')) {
            suggestions = groups.email;
        } else if (textLower.includes('security') || textLower.includes('ssl') || textLower.includes('fraud') || textLower.includes('firewall')) {
            suggestions = groups.security;
        } else if (textLower.includes('database') || textLower.includes('sql') || textLower.includes('phpmyadmin')) {
            suggestions = groups.database;
        } else if (textLower.includes('file') || textLower.includes('explorer') || textLower.includes('ftp')) {
            suggestions = groups.file;
        } else if (textLower.includes('dns') || textLower.includes('nameserver')) {
            suggestions = groups.dns;
        } else if (textLower.includes('backup')) {
            suggestions = groups.backup;
        } else if (textLower.includes('multi') || textLower.includes('node') || textLower.includes('agent')) {
            suggestions = groups.multi;
        }

        // 2. If no topic detected, or to fill space, use general high-quality suggestions
        const defaults = ['Cara tambah website?', 'Instal SSL?', 'Lupa password admin?', 'Setup DNS Cluster?'];

        // Merge and clean up
        const combined = [...new Set([...suggestions, ...defaults])];

        // Filter out suggestions that are too similar to the text (to avoid repeating just answered question)
        return combined
            .filter(s => {
                const sLower = s.toLowerCase();
                // If the suggestion text is actually in the answer, it's probably what we just answered
                // We want to suggest NEXT steps, not SAME steps.
                return !textLower.includes(sLower.replace('?', ''));
            })
            .slice(0, 4); // Show up to 4 related pills
    }

    /**
     * Smart Code Review for Git Deployments
     */
    async reviewCode(codeSnippet) {
        const prompt = `Perform a security and performance code review on the following code. Identify vulnerabilities like SQL injection, XSS, or memory leaks. Provide suggestions in a concise format.\n\nCode:\n${codeSnippet}`;
        const res = await this.ask(prompt, 'System: Security Auditor');
        return typeof res === 'string' ? res : res.answer;
    }

    /**
     * Heuristic Scaling Prediction
     */
    async predictResourceNeeds(historyData) {
        const prompt = `Based on these last 24h metrics: ${JSON.stringify(historyData)}. Predict if the server will need more RAM or CPU in the next 12 hours. Answer with a confidence score and recommendation.`;
        const res = await this.ask(prompt, 'System: Infrastructure Planner');
        return typeof res === 'string' ? res : res.answer;
    }

    /**
     * Heuristic Local Search (Offline Mode)
     * Finds the most relevant section in the Knowledge Base based on keywords
     */
    localSearch(prompt) {
        if (!this.knowledgeBase) return { answer: "Maaf, basis pengetahuan belum dimuat.", suggestions: [] };

        const query = prompt.toLowerCase();
        const queryWords = query.split(/\s+/).filter(w => w.length >= 2);

        // Split KB by files
        const fileSections = this.knowledgeBase.split('--- FILE: ');
        let allMatches = [];

        for (const fileSection of fileSections) {
            if (!fileSection.trim()) continue;

            const lines = fileSection.split('\n');
            const fileName = lines[0].replace(' ---', '').trim();
            const content = lines.slice(1).join('\n');

            // Split file into document blocks by Markdown headers (e.g. ##)
            const blocks = content.split(/(?=^#+ )/m);

            for (const block of blocks) {
                if (!block.trim()) continue;

                let score = 0;
                const blockLower = block.toLowerCase();
                const blockLines = block.split('\n');
                const title = blockLines[0].toLowerCase();

                // 1. Exact phrase boost
                if (blockLower.includes(query)) score += 40;

                // 2. Headings match boost
                for (const word of queryWords) {
                    if (title.includes(word)) score += 15;

                    // 3. Keyword occurrence
                    const matches = blockLower.match(new RegExp(word, 'gi'));
                    if (matches) score += matches.length * 2;
                }

                // 4. Document source boost (FAQ is highest quality for questions)
                if (fileName.includes('FAQ')) score += 10;

                if (score > 10) {
                    allMatches.push({
                        fileName,
                        title: blockLines[0].replace(/^#+\s+/, ''),
                        text: block.trim(),
                        score
                    });
                }
            }
        }

        // Sort by relevance
        allMatches.sort((a, b) => b.score - a.score);

        if (allMatches.length > 0) {
            const best = allMatches[0];
            let finalOutput = best.text;

            // Smart Extraction for FAQ patterns (**Q: and A:)
            const qnaBlocks = best.text.split(/(?=\*\*Q:)/g);
            if (qnaBlocks.length > 1) {
                let bestQna = null, bestQnaScore = 0;
                for (const qna of qnaBlocks) {
                    let qnaScore = 0;
                    const qnaLower = qna.toLowerCase();
                    for (const word of queryWords) { if (qnaLower.includes(word)) qnaScore++; }
                    if (qnaScore > bestQnaScore) { bestQnaScore = qnaScore; bestQna = qna; }
                }
                if (bestQna && bestQnaScore > 0) finalOutput = bestQna.trim();
            }

            // Clean formatting
            finalOutput = finalOutput.replace(/\*\*/g, '');
            finalOutput = finalOutput.replace(/Q: /g, '\nQ: ');
            finalOutput = finalOutput.replace(/ A: /g, '\n\nA: ');
            finalOutput = finalOutput.trim();

            const textLines = finalOutput.split('\n');
            const summary = textLines.slice(0, 15).join('\n');
            const tail = textLines.length > 15 ? '\n\n*(Lanjut di dokumen...)*' : '';

            return {
                answer: `${summary}${tail}`,
                suggestions: this.getRelatedSuggestions(finalOutput)
            };
        }

        return {
            answer: "Maaf, saya tidak menemukan jawaban yang spesifik di dokumentasi offline. Coba gunakan kata kunci lain.",
            suggestions: ["Bagaimana cara tambah website?", "Cara instal SSL?", "Lupa password admin?"]
        };
    }
}

module.exports = new AIService();
