const express = require('express');
const router = express.Router();
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');

router.get('/preview', getSession, (req, res) => {
    const path = sanitizePath(req.query.path);
    const { type } = req.query;
    const stream = req.sftp.createReadStream(path);
    logActivity(req.sessionData.userId, 'view', `Previewed ${type}: ${path}`, req);
    const mimes = { image: 'image/jpeg', video: 'video/mp4', text: 'text/plain; charset=utf-8' };
    if (mimes[type]) res.setHeader('Content-Type', mimes[type]);
    stream.pipe(res);
});

module.exports = router;
