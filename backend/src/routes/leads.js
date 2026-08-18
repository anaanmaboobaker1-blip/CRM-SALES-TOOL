const express = require('express');
const router = express.Router();
const {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
  addLeadActivity,
  convertLead,
} = require('../controllers/leads');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, leadSchema, activitySchema } = require('../validators');

router.use(authenticateToken);

router.get('/', listLeads);
router.get('/:id', getLeadById);
router.post('/', validateRequest(leadSchema), createLead);
router.put('/:id', validateRequest(leadSchema), updateLead);
router.delete('/:id', deleteLead);

router.post('/:id/notes', addLeadNote);
router.post('/:id/activities', validateRequest(activitySchema), addLeadActivity);
router.post('/:id/convert', convertLead);

module.exports = router;
