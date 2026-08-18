const express = require('express');
const router = express.Router();
const { getDashboardStats, getAnalyticsReports } = require('../controllers/reports');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/analytics', getAnalyticsReports);

module.exports = router;
