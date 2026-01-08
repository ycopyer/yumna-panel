const { Client } = require('ssh2');

// --- Internal Raw SSH2 Implementations ---

const listDirectoryInternal = (sftp, path) => {
    return new Promise((resolve, reject) => {
        sftp.readdir(path, (err, list) => {
            if (err) return reject(err);
            resolve(list.map(item => ({
                name: item.filename,
                type: item.longname.startsWith('d') ? 'directory' : 'file',
                size: item.attrs.size,
                mtime: item.attrs.mtime, // SECONDS
                atime: item.attrs.atime, // SECONDS
                modifyTime: item.attrs.mtime * 1000, // MS
                accessTime: item.attrs.atime * 1000, // MS
                birthTime: (item.attrs.mtime || item.attrs.atime) * 1000, // Fallback
                rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
                owner: item.attrs.uid,
                group: item.attrs.gid,
                permissions: item.attrs.mode,
                uid: item.attrs.uid,
                gid: item.attrs.gid
            })));
        });
    });
};

const uploadFileInternal = (sftp, localBuffer, remotePath) => {
    return new Promise((resolve, reject) => {
        const writeStream = sftp.createWriteStream(remotePath);
        writeStream.on('error', reject);
        writeStream.on('close', resolve);
        if (localBuffer && typeof localBuffer.pipe === 'function') {
            localBuffer.pipe(writeStream);
        } else {
            writeStream.write(localBuffer);
            writeStream.end();
        }
    });
};

