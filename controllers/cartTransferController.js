const db = require('../config/database');

// Transfer guest cart to authenticated user
const transferGuestCartToUser = async (req, res) => {
  try {
    const authenticatedUser = req.user; // Full user object from auth middleware
    const guestSessionId = req.headers['x-guest-session-id'];
    
    if (!guestSessionId) {
      return res.status(400).json({
        success: false,
        error: 'Guest session ID required'
      });
    }

    // Extract pure UUID from prefixed user ID (usr_<uuid> -> <uuid>)
    const authenticatedUserId = authenticatedUser.id.includes('_') 
      ? authenticatedUser.id.split('_')[1] 
      : authenticatedUser.id;

    const client = await db.connect();
    try {
      // Get guest user ID from session
      const guestUserResult = await client.query(`
        SELECT id FROM users WHERE session_id = $1 AND role = 'guest'
      `, [guestSessionId]);

      if (guestUserResult.rows.length === 0) {
        console.log(`⚠️ Guest session not found: ${guestSessionId}`);
        return res.status(404).json({
          success: false,
          error: 'Guest session not found',
          message: 'No guest user found for this session. Cart transfer not needed.'
        });
      }

      const guestUserId = guestUserResult.rows[0].id;

      // Check if guest has cart items
      const cartItemsResult = await client.query(`
        SELECT * FROM cart_items WHERE user_id = $1
      `, [guestUserId]);

      if (cartItemsResult.rows.length === 0) {
        return res.json({
          success: true,
          message: 'No cart items to transfer',
          data: { itemsTransferred: 0 }
        });
      }

      // Transfer cart items to authenticated user using UPSERT logic
      // This handles cases where the authenticated user already has the same items
      for (const item of cartItemsResult.rows) {
        const { product_id, variant_id, color_id, quantity, accessories, total_price } = item;
        
        // Ensure accessories is properly JSON stringified
        const accessoriesJson = typeof accessories === 'string' ? accessories : JSON.stringify(accessories || []);
        
        // Use UPSERT to either insert new item or update existing item
        await client.query(`
          INSERT INTO cart_items (user_id, product_id, variant_id, color_id, quantity, accessories, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, product_id, variant_id, color_id)
          DO UPDATE SET 
            quantity = cart_items.quantity + $5,
            total_price = cart_items.total_price + $7,
            accessories = $6,
            updated_at = CURRENT_TIMESTAMP
        `, [authenticatedUserId, product_id, variant_id, color_id, quantity, accessoriesJson, total_price]);
      }
      
      // Delete guest cart items after successful transfer
      await client.query(`
        DELETE FROM cart_items WHERE user_id = $1
      `, [guestUserId]);

      // Delete guest user (this will cascade delete any other guest data)
      await client.query(`
        DELETE FROM users WHERE id = $1
      `, [guestUserId]);

      console.log(`✅ Transferred ${cartItemsResult.rows.length} cart items from guest to user ${authenticatedUserId}`);

      res.json({
        success: true,
        message: 'Cart transferred successfully',
        data: { 
          itemsTransferred: cartItemsResult.rows.length,
          guestUserId: guestUserId
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error transferring guest cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer cart',
      message: error.message || 'Internal server error during cart transfer'
    });
  }
};

// Get cart for authenticated user (after transfer)
const getAuthenticatedUserCart = async (req, res) => {
  try {
    const authenticatedUser = req.user;
    
    // Extract pure UUID from prefixed user ID (usr_<uuid> -> <uuid>)
    const authenticatedUserId = authenticatedUser.id.includes('_') 
      ? authenticatedUser.id.split('_')[1] 
      : authenticatedUser.id;

    const client = await db.connect();
    
    try {
      const cartItemsResult = await client.query(`
        SELECT * FROM cart_items WHERE user_id = $1
        ORDER BY created_at DESC
      `, [authenticatedUserId]);

      const items = cartItemsResult.rows;
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

      res.json({
        success: true,
        data: {
          items,
          totalItems,
          totalPrice
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error getting user cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart'
    });
  }
};

module.exports = {
  transferGuestCartToUser,
  getAuthenticatedUserCart
};
