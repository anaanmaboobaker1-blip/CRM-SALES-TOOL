const express = require('express');
const router = express.Router();
const {
  getInventoryProducts,
  getCustomerAccounting,
  getCustomerPOSHistory,
  triggerInvoiceIntegration,
} = require('../controllers/integrations');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/products', getInventoryProducts);
router.get('/customers/:id/accounting', getCustomerAccounting);
router.get('/customers/:id/pos', getCustomerPOSHistory);
router.post('/invoice', triggerInvoiceIntegration);

module.exports = router;
