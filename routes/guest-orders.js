const express = require('express');
const router = express.Router();
const guestOrderController = require('../controllers/guestOrderController');

// Guest order routes (no authentication required)
router.post('/', guestOrderController.createGuestOrder);
router.get('/:orderId', guestOrderController.getGuestOrderById);
router.get('/number/:orderNumber', guestOrderController.getGuestOrderByNumber);
router.get('/my-orders', guestOrderController.getGuestUserOrders);

module.exports = router;
