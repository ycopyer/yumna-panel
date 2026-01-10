const express = require('express');
const router = express.Router();

router.use(require('./websites'));
router.use(require('./subdomains'));
router.use(require('./databases'));
router.use(require('./dns'));
router.use(require('./mail'));
router.use(require('./php').router);
router.use(require('./services'));
router.use(require('./plugins'));
router.use(require('./ftp'));
router.use('/ssl', require('./ssl'));
router.use(require('./versions'));
router.use(require('./images'));
router.use(require('./duplicates'));
router.use(require('./apps'));
router.use(require('./monitor'));
router.use('/hosting/domains', require('./domains'));
router.use('/hosting/git', require('./git'));
router.use('/hosting/collaboration', require('./collaboration'));

module.exports = router;
