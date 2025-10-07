const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// Submit a new review
router.post('/submit', reviewController.submitReview);

// Get reviews for a specific product
router.get('/product/:productId', reviewController.getProductReviews);

// Get all reviews (admin)
router.get('/all', reviewController.getAllReviews);

// Delete a review (admin)
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;
