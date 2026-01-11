const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class FileService {
    static resolveSafePath(root, p) {
        const sub = (p || '/').replace(/^\/+/, '');
        const full = path.resolve(root, sub);
        const relative = path.relative(root, full);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error("Access Denied: Path Traversal");
        }
        return full;
    }

    static async list(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
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
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    modifyTime: stats.mtimeMs,
                    accessTime: stats.atimeMs,
                    birthTime: (stats.birthtimeMs && stats.birthtimeMs > 0) ? stats.birthtimeMs : (stats.mtimeMs || Date.now()),
                    mtime: Math.floor(stats.mtimeMs / 1000),
                    atime: Math.floor(stats.atimeMs / 1000),
                    permissions: stats.mode || 0,
                    uid: stats.uid || 0,
                    gid: stats.gid || 0
                };
            }));
        } catch (e) {
            if (e.code === 'ENOENT') throw new Error('Directory not found');
            throw e;
        }
    }

    static async stat(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
        const stats = await fs.stat(fullPath);
        return {
            name: path.basename(fullPath),
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
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
    }

    static async mkdir(root, remotePath, recursive = true) {
        const fullPath = this.resolveSafePath(root, remotePath);
        await fs.mkdir(fullPath, { recursive });
        return { success: true };
    }

    static async delete(root, remotePath, recursive = false) {
        const fullPath = this.resolveSafePath(root, remotePath);
        if (recursive) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
                await fs.rmdir(fullPath);
            } else {
                await fs.unlink(fullPath);
            }
        }
        return { success: true };
    }

    static async rename(root, oldPath, newPath) {
        const oldFullPath = this.resolveSafePath(root, oldPath);
        const newFullPath = this.resolveSafePath(root, newPath);
        await fs.rename(oldFullPath, newFullPath);
        return { success: true };
    }

    static async chmod(root, remotePath, mode) {
        const fullPath = this.resolveSafePath(root, remotePath);
        const modeInt = parseInt(mode.toString(), 8);
        await fs.chmod(fullPath, modeInt);
        return { success: true };
    }

    static async writeFile(root, remotePath, content) {
        const fullPath = this.resolveSafePath(root, remotePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
        return { success: true };
    }

    static async readFile(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
        const content = await fs.readFile(fullPath, 'utf8');
        return { content };
    }

    static createReadStream(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
        return fsSync.createReadStream(fullPath);
    }
}

module.exports = FileService;
