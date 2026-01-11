const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const KEY_STORE_BASE = path.resolve(__dirname, '../../../../data/ssh_keys');

const ensureKeyStore = async (userId) => {
    const dir = path.join(KEY_STORE_BASE, userId.toString());
    await fs.mkdir(dir, { recursive: true });
    return dir;
};

const getKeyPath = (userId) => path.join(KEY_STORE_BASE, userId.toString(), 'id_rsa');

const generateKey = async (userId) => {
    const dir = await ensureKeyStore(userId);
    const keyPath = path.join(dir, 'id_rsa');

    // Remove existing if any
    try { await fs.unlink(keyPath); } catch (e) { }
    try { await fs.unlink(keyPath + '.pub'); } catch (e) { }

    // Generate new key (no passphrase)
    // using "ssh-keygen" assuming it's in PATH
    try {
        await execPromise(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -C "yumna-panel-user-${userId}"`);
        // Set permissions (crucial for SSH)
        // On Windows, permissions are tricky, but strictly we need it for IdentityFile usage
        // For now we rely on the file existing
        const pubKey = await fs.readFile(keyPath + '.pub', 'utf8');
        return { publicKey: pubKey, privateKeyPath: keyPath };
    } catch (err) {
        throw new Error('Failed to generate SSH key: ' + err.message);
    }
};

const getPublicKey = async (userId) => {
    const keyPath = getKeyPath(userId);
    try {
        const pubKey = await fs.readFile(keyPath + '.pub', 'utf8');
        return pubKey;
    } catch (err) {
        // If not found, generate one
        if (err.code === 'ENOENT') {
            const result = await generateKey(userId);
            return result.publicKey;
        }
        throw err;
    }
};

module.exports = {
    getKeyPath,
    generateKey,
    getPublicKey
};
