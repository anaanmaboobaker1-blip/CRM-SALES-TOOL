const express = require('express');
const router = express.Router();
const {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  downloadPDF,
  updateOrderStatus,
} = require('../controllers/salesOrders');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, salesOrderSchema } = require('../validators');

router.use(authenticateToken);

router.get('/', listSalesOrders);
router.get('/:id', getSalesOrderById);
router.post('/', validateRequest(salesOrderSchema), createSalesOrder);
router.put('/:id', validateRequest(salesOrderSchema), updateSalesOrder);
router.delete('/:id', deleteSalesOrder);

router.get('/:id/pdf', downloadPDF);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
