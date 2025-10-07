const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// All order routes require authentication
router.use(authenticateToken);

// Order routes
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getUserOrders);
router.get('/:orderId', orderController.getOrderById);
router.get('/number/:orderNumber', orderController.getOrderByNumber);
router.put('/:orderId/status', orderController.updateOrderStatus);
router.put('/:orderId/cancel', orderController.cancelOrder);

// Admin routes (add admin middleware later)
router.get('/admin/all', orderController.getAllOrders);
router.get('/admin/statistics', orderController.getOrderStatistics);

module.exports = router;
