const createMergedAdapter = (localAdapter, remoteAdapter, sftpName, remoteRootPath, extraMounts = []) => {
    const remotePrefix = `/${sftpName || 'SFTP'}`;
    const localPrefix = '/Local Storage';

    const resolve = (p) => {
        if (!p.startsWith('/')) p = '/' + p;
        if (p.startsWith(localPrefix)) {
            let sub = p.substring(localPrefix.length);
            return { adapter: localAdapter, path: sub || '/' };
        }
        if (remoteAdapter && p.startsWith(remotePrefix)) {
            let sub = p.substring(remotePrefix.length) || '/';
            let finalPath = sub;
            if (remoteRootPath) {
                const root = remoteRootPath.replace(/\/$/, '');
                finalPath = root + (sub.startsWith('/') ? sub : '/' + sub);
            }
            return { adapter: remoteAdapter, path: finalPath };
        }

        // Check extra mounts
        for (const mount of extraMounts) {
            const prefix = `/${mount.name}`;
            const isWin = process.platform === 'win32';

            // Check virtual path
            let matchVirtual = false;
            let subPath = '/';

            if (isWin) {
                const pNorm = p.replace(/\\/g, '/').toLowerCase();
                const prefixNorm = prefix.toLowerCase();
                if (pNorm.startsWith(prefixNorm)) {
                    matchVirtual = true;
                    // Use original p length to slice correctly but normalized slashes
                    const pSlashed = p.replace(/\\/g, '/');
                    subPath = pSlashed.substring(prefix.length) || '/';
                }
            } else {
                if (p.startsWith(prefix)) {
                    matchVirtual = true;
                    subPath = p.substring(prefix.length) || '/';
                }
            }

            if (matchVirtual) {
                return { adapter: mount.adapter, path: subPath };
            }

            // Check physical path mapping if available
            if (mount.physicalPath) {
                const normalizedP = p.replace(/\\/g, '/');
                const normalizedMount = mount.physicalPath.replace(/\\/g, '/');

                const isWin = process.platform === 'win32';
                const pCheck = isWin ? normalizedP.toLowerCase() : normalizedP;
                const mCheck = isWin ? normalizedMount.toLowerCase() : normalizedMount;

                if (pCheck.startsWith(mCheck)) {
                    let sub = normalizedP.substring(normalizedMount.length);
                    if (sub && !sub.startsWith('/')) sub = '/' + sub;
                    return { adapter: mount.adapter, path: sub || '/' };
                }
            }
        }

        return { adapter: null };
    };

    return {
        isMerged: true,
        localAdapter,
        remoteAdapter,
        extraMounts,
        async readdir(p) { return this.list(p); },

        async list(p) {
            if (p === '/' || p === '') {
                const items = [
                    {
                        type: 'd',
                        name: localPrefix.substring(1),
                        size: 0,
                        modifyTime: Date.now(),
                        accessTime: Date.now(),
                        birthTime: Date.now(),
                        rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
                        owner: 0, group: 0
                    }
                ];

                if (remoteAdapter) {
                    items.push({
                        type: 'd',
                        name: remotePrefix.substring(1),
                        size: 0,
                        modifyTime: Date.now(),
                        accessTime: Date.now(),
                        birthTime: Date.now(),
                        rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
                        owner: 0, group: 0
                    });
                }

                // Add mounts
                for (const mount of extraMounts) {
                    items.push({
                        type: 'd',
                        name: mount.name,
                        size: 0,
                        modifyTime: Date.now(),
                        accessTime: Date.now(),
                        birthTime: Date.now(),
                        rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
                        owner: 0, group: 0
                    });
                }

                return items;
            }
            const t = resolve(p);
            if (!t.adapter) throw new Error('Path not found');
            return t.adapter.list(t.path);
        },

        async exists(p) {
            if (p === '/' || p === '') return 'd';
            const t = resolve(p);
            if (!t.adapter) return false;
            return t.adapter.exists(t.path);
        },

        async stat(p) {
            if (p === '/' || p === '') return {
                isDirectory: () => true, isFile: () => false, size: 0,
                mtime: Math.floor(Date.now() / 1000),
                atime: Math.floor(Date.now() / 1000),
                modifyTime: Date.now(),
                accessTime: Date.now(),
                birthTime: Date.now(),
                mode: 16877
            };
            const t = resolve(p);
            if (!t.adapter) throw new Error('Path not found');
            return t.adapter.stat(t.path);
        },

        async mkdir(p, r) { const t = resolve(p); return t.adapter.mkdir(t.path, r); },
        async rmdir(p, r) { const t = resolve(p); return t.adapter.rmdir(t.path, r); },
        async delete(p) { const t = resolve(p); return t.adapter.delete(t.path); },
        async rename(old, n) {
            const t1 = resolve(old);
            const t2 = resolve(n);
            if (t1.adapter !== t2.adapter) throw new Error('Cannot move between storages');
            return t1.adapter.rename(t1.path, t2.path);
        },
        async chmod(p, mode) { const t = resolve(p); return t.adapter.chmod(t.path, mode); },
        async put(i, p) { const t = resolve(p); return t.adapter.put(i, t.path); },
        async get(p) { const t = resolve(p); return t.adapter.get(t.path); },
        createReadStream(p) { const t = resolve(p); return t.adapter.createReadStream(t.path); }
    };
};

module.exports = { createMergedAdapter };
