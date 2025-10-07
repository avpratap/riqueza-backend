const express = require('express');
const router = express.Router();
const guestCartController = require('../controllers/guestCartController');

// Guest cart routes (no authentication required)
router.get('/', guestCartController.getGuestCart);
router.post('/add', guestCartController.addToGuestCart);
router.put('/items/:itemId/quantity', guestCartController.updateGuestQuantity);
router.put('/items/:itemId/increment', guestCartController.incrementGuestQuantity);
router.put('/items/:itemId/decrement', guestCartController.decrementGuestQuantity);
router.delete('/items/:itemId', guestCartController.removeFromGuestCart);
router.delete('/clear', guestCartController.clearGuestCart);
router.get('/summary', guestCartController.getGuestCartSummary);
router.get('/check-empty', guestCartController.checkGuestCartEmpty);

module.exports = router;
