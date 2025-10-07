const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/:id', productController.getProductById);

// Accessory routes
router.get('/accessories/all', productController.getAllAccessories);
router.get('/accessories/:id', productController.getAccessoryById);

// Admin routes (protected) - disabled for mock data
// router.post('/', authenticateToken, productController.createProduct);
// router.put('/:id', authenticateToken, productController.updateProduct);
// router.delete('/:id', authenticateToken, productController.deleteProduct);

// Admin accessory routes (protected) - disabled for mock data
// router.post('/accessories', authenticateToken, productController.createAccessory);
// router.put('/accessories/:id', authenticateToken, productController.updateAccessory);
// router.delete('/accessories/:id', authenticateToken, productController.deleteAccessory);

module.exports = router;
