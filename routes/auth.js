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
router.post('/send-otp', validateRequest, (req, res, next) => {
  console.log('📨 POST /send-otp route hit, phoneNumber:', req.body?.phoneNumber);
  next();
}, AuthController.sendOTP);
router.post('/verify-otp-only', AuthController.verifyOTPOnly);
router.post('/signup', validateSignupRequest, (req, res, next) => {
  console.log('📨 POST /signup route hit, phoneNumber:', req.body?.phoneNumber, 'name:', req.body?.name);
  next();
}, AuthController.signup);
router.post('/login', validateLoginRequest, (req, res, next) => {
  console.log('📨 POST /login route hit, phoneNumber:', req.body?.phoneNumber);
  next();
}, AuthController.login);
router.post('/consume-otp', AuthController.consumeOTP);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);

module.exports = router;