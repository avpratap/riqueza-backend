const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// All cart routes require authentication
router.use(authenticateToken);

// Cart routes
router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.get('/items/:itemId', cartController.getCartItem);
router.put('/items/:itemId/quantity', cartController.updateQuantity);
router.put('/items/:itemId/increment', cartController.incrementQuantity);
router.put('/items/:itemId/decrement', cartController.decrementQuantity);
router.delete('/items/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.get('/summary', cartController.getCartSummary);
router.get('/check-empty', cartController.checkCartEmpty);

module.exports = router;
