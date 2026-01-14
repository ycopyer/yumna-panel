const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const path = require('path');
const tunnelManager = require('../services/TunnelManagerService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const AGENT_SECRET = process.env.AGENT_SECRET || 'insecure_default';
const uploadSessions = new Map(); // uploadId -> { target, name, size, ... }

// Helper to get user's root path (Legacy/Local)
async function getUserRoot(userId, role, username) {
    if (role === 'admin') {
        const isWin = process.platform === 'win32';
        return isWin ? 'C:/YumnaPanel' : '/var/lib/yumnapanel';
    }
    const [rows] = await pool.promise().query('SELECT rootPath FROM sftp_configs WHERE userId = ?', [userId]);
    if (rows.length > 0 && rows[0].rootPath) return rows[0].rootPath;
    const isWin = process.platform === 'win32';
    return isWin ? `C:/YumnaPanel/users/${username}` : `/home/${username}/files`;
}

// Helper to resolve agent and root path for a target
async function resolveTarget(req, targetPath) {
    const isAdmin = req.userRole === 'admin';

    // 1. Handle Virtual Website Paths (/websites/domain/...)
    const websiteMatch = targetPath.match(/^\/websites\/([^\/]+)(.*)/);
    if (websiteMatch) {
        const domain = websiteMatch[1];
        const subPath = websiteMatch[2] || '/';

        let query = 'SELECT w.rootPath, s.ip, s.is_local, s.connection_type, s.agent_id FROM websites w JOIN servers s ON w.serverId = s.id WHERE w.domain = ?';
        let params = [domain];

        if (!isAdmin) {
            query += ' AND w.userId = ?';
            params.push(req.userId);
        }

        const [rows] = await pool.promise().query(query, params);
        if (rows.length > 0) {
            const website = rows[0];
            return {
                mode: website.connection_type === 'tunnel' ? 'tunnel' : 'direct',
                agentId: website.agent_id,
                agentUrl: website.is_local ? (process.env.AGENT_URL || 'http://localhost:4001') : `http://${website.ip}:4001`,
                root: website.rootPath,
                path: subPath
            };
        }
    }

    // 2. Default fallback to Master Node / User Root
    const root = await getUserRoot(req.userId, req.userRole, req.user.username);
    return {
        mode: 'direct',
        agentUrl: process.env.AGENT_URL || 'http://localhost:4001',
        root,
        path: targetPath
    };
}

// Unified Handler for Agent Actions
async function dispatchAction(res, target, tunnelAction, tunnelPayload, directFn) {
    if (target.mode === 'tunnel') {
        try {
            const response = await tunnelManager.sendCommand(target.agentId, 'FILE_ACTION', {
                action: tunnelAction,
                root: target.root,
                path: target.path,
                ...tunnelPayload
            });
            res.json(response);
        } catch (e) {
            console.error(`[FILES] Tunnel Request Failed:`, e.message);
            res.status(500).json({ error: `Tunnel Error: ${e.message}` });
        }
    } else {
        try {
            const client = axios.create({
                baseURL: target.agentUrl,
                headers: { 'X-Agent-Secret': AGENT_SECRET },
                timeout: 10000
            });
            await directFn(client);
        } catch (agentErr) {
            console.error(`[FILES] Direct Request Failed (${target.agentUrl}):`, agentErr.message);
            res.status(agentErr.response?.status || 500).json({
                error: agentErr.response?.data?.error || agentErr.message
            });
        }
    }
}

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

        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'ls', {}, async (client) => {
            const response = await client.get('/fs/ls', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/download (Streaming Support)
router.get('/download', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, name } = req.query;
        const target = await resolveTarget(req, targetPath || '/');

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
                headers: { 'X-Agent-Secret': AGENT_SECRET },
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
        const { path: targetPath, content } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'write', { content }, async (client) => {
            const response = await client.post('/fs/write', { root: target.root, path: target.path, content });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/read-content
router.get('/read-content', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'read', {}, async (client) => {
            const response = await client.get('/fs/read', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mkdir
router.post('/mkdir', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'mkdir', {}, async (client) => {
            const response = await client.post('/fs/mkdir', { root: target.root, path: target.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/delete
router.delete('/delete', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, recursive } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'delete', { recursive: recursive === 'true' }, async (client) => {
            const response = await client.post('/fs/delete', { root: target.root, path: target.path, recursive: recursive === 'true' });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rename
router.post('/rename', requireAuth, async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        const targetOld = await resolveTarget(req, oldPath);
        const targetNew = await resolveTarget(req, newPath); // Mainly to resolve path relative to root

        // Assuming both are on same server/root, which is typical for rename
        // We use targetOld settings
        await dispatchAction(res, targetOld, 'rename', { oldPath: targetOld.path, newPath: targetNew.path }, async (client) => {
            const response = await client.post('/fs/rename', { root: targetOld.root, oldPath: targetOld.path, newPath: targetNew.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/chmod - Change file permissions
router.post('/chmod', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, mode } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'chmod', { mode }, async (client) => {
            const response = await client.post('/fs/chmod', { root: target.root, path: target.path, mode });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/copy - Copy file or directory
router.post('/copy', requireAuth, async (req, res) => {
    try {
        const { sourcePath, destPath } = req.body;
        const targetSrc = await resolveTarget(req, sourcePath);
        const targetDest = await resolveTarget(req, destPath);

        await dispatchAction(res, targetSrc, 'copy', { destPath: targetDest.path }, async (client) => {
            const response = await client.post('/fs/copy', {
                root: targetSrc.root,
                path: targetSrc.path,
                destPath: targetDest.path
            });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stat - Get detailed file statistics
router.get('/stat', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'stat', {}, async (client) => {
            const response = await client.get('/fs/stat', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/touch - Create empty file or update timestamp
router.post('/touch', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'touch', {}, async (client) => {
            const response = await client.post('/fs/touch', { root: target.root, path: target.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/symlink - Create symbolic link
router.post('/symlink', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, target: linkTarget } = req.body;
        const targetResolved = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, targetResolved, 'symlink', { target: linkTarget }, async (client) => {
            const response = await client.post('/fs/symlink', {
                root: targetResolved.root,
                path: targetResolved.path,
                target: linkTarget
            });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/exists - Check if file exists
router.get('/exists', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'exists', {}, async (client) => {
            const response = await client.get('/fs/exists', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Archive Operations

// POST /api/zip - Create ZIP archive
router.post('/zip', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, files, archiveName } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'zip', { files, archiveName }, async (client) => {
            const response = await client.post('/fs/zip', { root: target.root, path: target.path, files, archiveName });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/unzip - Extract ZIP archive
router.post('/unzip', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, destination } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'unzip', { destination }, async (client) => {
            const response = await client.post('/fs/unzip', { root: target.root, path: target.path, destination });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tar - Create TAR archive
router.post('/tar', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, files, archiveName, compress } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'tar', { files, archiveName, compress }, async (client) => {
            const response = await client.post('/fs/tar', { root: target.root, path: target.path, files, archiveName, compress });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/untar - Extract TAR archive
router.post('/untar', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, destination } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'untar', { destination }, async (client) => {
            const response = await client.post('/fs/untar', { root: target.root, path: target.path, destination });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/gzip - Compress with gzip
router.post('/gzip', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'gzip', {}, async (client) => {
            const response = await client.post('/fs/gzip', { root: target.root, path: target.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/gunzip - Decompress gzip
router.post('/gunzip', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'gunzip', {}, async (client) => {
            const response = await client.post('/fs/gunzip', { root: target.root, path: target.path });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Utility Operations

// GET /api/search - Search files by pattern
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, pattern, maxDepth } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'search', { pattern, maxDepth: parseInt(maxDepth) || 10 }, async (client) => {
            const response = await client.get('/fs/search', { params: { root: target.root, path: target.path, pattern, maxDepth } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/grep - Search file content
router.get('/grep', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, query, recursive, ignoreCase } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'grep', {
            query,
            recursive: recursive === 'true',
            ignoreCase: ignoreCase === 'true'
        }, async (client) => {
            const response = await client.get('/fs/grep', { params: { root: target.root, path: target.path, query, recursive, ignoreCase } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/du - Get directory size
router.get('/du', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'du', {}, async (client) => {
            const response = await client.get('/fs/du', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/file-type - Detect file MIME type
router.get('/file-type', requireAuth, async (req, res) => {
    try {
        const { path: targetPath } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'file_type', {}, async (client) => {
            const response = await client.get('/fs/file-type', { params: { root: target.root, path: target.path } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/checksum - Calculate file checksum
router.get('/checksum', requireAuth, async (req, res) => {
    try {
        const { path: targetPath, algorithm } = req.query;
        const target = await resolveTarget(req, targetPath || '/');
        await dispatchAction(res, target, 'checksum', { algorithm: algorithm || 'sha256' }, async (client) => {
            const response = await client.get('/fs/checksum', { params: { root: target.root, path: target.path, algorithm } });
            res.json(response.data);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/upload/init - Initialize chunked upload
router.post('/upload/init', requireAuth, async (req, res) => {
    try {
        const { name, size, path: targetPath } = req.body;
        const target = await resolveTarget(req, targetPath || '/');
        const uploadId = uuidv4();

        uploadSessions.set(uploadId, {
            id: uploadId,
            target,
            name,
            size,
            uploadedChunks: 0,
            startTime: Date.now()
        });

        res.json({ uploadId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/upload/chunk - Upload a single chunk
router.post('/upload/chunk', requireAuth, upload.single('chunk'), async (req, res) => {
    try {
        const { uploadId, index, totalChunks } = req.body;
        const session = uploadSessions.get(uploadId);

        if (!session) {
            return res.status(404).json({ error: 'Upload session not found' });
        }

        const buffer = req.file.buffer;
        const chunkIndex = parseInt(index);

        if (session.target.mode === 'tunnel') {
            // Send chunk to agent via Tunnel
            await tunnelManager.sendCommand(session.target.agentId, 'FILE_ACTION', {
                action: 'upload_chunk',
                uploadId,
                index: chunkIndex,
                totalChunks: parseInt(totalChunks),
                data: buffer.toString('base64'),
                root: session.target.root,
                path: session.target.path,
                name: session.name
            });
        } else {
            // Direct: Write to local filesystem
            const fs = require('fs');
            const filePath = path.join(session.target.root, session.target.path, session.name);

            // Ensure directory exists
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

            // First chunk: create/overwrite file, subsequent chunks: append
            if (chunkIndex === 0) {
                await fs.promises.writeFile(filePath, buffer);
            } else {
                await fs.promises.appendFile(filePath, buffer);
            }
        }

        session.uploadedChunks++;
        res.json({ success: true, uploadedChunks: session.uploadedChunks });
    } catch (err) {
        console.error('[UPLOAD] Chunk error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/upload/complete - Finalize upload
router.post('/upload/complete', requireAuth, async (req, res) => {
    try {
        const { uploadId } = req.body;
        const session = uploadSessions.get(uploadId);

        if (!session) {
            return res.status(404).json({ error: 'Upload session not found' });
        }

        // Cleanup session
        uploadSessions.delete(uploadId);

        res.json({
            success: true,
            message: 'Upload completed successfully',
            uploadedChunks: session.uploadedChunks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
