const express = require('express');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestEmailChange,
  confirmEmailChange,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  resetLimiter,
} = require('../middlewares/rateLimiter');
const authenticate = require('../middlewares/authenticate');
const loadUser = require('../middlewares/loadUser');
const { requireAdmin } = require('../middlewares/access');
const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-email', resetLimiter, verifyEmail);
router.post('/resend-verification', forgotLimiter, resendVerification);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);

// Admin changing their own email (code goes to the new address)
router.post('/change-email/request', authenticate, loadUser, requireAdmin, forgotLimiter, requestEmailChange);
router.post('/change-email/confirm', authenticate, loadUser, requireAdmin, resetLimiter, confirmEmailChange);

module.exports = router;
