const express = require('express');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotLimiter, resetLimiter } = require('../middlewares/rateLimiter');
const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);

module.exports = router;
