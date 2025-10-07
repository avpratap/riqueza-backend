const express = require('express');
const router = express.Router();
const { transferGuestCartToUser, getAuthenticatedUserCart } = require('../controllers/cartTransferController');
const { authenticateToken } = require('../middleware/auth');

// Transfer guest cart to authenticated user
router.post('/transfer', authenticateToken, transferGuestCartToUser);

// Get cart for authenticated user
router.get('/user-cart', authenticateToken, getAuthenticatedUserCart);

module.exports = router;
