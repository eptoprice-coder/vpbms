const express = require('express');
const router = express.Router();
const { login, forgotPassword, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
