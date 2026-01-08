const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const createLocalFsAdapter = (userDir) => {
    const root = path.resolve(userDir);
    const resolveSafePath = (p) => {
        const sub = (p || '/').replace(/^\/+/, '');
        const full = path.resolve(root, sub);
        const relative = path.relative(root, full);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error("Access Denied: Path Traversal");
        }
        return full;
    };

    return {
        isLocal: true,
        userDir: root,
        async readdir(p) { return this.list(p); },

        async list(remotePath) {
            const fullPath = resolveSafePath(remotePath);
            try {
                const entries = await fs.readdir(fullPath, { withFileTypes: true });
                return Promise.all(entries.map(async entry => {
                    let stats;
                    try {
                        stats = await fs.stat(path.join(fullPath, entry.name));
                    } catch (e) {
                        stats = { size: 0, mtimeMs: Date.now(), atimeMs: Date.now() };
                    }
                    return {
                        type: entry.isDirectory() ? 'd' : '-',
                        name: entry.name,
                        size: stats.size,
                        modifyTime: stats.mtimeMs,
                        accessTime: stats.atimeMs,
                        birthTime: (stats.birthtimeMs && stats.birthtimeMs > 0) ? stats.birthtimeMs : (stats.mtimeMs || Date.now()),
                        mtime: Math.floor(stats.mtimeMs / 1000),
                        atime: Math.floor(stats.atimeMs / 1000),
                        rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
                        owner: stats.uid || 0,
                        group: stats.gid || 0,
                        permissions: stats.mode || 0,
                        uid: stats.uid || 0,
                        gid: stats.gid || 0
                    };
                }));
            } catch (e) {
                if (e.code === 'ENOENT') return [];
                throw e;
            }
        },

        async exists(remotePath) {
            const fullPath = resolveSafePath(remotePath);
            try {
                const stats = await fs.stat(fullPath);
                return stats.isDirectory() ? 'd' : '-';
            } catch {
                return false;
            }
        },

        async stat(remotePath) {
            const fullPath = resolveSafePath(remotePath);
            const stats = await fs.stat(fullPath);
            return {
                isDirectory: () => stats.isDirectory(),
                isFile: () => stats.isFile(),
                size: stats.size,
                mtime: Math.floor(stats.mtimeMs / 1000),
                atime: Math.floor(stats.atimeMs / 1000),
                modifyTime: stats.mtimeMs,
                accessTime: stats.atimeMs,
                birthTime: (stats.birthtimeMs && stats.birthtimeMs > 0) ? stats.birthtimeMs : (stats.mtimeMs || Date.now()),
                mode: stats.mode,
                uid: stats.uid || 0,
                gid: stats.gid || 0
            };
        },

        async mkdir(remotePath, recursive = false) {
            const fullPath = resolveSafePath(remotePath);
            return fs.mkdir(fullPath, { recursive });
        },

        async rmdir(remotePath, recursive = false) {
            const fullPath = resolveSafePath(remotePath);
            return fs.rmdir(fullPath, { recursive });
        },

        async delete(remotePath) {
            const fullPath = resolveSafePath(remotePath);
            return fs.unlink(fullPath);
        },

        async rename(oldPath, newPath) {
            const oldFullPath = resolveSafePath(oldPath);
            const newFullPath = resolveSafePath(newPath);
            return fs.rename(oldFullPath, newFullPath);
        },

        async chmod(remotePath, mode) {
            const fullPath = resolveSafePath(remotePath);
            return fs.chmod(fullPath, mode);
        },

        async put(input, remotePath) {
            const fullPath = resolveSafePath(remotePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });

            if (Buffer.isBuffer(input) || typeof input === 'string') {
                return fs.writeFile(fullPath, input);
            } else if (input && typeof input.pipe === 'function') {
                const writeStream = fsSync.createWriteStream(fullPath);
                return new Promise((resolve, reject) => {
                    input.pipe(writeStream);
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
            }
        },

        createReadStream(remotePath) {
            const fullPath = resolveSafePath(remotePath);
            return fsSync.createReadStream(fullPath);
        }
    };
};

module.exports = { createLocalFsAdapter };
