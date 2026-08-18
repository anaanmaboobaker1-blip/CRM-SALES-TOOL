const express = require('express');
const router = express.Router();
const { exportLeads, exportCustomers, exportDeals } = require('../controllers/export');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/leads', exportLeads);
router.get('/customers', exportCustomers);
router.get('/deals', exportDeals);

module.exports = router;
