const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class DuplicateDetectionService {
    static async findDuplicates(directoryPath) {
        const hashes = new Map();
        const duplicates = [];

        const scan = (dir) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scan(fullPath);
                } else {
                    // Only hash files < 50MB for performance
                    if (stat.size > 50 * 1024 * 1024) continue;

                    const hash = this.getFileHash(fullPath);
                    if (hashes.has(hash)) {
                        hashes.get(hash).push({ path: fullPath, size: stat.size, mtime: stat.mtime });
                    } else {
                        hashes.set(hash, [{ path: fullPath, size: stat.size, mtime: stat.mtime }]);
                    }
                }
            }
        };

        scan(directoryPath);

        for (const [hash, files] of hashes.entries()) {
            if (files.length > 1) {
                duplicates.push({
                    hash,
                    size: files[0].size,
                    files
                });
            }
        }

        return duplicates;
    }

    static getFileHash(filePath) {
        const buffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}

module.exports = DuplicateDetectionService;
