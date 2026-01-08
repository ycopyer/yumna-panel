const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const { uploadMulti } = require('../../middleware/upload');
const { uploadFile } = require('../../core/sftp');

const { checkRansomwareActivity } = require('../../services/ransomwareGuard');
const { scanBuffer } = require('../../services/malwareScanner');

const CHUNKS_DIR = path.join(__dirname, '../../../uploads/temp_chunks');
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

router.post('/upload', getSession, uploadMulti.array('files'), checkRansomwareActivity, async (req, res) => {
    const targetPath = sanitizePath(req.body.path);
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    try {
        // QUOTA CHECK (Local Storage Only)
        if (targetPath.startsWith('/Local Storage')) {
            const totalUploadSize = req.files.reduce((acc, f) => acc + f.size, 0);
            const [userData] = await db.promise().query('SELECT storage_quota, used_storage FROM users WHERE id = ?', [req.sessionData.userId]);
            const user = userData[0];

            if (user.storage_quota && (BigInt(user.used_storage || 0) + BigInt(totalUploadSize) > BigInt(user.storage_quota))) {
                return res.status(400).json({
                    error: `Storage quota exceeded. Free space: ${((user.storage_quota - user.used_storage) / 1024 / 1024).toFixed(2)} MB.`
                });
            }
        }

        for (const file of req.files) {
            // Malware Scan
            const malware = scanBuffer(file.buffer, file.originalname);
            if (malware) {
                logActivity(req.sessionData.userId, 'malware_blocked', `Blocked upload of ${malware}: ${file.originalname}`, req);
                return res.status(403).json({ error: `Security Shield: Malware detected (${malware})` });
            }

            const remotePath = targetPath === '/' ? `/${file.originalname}` : `${targetPath}/${file.originalname}`;
            await uploadFile(req.sftp, file.buffer, remotePath);
        }

        // UPDATE USAGE
        if (targetPath.startsWith('/Local Storage')) {
            const totalUploadSize = req.files.reduce((acc, f) => acc + f.size, 0);
            await db.promise().query('UPDATE users SET used_storage = used_storage + ? WHERE id = ?', [totalUploadSize, req.sessionData.userId]);
        }

        logActivity(req.sessionData.userId, 'upload', `Uploaded ${req.files.length} to ${targetPath}`, req);
        res.json({ success: true, count: req.files.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RESUMABLE UPLOAD: INIT
router.post('/upload/init', getSession, async (req, res) => {
    const { name, size, path: targetPath } = req.body;
    const uploadId = uuidv4();

    try {
        // QUOTA CHECK
        if (sanitizePath(targetPath).startsWith('/Local Storage')) {
            const [userData] = await db.promise().query('SELECT storage_quota, used_storage FROM users WHERE id = ?', [req.sessionData.userId]);
            const user = userData[0];
            if (user.storage_quota && (BigInt(user.used_storage || 0) + BigInt(size) > BigInt(user.storage_quota))) {
                return res.status(400).json({ error: 'Storage quota exceeded' });
            }
        }

        const uploadDir = path.join(CHUNKS_DIR, uploadId);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        res.json({ uploadId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RESUMABLE UPLOAD: CHUNK
router.post('/upload/chunk', getSession, uploadMulti.single('chunk'), async (req, res) => {
    const { uploadId, index } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No chunk data' });

    try {
        const chunkPath = path.join(CHUNKS_DIR, uploadId, index.toString());
        await fs.promises.writeFile(chunkPath, req.file.buffer);
        res.json({ success: true, index });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RESUMABLE UPLOAD: COMPLETE
router.post('/upload/complete', getSession, checkRansomwareActivity, async (req, res) => {
    const { uploadId, name, path: targetDirPath, totalChunks, totalSize } = req.body;
    const cleanPath = sanitizePath(targetDirPath);
    const remotePath = cleanPath === '/' ? `/${name}` : `${cleanPath}/${name}`;
    const uploadDir = path.join(CHUNKS_DIR, uploadId);
    const tempFilePath = path.join(CHUNKS_DIR, `${uploadId}_final`);

    try {
        // 1. Merge all chunks locally using streams
        const writeStream = fs.createWriteStream(tempFilePath);

        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(uploadDir, i.toString());
            const chunkStream = fs.createReadStream(chunkPath);
            chunkStream.pipe(writeStream, { end: false });
            await new Promise((resolve, reject) => {
                chunkStream.on('end', resolve);
                chunkStream.on('error', reject);
            });
            await fs.promises.unlink(chunkPath); // Delete chunk after merging
        }
        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // 2. Malware Scan (on the merged temp file)
        const fileBuffer = await fs.promises.readFile(tempFilePath);
        const malware = scanBuffer(fileBuffer, name);
        if (malware) {
            await fs.promises.rm(uploadDir, { recursive: true, force: true });
            await fs.promises.unlink(tempFilePath);
            logActivity(req.sessionData.userId, 'malware_blocked', `Blocked resumable upload of ${malware}: ${name}`, req);
            return res.status(403).json({ error: `Security Shield: Malware detected (${malware})` });
        }

        // 3. Upload the merged file to destination using stream
        const finalReadStream = fs.createReadStream(tempFilePath);
        await uploadFile(req.sftp, finalReadStream, remotePath);

        // 3. Update quota usage if local
        if (cleanPath.startsWith('/Local Storage')) {
            await db.promise().query('UPDATE users SET used_storage = used_storage + ? WHERE id = ?', [totalSize, req.sessionData.userId]);
        }

        // 4. Cleanup
        await fs.promises.rm(uploadDir, { recursive: true, force: true });
        await fs.promises.unlink(tempFilePath);

        logActivity(req.sessionData.userId, 'upload_resumable', `Resumable upload complete: ${remotePath}`, req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
        // Cleanup on failure
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
});

module.exports = router;
