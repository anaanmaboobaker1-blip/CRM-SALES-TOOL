const express = require('express');
const router = express.Router();
const {
  listQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  downloadPDF,
  convertToSalesOrder,
} = require('../controllers/quotations');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, quotationSchema } = require('../validators');

router.use(authenticateToken);

router.get('/', listQuotations);
router.get('/:id', getQuotationById);
router.post('/', validateRequest(quotationSchema), createQuotation);
router.put('/:id', validateRequest(quotationSchema), updateQuotation);
router.delete('/:id', deleteQuotation);

router.get('/:id/pdf', downloadPDF);
router.post('/:id/convert', convertToSalesOrder);

module.exports = router;
