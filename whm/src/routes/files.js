const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');
const tunnelManager = require('../services/TunnelManagerService');
const agentService = require('../services/AgentDispatcherService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const uploadSessions = new Map(); // uploadId -> { target, name, size, ... }

// GET /api/help - API Documentation
router.get('/help', requireAuth, async (req, res) => {
    const helpData = {
        version: "3.2.0",
        totalOperations: 28,
        endpoint: "/api/help",
        description: "YumnaPanel File Operations API - Complete reference for all available file operations",

        quickReference: {
            "List Files": "GET /api/ls?path=/path/to/directory",
            "Read File": "GET /api/read-content?path=/path/to/file.txt",
            "Write File": "PUT /api/save-content (body: {path, content})",
            "Download File": "GET /api/download?path=/file.zip&name=file.zip",
            "Create Backup": "POST /api/zip (body: {path, files, archiveName})",
            "Search Files": "GET /api/search?path=/dir&pattern=*.php",
            "Check Size": "GET /api/du?path=/directory"
        },

        categories: [
            {
                name: "Basic File Operations (7)",
                operations: [
                    { action: "ls", method: "GET", endpoint: "/api/ls?path=/dir", description: "List directory contents" },
                    { action: "read", method: "GET", endpoint: "/api/read-content?path=/file", description: "Read file content" },
                    { action: "write", method: "PUT", endpoint: "/api/save-content", body: "{path, content}", description: "Write file" },
                    { action: "mkdir", method: "POST", endpoint: "/api/mkdir", body: "{path}", description: "Create directory" },
                    { action: "delete", method: "DELETE", endpoint: "/api/delete?path=/file&recursive=true", description: "Delete file/folder" },
                    { action: "rename", method: "POST", endpoint: "/api/rename", body: "{oldPath, newPath}", description: "Rename/move" },
                    { action: "copy", method: "POST", endpoint: "/api/copy", body: "{sourcePath, destPath}", description: "Copy file/folder" }
                ]
            },
            {
                name: "File Information & Metadata (6)",
                operations: [
                    { action: "stat", method: "GET", endpoint: "/api/stat?path=/file", description: "Get file statistics" },
                    { action: "exists", method: "GET", endpoint: "/api/exists?path=/file", description: "Check if exists" },
                    { action: "touch", method: "POST", endpoint: "/api/touch", body: "{path}", description: "Create/update timestamp" },
                    { action: "du", method: "GET", endpoint: "/api/du?path=/dir", description: "Directory size" },
                    { action: "file_type", method: "GET", endpoint: "/api/file-type?path=/file", description: "Detect MIME type" },
                    { action: "checksum", method: "GET", endpoint: "/api/checksum?path=/file&algorithm=sha256", description: "Calculate checksum" }
                ]
            },
            {
                name: "Permissions & Ownership (2) - Unix/Linux",
                operations: [
                    { action: "chmod", method: "POST", endpoint: "/api/chmod", body: "{path, mode: '0755'}", description: "Change permissions" },
                    { action: "chown", method: "POST", endpoint: "/api/chown", body: "{path, uid, gid}", description: "Change ownership" }
                ]
            },
            {
                name: "Symbolic Links (2)",
                operations: [
                    { action: "symlink", method: "POST", endpoint: "/api/symlink", body: "{path, target}", description: "Create symlink" },
                    { action: "readlink", method: "GET", endpoint: "/api/readlink?path=/link", description: "Read symlink target" }
                ]
            },
            {
                name: "Archive Operations (6)",
                operations: [
                    { action: "zip", method: "POST", endpoint: "/api/zip", body: "{path, files: [], archiveName}", description: "Create ZIP" },
                    { action: "unzip", method: "POST", endpoint: "/api/unzip", body: "{path, destination}", description: "Extract ZIP" },
                    { action: "tar", method: "POST", endpoint: "/api/tar", body: "{path, files: [], archiveName, compress: 'gzip'}", description: "Create TAR" },
                    { action: "untar", method: "POST", endpoint: "/api/untar", body: "{path, destination}", description: "Extract TAR" },
                    { action: "gzip", method: "POST", endpoint: "/api/gzip", body: "{path}", description: "Compress with gzip" },
                    { action: "gunzip", method: "POST", endpoint: "/api/gunzip", body: "{path}", description: "Decompress gzip" }
                ]
            },
            {
                name: "Search & Content (2)",
                operations: [
                    { action: "search", method: "GET", endpoint: "/api/search?path=/dir&pattern=*.php&maxDepth=5", description: "Search files by pattern" },
                    { action: "grep", method: "GET", endpoint: "/api/grep?path=/dir&query=text&recursive=true&ignoreCase=true", description: "Search file content" }
                ]
            },
            {
                name: "Transfer Operations (2)",
                operations: [
                    { action: "download", method: "GET", endpoint: "/api/download?path=/file&name=file.zip", description: "Download file (streaming)" },
                    { action: "upload", method: "POST", endpoint: "/api/upload/init, /chunk, /complete", description: "Upload file (chunked)" }
                ]
            }
        ],

        authentication: {
            required: true,
            method: "Bearer Token",
            header: "Authorization: Bearer <your-token>",
            note: "All endpoints require authentication"
        },

        modes: {
            tunnel: "Operations via WebSocket tunnel (for NAT/Firewall environments)",
            direct: "Operations via direct HTTP to agent",
            note: "Mode is automatically detected based on server configuration"
        },

        examples: {
            createBackup: {
                description: "Create a ZIP backup of website",
                request: "POST /api/zip",
                body: {
                    path: "/websites/example.com",
                    files: ["public_html", "config.php", ".htaccess"],
                    archiveName: "backup-2026-01-14.zip"
                },
                response: {
                    success: true,
                    archive: "/websites/example.com/backup-2026-01-14.zip"
                }
            },
            searchAndReplace: {
                description: "Find all PHP files containing specific text",
                request: "GET /api/grep?path=/websites/example.com&query=mysql_connect&recursive=true",
                response: {
                    matches: [
                        "config.php:15:$conn = mysql_connect($host, $user, $pass);",
                        "includes/db.php:8:// mysql_connect deprecated"
                    ],
                    count: 2
                }
            },
            diskAnalysis: {
                description: "Check directory sizes",
                request: "GET /api/du?path=/websites/example.com/uploads",
                response: {
                    bytes: 524288000,
                    human: "500 MB"
                }
            }
        },

        errorHandling: {
            format: "JSON",
            example: { error: "File not found" },
            statusCodes: {
                200: "Success",
                400: "Bad Request (invalid parameters)",
                401: "Unauthorized (missing/invalid token)",
                404: "Not Found (file/directory doesn't exist)",
                500: "Server Error"
            }
        },

        documentation: "For detailed documentation, see: docs/TUNNEL_FILE_TRANSFER_COMPLETE.md"
    };

    res.json(helpData);
});

// One-off Command Execution (Unified Logic)
router.post('/exec', requireAuth, async (req, res) => {
    const { command, cwd, path: targetPath, websiteId, serverId } = req.body;
    try {
        const target = await agentService.resolveTarget(req, { path: targetPath, websiteId, serverId });
        const result = await agentService.dispatchExec(target, command, {
            cwd,
            isAdmin: req.userRole === 'admin'
        });
        res.json({
            output: result.output || result.stdout || result.stderr || '',
            cwd: result.cwd
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ls
router.get('/ls', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const isAdmin = req.userRole === 'admin';

        if (targetPath === '/websites' || targetPath === '/websites/') {
            let query = 'SELECT domain FROM websites';
            let params = [];
            if (!isAdmin) {
                query += ' WHERE userId = ?';
                params.push(req.userId);
            }
            const [rows] = await pool.promise().query(query, params);
            return res.json(rows.map(r => ({
                name: r.domain, type: 'directory', size: 0,
                mtime: Math.floor(Date.now() / 1000), atime: Math.floor(Date.now() / 1000), birthTime: Date.now(),
                permissions: 0, uid: 0, gid: 0
            })));
        }

        const target = await agentService.resolveTarget(req, { path: targetPath || '/' });
        if (!target) {
            return res.status(404).json({ error: 'Target not found or access denied' });
        }
        console.log(`[FILES] Dispatching LS to ${target.agentUrl} (mode: ${target.mode}, root: ${target.root}, path: ${target.path})`);
        const response = await agentService.dispatchFileAction(target, 'ls');
        res.json(response);
    } catch (err) {
        console.error(`[FILES] LS Error for ${req.query.path}:`, err.message);
        const status = err.response?.status || 500;
        const errorMessage = err.response?.data?.error || err.message;

        // EMERGENCY DEBUG LOG
        try {
            const fs = require('fs');
            const debugLog = `[${new Date().toISOString()}] PATH: ${req.query.path} \nERROR: ${err.message} \nSTATUS: ${status} \nAGENT_MSG: ${JSON.stringify(err.response?.data)} \nSTACK: ${err.stack}\n\n`;
            fs.appendFileSync('c:/YumnaPanel/whm/ls_debug.log', debugLog);
        } catch (e) { }

        res.status(status).json({ error: errorMessage });
    }
});

router.get('/debug/ping-agent', requireAuth, async (req, res) => {
    const { domain } = req.query;
    try {
        const target = await agentService.resolveTarget(req, { path: `/websites/${domain}` });
        const client = axios.create({
            baseURL: target.agentUrl,
            headers: { 'X-Agent-Secret': target.agentSecret || agentService.AGENT_SECRET },
            timeout: 5000
        });
        const response = await client.get('/heartbeat');
        res.json({ target, agentResponse: response.data });
    } catch (err) {
        res.status(500).json({ error: err.message, target: err.target || 'unknown' });
    }
});
router.get('/download', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name } = req.query;
        const target = await agentService.resolveTarget(req, { path: targetPath || '/' });

        if (target.mode === 'tunnel') {
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            const requestId = uuidv4();
            tunnelManager.registerDownloadListener(requestId, res);

            // Fire and forget command, data comes back via streaming chunks
            tunnelManager.sendCommand(target.agentId, 'FILE_ACTION', {
                action: 'download_chunked',
                root: target.root,
                path: target.path
            }, requestId).catch(e => {
                // If start command fails before streaming starts
                if (!res.headersSent) res.status(500).json({ error: e.message });
            });
        } else {
            const client = axios.create({
                baseURL: target.agentUrl,
                headers: { 'X-Agent-Secret': process.env.AGENT_SECRET || 'insecure_default' },
                responseType: 'stream',
                timeout: 30000
            });
            try {
                const response = await client.get('/fs/download', { params: { root: target.root, path: target.path } });
                res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
                response.data.pipe(res);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        }
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// PUT /api/save-content
router.put('/save-content', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'write', { content: req.body.content });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/read-content
router.get('/read-content', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'read');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mkdir
router.post('/mkdir', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'mkdir');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/delete
router.delete('/delete', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'delete', { recursive: req.query.recursive === 'true' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rename
router.post('/rename', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.oldPath });
        const targetNew = await agentService.resolveTarget(req, { path: req.body.newPath });
        const result = await agentService.dispatchFileAction(target, 'rename', { newPath: targetNew.path });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/chmod - Change file permissions
router.post('/chmod', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'chmod', { mode: req.body.mode });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/copy - Copy file or directory
router.post('/copy', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.sourcePath });
        const targetDest = await agentService.resolveTarget(req, { path: req.body.destPath });
        const result = await agentService.dispatchFileAction(target, 'copy', { destPath: targetDest.path });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stat - Get detailed file statistics
router.get('/stat', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'stat');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/touch - Create empty file or update timestamp
router.post('/touch', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'touch');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/symlink - Create symbolic link
router.post('/symlink', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'symlink', { target: req.body.target });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/exists - Check if file exists
router.get('/exists', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'exists');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Archive Operations

// POST /api/zip - Create ZIP archive
router.post('/zip', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'zip', { files: req.body.files, archiveName: req.body.archiveName });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/unzip - Extract ZIP archive
router.post('/unzip', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'unzip', { destination: req.body.destination });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tar - Create TAR archive
router.post('/tar', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'tar', { files: req.body.files, archiveName: req.body.archiveName, compress: req.body.compress });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/untar - Extract TAR archive
router.post('/untar', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'untar', { destination: req.body.destination });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/gzip - Compress with gzip
router.post('/gzip', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'gzip');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/gunzip - Decompress gzip
router.post('/gunzip', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.body.path });
        const result = await agentService.dispatchFileAction(target, 'gunzip');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Utility Operations

// GET /api/search
router.get('/search', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'search', { pattern: req.query.pattern, maxDepth: req.query.maxDepth });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/grep
router.get('/grep', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'grep', { query: req.query.query, recursive: req.query.recursive === 'true', ignoreCase: req.query.ignoreCase === 'true' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/du
router.get('/du', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'du');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/file-type
router.get('/file-type', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'file_type');
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/checksum
router.get('/checksum', requireAuth, async (req, res) => {
    try {
        const target = await agentService.resolveTarget(req, { path: req.query.path });
        const result = await agentService.dispatchFileAction(target, 'checksum', { algorithm: req.query.algorithm });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Upload Logic (Chunked) ---

// 1. Initialize Upload
router.post('/upload/init', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name, size } = req.body;
        const target = await agentService.resolveTarget(req, { path: targetPath });
        const uploadId = uuidv4();

        await agentService.dispatchFileAction(target, 'upload_init', { name, size });

        uploadSessions.set(uploadId, { target, name, size, uploadedChunks: 0 });
        res.json({ uploadId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Upload Chunk
router.post('/upload/chunk', requireAuth, upload.single('chunk'), async (req, res) => {
    try {
        const { uploadId, index, totalChunks } = req.body;
        const session = uploadSessions.get(uploadId);
        if (!session) return res.status(404).json({ error: 'Upload session not found' });

        const base64Data = req.file.buffer.toString('base64');
        const target = session.target;

        await agentService.dispatchFileAction(target, 'upload_chunk', {
            uploadId,
            name: session.name,
            data: base64Data,
            index: parseInt(index),
            totalChunks: parseInt(totalChunks)
        });

        session.uploadedChunks++;
        res.json({ success: true, uploadedChunks: session.uploadedChunks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Complete Upload
router.post('/upload/complete', requireAuth, async (req, res) => {
    try {
        const { uploadId } = req.body;
        const session = uploadSessions.get(uploadId);
        if (!session) return res.status(404).json({ error: 'Upload session not found' });

        const target = session.target;
        await agentService.dispatchFileAction(target, 'upload_complete', { name: session.name });

        uploadSessions.delete(uploadId);
        res.json({ success: true, message: 'Upload completed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
