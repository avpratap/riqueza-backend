const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const guestCartRoutes = require('./guest-cart');
const orderRoutes = require('./orders');
const guestOrderRoutes = require('./guest-orders');
const cartTransferRoutes = require('./cart-transfer');
const contactRoutes = require('./contact');
const reviewRoutes = require('./reviews');
const userActivityRoutes = require('./user-activities');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Riqueza Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/guest-cart', guestCartRoutes);
router.use('/orders', orderRoutes);
router.use('/guest-orders', guestOrderRoutes);
router.use('/cart-transfer', cartTransferRoutes);
router.use('/contact', contactRoutes);
router.use('/reviews', reviewRoutes);
router.use('/user-activities', userActivityRoutes);

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

module.exports = router;
