const express = require('express');
const router = express.Router();
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { listDirectoryRecursive } = require('../../core/sftp');
const { logActivity } = require('../../utils/logger');
const pdfParserEngine = require('pdf-parse');

// Search Endpoint
router.get('/search', getSession, async (req, res) => {
    const { query, type: searchType, path } = req.query; // 'type' is reserved in some frameworks, using safe variable
    const searchPath = sanitizePath(path || '/');

    if (!query) return res.json([]);

    try {
        // 1. Get all files recursively (up to reasonable depth)
        // Note: listDirectoryRecursive inside sftp.js should handle depth limits
        const allFiles = await listDirectoryRecursive(req.sftp, searchPath, 15);

        let results = [];

        if (searchType === 'content') {
            // Content Search (Deep Search)
            // Filter candidates: txt, log, code files
            const textExtensions = ['txt', 'log', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'php', 'py', 'java', 'xml', 'csv', 'sql', 'env', 'yml', 'yaml', 'ini', 'conf'];

            for (const file of allFiles) {
                if (file.type !== 'file') continue;

                const ext = file.name.split('.').pop().toLowerCase();
                let isMatch = false;
                let matchCount = 0;

                try {
                    if (textExtensions.includes(ext)) {
                        const stream = req.sftp.createReadStream(file.path);
                        const chunks = [];
                        await new Promise((resolve, reject) => {
                            stream.on('data', c => chunks.push(c));
                            stream.on('end', resolve);
                            stream.on('error', reject);
                        });
                        // Limit buffer size to avoid OOM on huge files? 
                        // For now assuming reasonable file sizes or Node will handle it.
                        // Ideally we should stream scan, but for simplicity read to buffer.
                        const content = Buffer.concat(chunks).toString('utf8');
                        const lowerContent = content.toLowerCase();
                        const lowerQuery = query.toLowerCase();

                        if (lowerContent.includes(lowerQuery)) {
                            isMatch = true;
                            // Count occurrences
                            matchCount = (lowerContent.match(new RegExp(lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                        }
                    } else if (ext === 'pdf') {
                        const stream = req.sftp.createReadStream(file.path);
                        const chunks = [];
                        await new Promise((resolve, reject) => {
                            stream.on('data', c => chunks.push(c));
                            stream.on('end', resolve);
                            stream.on('error', reject);
                        });
                        const data = await pdfParserEngine(Buffer.concat(chunks));
                        if (data.text) {
                            const lowerText = data.text.toLowerCase();
                            const lowerQuery = query.toLowerCase();
                            if (lowerText.includes(lowerQuery)) {
                                isMatch = true;
                                matchCount = (lowerText.match(new RegExp(lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                            }
                        }
                    }
                } catch (err) {
                    // Ignore read errors
                }

                if (isMatch) {
                    results.push({ ...file, matchCount });
                }
            }
            results.sort((a, b) => b.matchCount - a.matchCount);

        } else {
            // Filename Search (Global)
            // Default behavior: search by name
            results = allFiles.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
        }

        logActivity(req.sessionData.userId, 'search', `Searched for "${query}" (type: ${searchType || 'name'}) in ${searchPath}`, req);
        res.json(results);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