const deleteFileInternal = (sftp, remotePath) => {
    return new Promise((resolve, reject) => {
        sftp.unlink(remotePath, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

const createDirectoryInternal = (sftp, remotePath, recursive = false) => {
    return new Promise(async (resolve, reject) => {
        if (!recursive) {
            sftp.mkdir(remotePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        } else {
            // Recursive mkdir implementation
            const parts = remotePath.split('/').filter(p => p !== '');
            let current = remotePath.startsWith('/') ? '/' : '';
            for (const part of parts) {
                current = current === '/' ? `/${part}` : `${current}/${part}`;
                try {
                    await new Promise((res, rej) => {
                        sftp.mkdir(current, (err) => {
                            if (err) {
                                // Ignore "Failure" which usually means directory already exists
                                // SSH_FX_FAILURE = 4
                                if (err.code === 4 || err.message.includes('Failure')) {
                                    res();
                                } else {
                                    rej(err);
                                }
                            } else {
                                res();
                            }
                        });
                    });
                } catch (err) {
                    return reject(err);
                }
            }
            resolve();
        }
    });
};

const getFileStatsInternal = (sftp, remotePath) => {
    return new Promise((resolve, reject) => {
        sftp.stat(remotePath, (err, stats) => {
            if (err) return reject(err);
            resolve({
                ...stats,
                isDirectory: () => stats.isDirectory(),
                isFile: () => stats.isFile()
            });
        });
    });
};

const renameItemInternal = (sftp, oldPath, newPath) => {
    return new Promise((resolve, reject) => {
        sftp.rename(oldPath, newPath, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

const deleteDirectoryInternal = async (sftp, remotePath) => {
    try {
        const list = await listDirectoryInternal(sftp, remotePath);
        for (const item of list) {
            const itemPath = remotePath === '/' ? `/${item.name}` : `${remotePath}/${item.name}`;
            if (item.type === 'directory') {
                await deleteDirectoryInternal(sftp, itemPath);
            } else {
                await deleteFileInternal(sftp, itemPath);
            }
        }
        return new Promise((resolve, reject) => {
            sftp.rmdir(remotePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    } catch (err) {
        throw err;
    }
};

// --- Exported Helper Wrappers ---

const getSftpConnection = (config) => {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                const wrapper = {
                    raw: sftp,
                    list: (p) => listDirectoryInternal(sftp, p),
                    put: (buf, p) => uploadFileInternal(sftp, buf, p),
                    delete: (p) => deleteFileInternal(sftp, p),
                    rmdir: (p, recursive) => recursive ? deleteDirectoryInternal(sftp, p) : new Promise((res, rej) => sftp.rmdir(p, e => e ? rej(e) : res())),
                    mkdir: (p, recursive) => createDirectoryInternal(sftp, p, recursive),
                    rename: (o, n) => renameItemInternal(sftp, o, n),
                    stat: (p) => getFileStatsInternal(sftp, p),
                    createReadStream: (p) => sftp.createReadStream(p),
                };

                resolve({ conn, sftp: wrapper });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: config.host,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            privateKey: config.privateKey,
            passphrase: config.passphrase,
            readyTimeout: 5000,
            requestTimeout: 15000
        });
    });
};

const listDirectory = async (sftp, path) => {
    if (sftp.list) {
        const list = await sftp.list(path);
        return list.map(item => ({
            name: item.name,
            type: (item.type === 'd' || item.type === 'directory') ? 'directory' : 'file',
            size: item.size,
            mtime: item.mtime || (item.modifyTime ? Math.floor(item.modifyTime / 1000) : 0),
            atime: item.atime || (item.accessTime ? Math.floor(item.accessTime / 1000) : 0),
            modifyTime: item.modifyTime || (item.mtime ? item.mtime * 1000 : 0),
            accessTime: item.accessTime || (item.atime ? item.atime * 1000 : 0),
            birthTime: item.birthTime || (item.mtime ? item.mtime * 1000 : (item.modifyTime || Date.now())),
            rights: item.rights || { user: 'rwx' },
            owner: item.owner || 0,
            group: item.group || 0,
            permissions: item.permissions || 0,
            uid: item.uid || item.owner || 0,
            gid: item.gid || item.group || 0,
            path: path === '/' ? `/${item.name}` : `${path}/${item.name}`
        }));
    }
    return listDirectoryInternal(sftp, path);
};

const listDirectoryRecursive = async (sftp, path, maxDepth = 10, currentDepth = 0) => {
    const skipDirs = ['/proc', '/sys', '/dev', '/run'];
    if (skipDirs.some(dir => path.startsWith(dir))) return [];
    if (currentDepth >= maxDepth) return [];

    try {
        const list = await listDirectory(sftp, path);
        let results = [];

        for (const item of list) {
            const itemPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;
            results.push({ ...item, path: itemPath });

            if (item.type === 'directory') {
                try {
                    const subList = await listDirectoryRecursive(sftp, itemPath, maxDepth, currentDepth + 1);
                    results = results.concat(subList);
                } catch (err) {
                    console.error(`Failed to list ${itemPath}:`, err.message);
                }
            }
        }
        return results;
    } catch (err) {
        console.error(`Failed to list ${path}:`, err.message);
        return [];
    }
};

const uploadFile = async (sftp, localBuffer, remotePath) => {
    if (sftp.put) return sftp.put(localBuffer, remotePath);
    return uploadFileInternal(sftp, localBuffer, remotePath);
};

const deleteFile = async (sftp, remotePath) => {
    if (sftp.delete) return sftp.delete(remotePath);
    return deleteFileInternal(sftp, remotePath);
};

const deleteDirectory = async (sftp, remotePath) => {
    if (sftp.rmdir) return sftp.rmdir(remotePath, true);
    return deleteDirectoryInternal(sftp, remotePath);
};

const renameItem = async (sftp, oldPath, newPath) => {
    if (sftp.rename) return sftp.rename(oldPath, newPath);
    return renameItemInternal(sftp, oldPath, newPath);
};

const createDirectory = async (sftp, remotePath, recursive = false) => {
    if (sftp.mkdir) return sftp.mkdir(remotePath, recursive);
    return createDirectoryInternal(sftp, remotePath, recursive);
};

const getFileStats = async (sftp, remotePath) => {
    if (sftp.stat) return sftp.stat(remotePath);
    return getFileStatsInternal(sftp, remotePath);
};

const getTotalUsedSize = (conn) => {
    if (!conn || !conn.exec) return Promise.resolve(0);
    return new Promise((resolve, reject) => {
        conn.exec('du -sb .', (err, stream) => {
            if (err) return resolve(0);
            let data = '';
            stream.on('data', d => data += d);
            stream.on('close', () => {
                const size = parseInt(data.trim().split(/\s+/)[0]);
                resolve(isNaN(size) ? 0 : size);
            });
        });
    });
};

const copyItem = async (sftp, srcPath, destPath) => {
    try {
        const stats = await getFileStats(sftp, srcPath);
        if (stats.isDirectory()) {
            await createDirectory(sftp, destPath);
            const items = await listDirectory(sftp, srcPath);
            for (const item of items) {
                const subSrc = srcPath === '/' ? `/${item.name}` : `${srcPath}/${item.name}`;
                const subDest = destPath === '/' ? `/${item.name}` : `${destPath}/${item.name}`;
                await copyItem(sftp, subSrc, subDest);
            }
        } else {
            const readStream = sftp.createReadStream(srcPath);
            if (sftp.put) {
                await sftp.put(readStream, destPath);
            } else {
                await uploadFileInternal(sftp, readStream, destPath);
            }
        }
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getSftpConnection,
    listDirectory,
    listDirectoryRecursive,
    uploadFile,
    deleteFile,
    deleteDirectory,
    renameItem,
    createDirectory,
    getFileStats,
    getTotalUsedSize,
    copyItem
};
