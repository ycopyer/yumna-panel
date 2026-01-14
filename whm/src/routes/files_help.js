// GET /api/help - Get list of all available file operations with usage guide
router.get('/help', requireAuth, async (req, res) => {
    const operations = {
        "version": "3.2.0",
        "totalOperations": 28,
        "categories": {
            "basic": {
                "name": "Basic File Operations",
                "operations": {
                    "ls": {
                        "method": "GET",
                        "endpoint": "/api/ls",
                        "description": "List directory contents with detailed metadata",
                        "parameters": {
                            "path": "Target directory path (query)"
                        },
                        "example": "GET /api/ls?path=/websites/example.com",
                        "response": "[{name: 'file.txt', type: 'file', size: 1024, mtime: 1705219200}]"
                    },
                    "read": {
                        "method": "GET",
                        "endpoint": "/api/read-content",
                        "description": "Read file content (text files)",
                        "parameters": {
                            "path": "File path (query)"
                        },
                        "example": "GET /api/read-content?path=/websites/example.com/config.php"
                    },
                    "write": {
                        "method": "PUT",
                        "endpoint": "/api/save-content",
                        "description": "Write/update file content",
                        "parameters": {
                            "path": "File path (body)",
                            "content": "File content (body)"
                        },
                        "example": "PUT /api/save-content\nBody: {path: '/file.txt', content: 'Hello World'}"
                    },
                    "mkdir": {
                        "method": "POST",
                        "endpoint": "/api/mkdir",
                        "description": "Create directory (recursive)",
                        "parameters": {
                            "path": "Directory path (body)"
                        },
                        "example": "POST /api/mkdir\nBody: {path: '/websites/example.com/new-folder'}"
                    },
                    "delete": {
                        "method": "DELETE",
                        "endpoint": "/api/delete",
                        "description": "Delete file/folder (with recursive option)",
                        "parameters": {
                            "path": "Target path (query)",
                            "recursive": "true/false for folders (query)"
                        },
                        "example": "DELETE /api/delete?path=/websites/example.com/old-folder&recursive=true"
                    },
                    "rename": {
                        "method": "POST",
                        "endpoint": "/api/rename",
                        "description": "Rename or move file/folder",
                        "parameters": {
                            "oldPath": "Source path (body)",
                            "newPath": "Destination path (body)"
                        },
                        "example": "POST /api/rename\nBody: {oldPath: '/file.txt', newPath: '/renamed.txt'}"
                    },
                    "copy": {
                        "method": "POST",
                        "endpoint": "/api/copy",
                        "description": "Copy file or directory (recursive for directories)",
                        "parameters": {
                            "sourcePath": "Source path (body)",
                            "destPath": "Destination path (body)"
                        },
                        "example": "POST /api/copy\nBody: {sourcePath: '/file.txt', destPath: '/backup/file.txt'}"
                    }
                }
            },
            "metadata": {
                "name": "File Information & Metadata",
                "operations": {
                    "stat": {
                        "method": "GET",
                        "endpoint": "/api/stat",
                        "description": "Get detailed file statistics (size, permissions, timestamps, ownership)",
                        "parameters": {
                            "path": "File path (query)"
                        },
                        "example": "GET /api/stat?path=/websites/example.com/index.html",
                        "response": "{size: 4096, mode: 33188, uid: 1000, gid: 1000, mtime: 1705219200, isFile: true}"
                    },
                    "exists": {
                        "method": "GET",
                        "endpoint": "/api/exists",
                        "description": "Check if file or directory exists",
                        "parameters": {
                            "path": "Target path (query)"
                        },
                        "example": "GET /api/exists?path=/websites/example.com/config.php",
                        "response": "{exists: true}"
                    },
                    "touch": {
                        "method": "POST",
                        "endpoint": "/api/touch",
                        "description": "Create empty file or update timestamp",
                        "parameters": {
                            "path": "File path (body)"
                        },
                        "example": "POST /api/touch\nBody: {path: '/websites/example.com/.gitkeep'}"
                    },
                    "du": {
                        "method": "GET",
                        "endpoint": "/api/du",
                        "description": "Calculate directory size (disk usage)",
                        "parameters": {
                            "path": "Directory path (query)"
                        },
                        "example": "GET /api/du?path=/websites/example.com/uploads",
                        "response": "{bytes: 524288000, human: '500 MB'}"
                    },
                    "file_type": {
                        "method": "GET",
                        "endpoint": "/api/file-type",
                        "description": "Detect file MIME type",
                        "parameters": {
                            "path": "File path (query)"
                        },
                        "example": "GET /api/file-type?path=/websites/example.com/image.jpg",
                        "response": "{mimeType: 'image/jpeg'}"
                    },
                    "checksum": {
                        "method": "GET",
                        "endpoint": "/api/checksum",
                        "description": "Calculate file checksum (MD5, SHA256, SHA512)",
                        "parameters": {
                            "path": "File path (query)",
                            "algorithm": "md5, sha256, sha512 (query, default: sha256)"
                        },
                        "example": "GET /api/checksum?path=/backup.zip&algorithm=sha256",
                        "response": "{algorithm: 'sha256', checksum: 'e3b0c44...'}"
                    }
                }
            },
            "permissions": {
                "name": "Permissions & Ownership (Unix/Linux)",
                "operations": {
                    "chmod": {
                        "method": "POST",
                        "endpoint": "/api/chmod",
                        "description": "Change file permissions (e.g., 0755, 0644)",
                        "parameters": {
                            "path": "File path (body)",
                            "mode": "Permission mode (body, e.g., '0755')"
                        },
                        "example": "POST /api/chmod\nBody: {path: '/script.sh', mode: '0755'}",
                        "note": "Unix/Linux only"
                    },
                    "chown": {
                        "method": "POST",
                        "endpoint": "/api/chown",
                        "description": "Change file ownership (uid/gid)",
                        "parameters": {
                            "path": "File path (body)",
                            "uid": "User ID (body)",
                            "gid": "Group ID (body)"
                        },
                        "example": "POST /api/chown\nBody: {path: '/file.txt', uid: 1000, gid: 1000}",
                        "note": "Unix/Linux only"
                    }
                }
            },
            "symlinks": {
                "name": "Symbolic Links",
                "operations": {
                    "symlink": {
                        "method": "POST",
                        "endpoint": "/api/symlink",
                        "description": "Create symbolic link",
                        "parameters": {
                            "path": "Link path (body)",
                            "target": "Target path (body)"
                        },
                        "example": "POST /api/symlink\nBody: {path: '/current', target: '/releases/v1.2.3'}"
                    },
                    "readlink": {
                        "method": "GET",
                        "endpoint": "/api/readlink",
                        "description": "Read symbolic link target",
                        "parameters": {
                            "path": "Link path (query)"
                        },
                        "example": "GET /api/readlink?path=/current",
                        "response": "{target: '/releases/v1.2.3'}"
                    }
                }
            },
            "archive": {
                "name": "Archive Operations",
                "operations": {
                    "zip": {
                        "method": "POST",
                        "endpoint": "/api/zip",
                        "description": "Create ZIP archive from files/folders",
                        "parameters": {
                            "path": "Base directory (body)",
                            "files": "Array of files/folders to archive (body)",
                            "archiveName": "Archive filename (body)"
                        },
                        "example": "POST /api/zip\nBody: {path: '/websites/example.com', files: ['uploads', 'config.php'], archiveName: 'backup.zip'}"
                    },
                    "unzip": {
                        "method": "POST",
                        "endpoint": "/api/unzip",
                        "description": "Extract ZIP archive",
                        "parameters": {
                            "path": "Archive path (body)",
                            "destination": "Extract destination (body, optional)"
                        },
                        "example": "POST /api/unzip\nBody: {path: '/backup.zip', destination: '/restored'}"
                    },
                    "tar": {
                        "method": "POST",
                        "endpoint": "/api/tar",
                        "description": "Create TAR archive (with optional gzip/bzip2 compression)",
                        "parameters": {
                            "path": "Base directory (body)",
                            "files": "Array of files/folders (body)",
                            "archiveName": "Archive filename (body)",
                            "compress": "Compression: 'gzip', 'bzip2', or null (body, optional)"
                        },
                        "example": "POST /api/tar\nBody: {path: '/websites', files: ['example.com'], archiveName: 'backup.tar.gz', compress: 'gzip'}"
                    },
                    "untar": {
                        "method": "POST",
                        "endpoint": "/api/untar",
                        "description": "Extract TAR archive (auto-detects compression)",
                        "parameters": {
                            "path": "Archive path (body)",
                            "destination": "Extract destination (body, optional)"
                        },
                        "example": "POST /api/untar\nBody: {path: '/backup.tar.gz', destination: '/restored'}"
                    },
                    "gzip": {
                        "method": "POST",
                        "endpoint": "/api/gzip",
                        "description": "Compress file with gzip",
                        "parameters": {
                            "path": "File path (body)"
                        },
                        "example": "POST /api/gzip\nBody: {path: '/large-file.sql'}",
                        "note": "Creates .gz file, keeps original"
                    },
                    "gunzip": {
                        "method": "POST",
                        "endpoint": "/api/gunzip",
                        "description": "Decompress gzip file",
                        "parameters": {
                            "path": "Gzip file path (body)"
                        },
                        "example": "POST /api/gunzip\nBody: {path: '/large-file.sql.gz'}",
                        "note": "Extracts file, keeps original .gz"
                    }
                }
            },
            "search": {
                "name": "Search & Content Operations",
                "operations": {
                    "search": {
                        "method": "GET",
                        "endpoint": "/api/search",
                        "description": "Search files by name pattern (glob)",
                        "parameters": {
                            "path": "Search directory (query)",
                            "pattern": "Glob pattern (query, e.g., '*.php')",
                            "maxDepth": "Max search depth (query, default: 10)"
                        },
                        "example": "GET /api/search?path=/websites&pattern=*.php&maxDepth=5",
                        "response": "{files: ['index.php', 'config.php', 'includes/functions.php']}"
                    },
                    "grep": {
                        "method": "GET",
                        "endpoint": "/api/grep",
                        "description": "Search file content (text search with regex)",
                        "parameters": {
                            "path": "Search directory (query)",
                            "query": "Search query (query)",
                            "recursive": "true/false (query, default: false)",
                            "ignoreCase": "true/false (query, default: false)"
                        },
                        "example": "GET /api/grep?path=/websites&query=database_password&recursive=true&ignoreCase=true",
                        "response": "{matches: ['config.php:12:$database_password = ...'], count: 1}"
                    }
                }
            },
            "transfer": {
                "name": "Transfer Operations",
                "operations": {
                    "download": {
                        "method": "GET",
                        "endpoint": "/api/download",
                        "description": "Stream download (binary-safe, any size)",
                        "parameters": {
                            "path": "File path (query)",
                            "name": "Download filename (query)"
                        },
                        "example": "GET /api/download?path=/backup.zip&name=backup.zip",
                        "note": "Streams file directly to browser"
                    },
                    "upload": {
                        "method": "POST (multi-step)",
                        "endpoint": "/api/upload/init, /api/upload/chunk, /api/upload/complete",
                        "description": "Chunked upload (resumable, progress tracking)",
                        "steps": [
                            "1. POST /api/upload/init - Initialize upload session",
                            "2. POST /api/upload/chunk - Upload chunks (multipart/form-data)",
                            "3. POST /api/upload/complete - Finalize upload"
                        ],
                        "example": "See documentation for detailed upload flow"
                    }
                }
            }
        },
        "notes": {
            "authentication": "All endpoints require Bearer token authentication via 'Authorization' header",
            "modes": "All operations support both Tunnel (WebSocket) and Direct (HTTP) modes automatically",
            "errors": "Errors return JSON: {error: 'Error message'}",
            "platform": "Some operations (chmod, chown, grep) are Unix/Linux only. Windows uses PowerShell equivalents where available."
        },
        "quickStart": {
            "listFiles": "GET /api/ls?path=/websites/example.com",
            "readFile": "GET /api/read-content?path=/websites/example.com/config.php",
            "writeFile": "PUT /api/save-content with body: {path: '/file.txt', content: 'Hello'}",
            "createBackup": "POST /api/zip with body: {path: '/websites', files: ['example.com'], archiveName: 'backup.zip'}",
            "searchFiles": "GET /api/search?path=/websites&pattern=*.php",
            "checkSize": "GET /api/du?path=/websites/example.com/uploads"
        }
    };

    res.json(operations);
});

module.exports = router;
