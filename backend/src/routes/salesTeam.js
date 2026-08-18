const express = require('express');
const router = express.Router();
const { listSalesTeam, getSalespersonPerformance, setSalesTarget } = require('../controllers/salesTeam');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listSalesTeam);
router.get('/:id/performance', getSalespersonPerformance);
router.post('/targets', authorizeRoles(['Admin', 'Manager']), setSalesTarget);

module.exports = router;
