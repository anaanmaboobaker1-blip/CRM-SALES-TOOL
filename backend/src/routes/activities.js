const express = require('express');
const router = express.Router();
const {
  listActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  updateActivityStatus,
} = require('../controllers/activities');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, activitySchema } = require('../validators');

router.use(authenticateToken);

router.get('/', listActivities);
router.get('/:id', getActivityById);
router.post('/', validateRequest(activitySchema), createActivity);
router.put('/:id', validateRequest(activitySchema), updateActivity);
router.delete('/:id', deleteActivity);
router.patch('/:id/status', updateActivityStatus);

module.exports = router;
