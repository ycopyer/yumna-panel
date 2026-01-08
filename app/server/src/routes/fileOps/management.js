const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const { renameItem, createDirectory } = require('../../core/sftp');
const { checkLegalHold } = require('../../middleware/compliance');
const { checkRansomwareActivity } = require('../../services/ransomwareGuard');

router.delete('/delete', getSession, checkLegalHold, checkRansomwareActivity, async (req, res) => {
    const itemPath = sanitizePath(req.body.path);
    const { type, size = 0 } = req.body;
    try {
        const fileName = itemPath.split('/').pop();
        const trashName = `${fileName}_${Date.now()}`;

        // Always place trash at the storage root level
        const pathParts = itemPath.split('/').filter(p => p);
        const storageRoot = pathParts.length > 0 ? '/' + pathParts[0] : '';
        const trashPath = storageRoot ? `${storageRoot}/.trash_bin/${trashName}` : `/.trash_bin/${trashName}`;
        const trashDir = storageRoot ? `${storageRoot}/.trash_bin` : '/.trash_bin';

        // Ensure trash directory exists
        await req.sftp.mkdir(trashDir, true);

        try {
            await req.sftp.rename(itemPath, trashPath);
        } catch (renameErr) {
            if (renameErr.message.includes('no such file') || renameErr.code === 'ENOENT' || renameErr.code === 2) {
                return res.json({ success: true, message: 'Item already moved or deleted' });
            }
            throw renameErr;
        }

        await db.promise().query(
            'INSERT INTO trash (userId, filePath, trashPath, fileName, fileType, fileSize) VALUES (?, ?, ?, ?, ?, ?)',
            [req.sessionData.userId, itemPath, trashPath, fileName, type, size]
        );

        await logActivity(req.sessionData.userId, 'delete', `Moved to trash: ${itemPath}`, req);
        res.json({ success: true });
    } catch (e) {
        console.error('[DELETE ERROR]', e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/rename', getSession, checkLegalHold, checkRansomwareActivity, async (req, res) => {
    const oldPath = sanitizePath(req.body.oldPath);
    const parts = oldPath.split('/');
    parts[parts.length - 1] = req.body.newName;
    const newPath = parts.join('/');
    try {
        await renameItem(req.sftp, oldPath, newPath);
        logActivity(req.sessionData.userId, 'rename', `Renamed: ${oldPath} -> ${newPath}`, req);
        res.json({ success: true, newPath });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/create-folder', getSession, async (req, res) => {
    const parent = sanitizePath(req.body.path);
    const newPath = parent === '/' ? `/${req.body.folderName}` : `${parent}/${req.body.folderName}`;
    try {
        await createDirectory(req.sftp, newPath);
        logActivity(req.sessionData.userId, 'create', `Created folder: ${newPath}`, req);
        res.json({ success: true, path: newPath });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
