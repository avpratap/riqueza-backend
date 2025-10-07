const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateRequest, 
  validateSignupRequest, 
  validateLoginRequest 
} = require('../middleware/validation');

// Public routes
router.post('/send-otp', validateRequest, AuthController.sendOTP);
router.post('/verify-otp-only', AuthController.verifyOTPOnly);
router.post('/signup', validateSignupRequest, AuthController.signup);
router.post('/login', validateLoginRequest, AuthController.login);
router.post('/consume-otp', AuthController.consumeOTP);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);

module.exports = router;