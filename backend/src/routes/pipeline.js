const express = require('express');
const router = express.Router();
const { getPipeline, updateDealStage } = require('../controllers/pipeline');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getPipeline);
router.patch('/deals/:id/stage', updateDealStage);

module.exports = router;
