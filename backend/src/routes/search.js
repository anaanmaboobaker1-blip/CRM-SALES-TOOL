const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/search');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', globalSearch);

module.exports = router;
