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

module.exports = router;
