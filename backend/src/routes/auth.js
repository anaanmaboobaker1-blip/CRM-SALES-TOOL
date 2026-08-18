const express = require('express');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/auth');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, loginSchema } = require('../validators');

router.post('/login', validateRequest(loginSchema), login);
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

module.exports = router;
