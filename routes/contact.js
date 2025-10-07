const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/auth');

// Public route - Submit contact form
router.post('/submit', ContactController.submitContactForm);

// Admin routes - Require authentication
router.get('/messages', authenticateToken, ContactController.getAllMessages);
router.patch('/messages/:id/status', authenticateToken, ContactController.updateMessageStatus);

module.exports = router;

