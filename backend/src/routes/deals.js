const express = require('express');
const router = Router = express.Router();
const {
  listDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  addDealNote,
} = require('../controllers/deals');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, dealSchema } = require('../validators');

router.use(authenticateToken);

router.get('/', listDeals);
router.get('/:id', getDealById);
router.post('/', validateRequest(dealSchema), createDeal);
router.put('/:id', validateRequest(dealSchema), updateDeal);
router.delete('/:id', deleteDeal);

router.post('/:id/notes', addDealNote);

module.exports = router;
