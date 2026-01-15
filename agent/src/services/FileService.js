const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
let glob;
try {
    glob = require('glob').glob;
} catch (e) {
    console.warn('[FileService] glob module not found, search functionality will be disabled');
}

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
            // Check if path exists and is directory
            try {
                const stats = await fs.stat(fullPath);
                if (!stats.isDirectory()) return [];
            } catch (e) {
                if (e.code === 'ENOENT') return [];
                throw e;
            }

            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const results = await Promise.all(entries.map(async entry => {
                let stats;
                try {
                    stats = await fs.stat(path.join(fullPath, entry.name));
                } catch (e) {
                    return null;
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
            return results.filter(x => x !== null);
        } catch (e) {
            console.error(`[FileService] List Error for ${fullPath}:`, e);
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
        const modeInt = typeof mode === 'string' ? parseInt(mode, 8) : mode;
        await fs.chmod(fullPath, modeInt);
        return { success: true };
    }

    static async copy(root, sourcePath, destPath) {
        const src = this.resolveSafePath(root, sourcePath);
        const dest = this.resolveSafePath(root, destPath);
        await fs.mkdir(path.dirname(dest), { recursive: true });

        const stats = await fs.stat(src);
        if (stats.isDirectory()) {
            await this._copyDirectory(src, dest);
        } else {
            await fs.copyFile(src, dest);
        }
        return { success: true, destination: dest };
    }

    static async _copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this._copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    static async touch(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
        try {
            await fs.access(fullPath);
            const now = new Date();
            await fs.utimes(fullPath, now, now);
        } catch {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, '');
        }
        return { success: true };
    }

    static async symlink(root, remotePath, target) {
        const fullPath = this.resolveSafePath(root, remotePath);
        await fs.symlink(target, fullPath);
        return { success: true, target };
    }

    static async exists(root, remotePath) {
        const fullPath = this.resolveSafePath(root, remotePath);
        try {
            await fs.access(fullPath);
            return { exists: true };
        } catch {
            return { exists: false };
        }
    }

    static async zip(root, remotePath, files, archiveName) {
        const targetPath = this.resolveSafePath(root, remotePath);
        const archivePath = this.resolveSafePath(root, archiveName || 'archive.zip');
        const fileList = Array.isArray(files) ? files.join(' ') : files;

        const cmd = process.platform === 'win32'
            ? `powershell Compress-Archive -Path ${fileList} -DestinationPath "${archivePath}" -Force`
            : `cd "${targetPath}" && zip -r "${archivePath}" ${fileList}`;

        await execAsync(cmd);
        return { success: true, archive: archivePath };
    }

    static async unzip(root, remotePath, destination) {
        const targetPath = this.resolveSafePath(root, remotePath);
        const destPath = destination ? this.resolveSafePath(root, destination) : path.dirname(targetPath);

        await fs.mkdir(destPath, { recursive: true });

        const cmd = process.platform === 'win32'
            ? `powershell Expand-Archive -Path "${targetPath}" -DestinationPath "${destPath}" -Force`
            : `unzip -o "${targetPath}" -d "${destPath}"`;

        await execAsync(cmd);
        return { success: true, destination: destPath };
    }

    static async tar(root, remotePath, files, archiveName, compress) {
        const targetPath = this.resolveSafePath(root, remotePath);
        const archivePath = this.resolveSafePath(root, archiveName || 'archive.tar');
        const fileList = Array.isArray(files) ? files.join(' ') : files;

        let flags = 'cf';
        if (compress === 'gzip') flags = 'czf';
        if (compress === 'bzip2') flags = 'cjf';

        const cmd = `cd "${targetPath}" && tar ${flags} "${archivePath}" ${fileList}`;
        await execAsync(cmd);
        return { success: true, archive: archivePath };
    }

    static async untar(root, remotePath, destination) {
        const targetPath = this.resolveSafePath(root, remotePath);
        const destPath = destination ? this.resolveSafePath(root, destination) : path.dirname(targetPath);

        await fs.mkdir(destPath, { recursive: true });

        let flags = 'xf';
        if (targetPath.endsWith('.tar.gz') || targetPath.endsWith('.tgz')) flags = 'xzf';
        if (targetPath.endsWith('.tar.bz2')) flags = 'xjf';

        const cmd = `tar ${flags} "${targetPath}" -C "${destPath}"`;
        await execAsync(cmd);
        return { success: true, destination: destPath };
    }

    static async gzip(root, remotePath) {
        const targetPath = this.resolveSafePath(root, remotePath);
        await execAsync(`gzip -k "${targetPath}"`);
        return { success: true, compressed: `${targetPath}.gz` };
    }

    static async gunzip(root, remotePath) {
        const targetPath = this.resolveSafePath(root, remotePath);
        await execAsync(`gunzip -k "${targetPath}"`);
        return { success: true, decompressed: targetPath.replace(/\.gz$/, '') };
    }

    static async search(root, remotePath, pattern, maxDepth = 10) {
        if (!glob) {
            throw new Error('Search functionality is disabled: glob module not installed on agent');
        }
        const targetPath = this.resolveSafePath(root, remotePath);
        const options = { cwd: targetPath, maxDepth, nodir: false };

        const matches = await new Promise((resolve, reject) => {
            glob(pattern, options, (err, files) => {
                if (err) reject(err);
                else resolve(files);
            });
        });
        return { files: matches };
    }

    static async grep(root, remotePath, query, recursive, ignoreCase) {
        const targetPath = this.resolveSafePath(root, remotePath);
        let flags = 'rn';
        if (ignoreCase) flags += 'i';

        const cmd = `grep -${flags} "${query}" "${targetPath}"`;
        try {
            const { stdout } = await execAsync(cmd);
            const lines = stdout.split('\n').filter(l => l.trim());
            return { matches: lines, count: lines.length };
        } catch (err) {
            return { matches: [], count: 0 };
        }
    }

    static async du(root, remotePath) {
        const targetPath = this.resolveSafePath(root, remotePath);
        const cmd = process.platform === 'win32'
            ? `powershell "(Get-ChildItem -Path '${targetPath}' -Recurse | Measure-Object -Property Length -Sum).Sum"`
            : `du -sb "${targetPath}" | cut -f1`;

        const { stdout } = await execAsync(cmd);
        const bytes = parseInt(stdout.trim()) || 0;
        return { bytes, human: this.formatBytes(bytes) };
    }

    static async fileType(root, remotePath) {
        const targetPath = this.resolveSafePath(root, remotePath);
        try {
            const { stdout } = await execAsync(`file -b --mime-type "${targetPath}"`);
            return { mimeType: stdout.trim() };
        } catch {
            const ext = path.extname(targetPath).toLowerCase();
            const mimeTypes = {
                '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css',
                '.js': 'application/javascript', '.json': 'application/json',
                '.zip': 'application/zip', '.jpg': 'image/jpeg', '.png': 'image/png'
            };
            return { mimeType: mimeTypes[ext] || 'application/octet-stream' };
        }
    }

    static async checksum(root, remotePath, algorithm = 'sha256') {
        const targetPath = this.resolveSafePath(root, remotePath);
        const algo = algorithm.toLowerCase();
        const cmd = process.platform === 'win32'
            ? `powershell "Get-FileHash -Path '${targetPath}' -Algorithm ${algo.toUpperCase()} | Select-Object -ExpandProperty Hash"`
            : `${algo}sum "${targetPath}" | cut -d' ' -f1`;

        const { stdout } = await execAsync(cmd);
        return { algorithm: algo, checksum: stdout.trim().toLowerCase() };
    }

    static async writeFile(root, remotePath, content, encoding = 'utf8') {
        const fullPath = this.resolveSafePath(root, remotePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, encoding);
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

    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = FileService;
