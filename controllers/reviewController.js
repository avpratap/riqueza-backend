const db = require('../config/database');

// Submit a new review
const submitReview = async (req, res) => {
  try {
    const { productId, productName, rating, title, review, userName, userEmail } = req.body;

    // Validate required fields
    if (!productId || !productName || !rating || !title || !review || !userName || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Map frontend product IDs to actual database product IDs
    const productMapping = {
      's1-pro': '3da34452-0a5b-4248-9518-e519cd63d1f5',
      's1-pro-plus': '6a0e07c0-43de-4b0f-84b4-e80870e69e54'
    };

    const actualProductId = productMapping[productId];
    if (!actualProductId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product selected'
      });
    }

    // Verify product exists in database
    const productCheck = await db.query('SELECT id, name FROM products WHERE id = $1', [actualProductId]);
    if (productCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Insert review into database with proper foreign key
    const query = `
      INSERT INTO reviews (product_id, rating, title, review, user_name, user_email, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [actualProductId, rating, title, review, userName, userEmail];
    const result = await db.query(query, values);

    console.log('✅ Review submitted successfully:', result.rows[0]);

    // Log activity in user_activity_log
    try {
      await db.query(`
        INSERT INTO user_activity_log (user_email, activity_type, activity_id, title) 
        VALUES ($1, 'review', $2, $3)
      `, [userEmail.trim().toLowerCase(), result.rows[0].id, title.trim()]);
      
      // Update user profile
      await db.query(`
        INSERT INTO user_profiles (email, name, phone, total_reviews, last_activity) 
        VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET 
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          total_reviews = user_profiles.total_reviews + 1,
          last_activity = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [userEmail.trim().toLowerCase(), userName.trim(), null]);
      
      console.log('✅ Review activity logged and user profile updated');
    } catch (activityError) {
      console.error('⚠️ Activity logging failed (non-critical):', activityError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error submitting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review. Please try again.'
    });
  }
};

// Get all reviews for a specific product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Map frontend product IDs to actual database product IDs
    const productMapping = {
      's1-pro': '3da34452-0a5b-4248-9518-e519cd63d1f5',
      's1-pro-plus': '6a0e07c0-43de-4b0f-84b4-e80870e69e54'
    };

    const actualProductId = productMapping[productId];
    if (!actualProductId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const query = `
      SELECT r.*, p.name as product_name 
      FROM reviews r 
      JOIN products p ON r.product_id = p.id 
      WHERE r.product_id = $1 
      ORDER BY r.created_at DESC
    `;

    const result = await db.query(query, [actualProductId]);

    // Calculate average rating
    const avgRatingQuery = `
      SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
      FROM reviews 
      WHERE product_id = $1
    `;

    const avgResult = await db.query(avgRatingQuery, [actualProductId]);
    const averageRating = avgResult.rows[0].average_rating || 0;
    const totalReviews = avgResult.rows[0].total_reviews || 0;

    res.json({
      success: true,
      reviews: result.rows,
      averageRating: parseFloat(averageRating).toFixed(1),
      totalReviews: parseInt(totalReviews)
    });

  } catch (error) {
    console.error('❌ Error fetching product reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
};

// Get all reviews (admin)
const getAllReviews = async (req, res) => {
  try {
    const query = `
      SELECT r.*, p.name as product_name 
      FROM reviews r 
      JOIN products p ON r.product_id = p.id 
      ORDER BY r.created_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      reviews: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching all reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
};

// Delete a review (admin)
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        error: 'Review ID is required'
      });
    }

    const query = 'DELETE FROM reviews WHERE id = $1 RETURNING *';
    const result = await db.query(query, [reviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review'
    });
  }
};

module.exports = {
  submitReview,
  getProductReviews,
  getAllReviews,
  deleteReview
};
