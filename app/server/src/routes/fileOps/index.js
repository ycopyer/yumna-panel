const express = require('express');
const router = express.Router();

router.use(require('./upload'));
router.use(require('./management'));
router.use(require('./preview'));
router.use(require('./security'));

module.exports = router;
