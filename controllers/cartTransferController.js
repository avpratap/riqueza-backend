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
      // Generate deterministic UUID from guest session ID (same logic as guestCartController)
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(guestSessionId).digest();
      const uuidBytes = hash.slice(0, 16);
      const guestUserId = [
        uuidBytes.slice(0, 4).toString('hex'),
        uuidBytes.slice(4, 6).toString('hex'),
        uuidBytes.slice(6, 8).toString('hex'),
        uuidBytes.slice(8, 10).toString('hex'),
        uuidBytes.slice(10, 16).toString('hex')
      ].join('-');
      
      console.log('🔄 Transferring guest cart:', {
        guestSessionId: guestSessionId.substring(0, 30) + '...',
        guestUserId,
        authenticatedUserId
      });
      
      // Verify guest user exists
      const guestUserResult = await client.query(`
        SELECT id FROM users WHERE id = $1 AND role = 'guest'
      `, [guestUserId]);

      if (guestUserResult.rows.length === 0) {
        console.log(`⚠️ Guest user not found for session: ${guestSessionId.substring(0, 30)}...`);
        // Check if there are any cart items anyway (in case user exists but wasn't found)
        const cartCheck = await client.query(`
          SELECT COUNT(*) as count FROM cart_items WHERE user_id = $1
        `, [guestUserId]);
        
        if (parseInt(cartCheck.rows[0].count) === 0) {
          // No cart items to transfer - this is fine, return success
          console.log('✅ No guest cart items found - cart transfer not needed');
          return res.json({
            success: true,
            message: 'No guest cart items to transfer',
            data: { itemsTransferred: 0 }
          });
        }
        // Continue with transfer even if guest user record doesn't exist (cart items exist)
        console.log('⚠️ Guest user record not found, but cart items exist - proceeding with transfer');
      }

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
      let transferredCount = 0;
      for (const item of cartItemsResult.rows) {
        const { product_id, variant_id, color_id, quantity, accessories, total_price } = item;
        
        // Ensure accessories is properly JSON stringified
        const accessoriesJson = typeof accessories === 'string' ? accessories : JSON.stringify(accessories || []);
        
        try {
          // Use UPSERT to either insert new item or update existing item
          const result = await client.query(`
            INSERT INTO cart_items (user_id, product_id, variant_id, color_id, quantity, accessories, total_price)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, product_id, variant_id, color_id)
            DO UPDATE SET 
              quantity = cart_items.quantity + EXCLUDED.quantity,
              total_price = cart_items.total_price + EXCLUDED.total_price,
              accessories = EXCLUDED.accessories,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `, [authenticatedUserId, product_id, variant_id, color_id, quantity, accessoriesJson, total_price]);
          
          transferredCount++;
          console.log(`✅ Transferred item ${transferredCount}/${cartItemsResult.rows.length}:`, {
            product_id,
            variant_id,
            color_id,
            cart_item_id: result.rows[0]?.id
          });
        } catch (itemError) {
          console.error(`❌ Error transferring item:`, {
            product_id,
            variant_id,
            color_id,
            error: itemError.message
          });
          // Continue with other items even if one fails
        }
      }
      
      // Delete guest cart items after successful transfer (only if items were transferred)
      if (transferredCount > 0) {
        const deleteResult = await client.query(`
          DELETE FROM cart_items WHERE user_id = $1
        `, [guestUserId]);
        
        console.log(`🗑️ Deleted ${deleteResult.rowCount} guest cart items`);
        
        // Delete guest user record (optional - you may want to keep it for analytics)
        // Only delete if it exists and no other dependencies
        try {
          const deleteUserResult = await client.query(`
            DELETE FROM users WHERE id = $1 AND role = 'guest'
          `, [guestUserId]);
          
          if (deleteUserResult.rowCount > 0) {
            console.log(`🗑️ Deleted guest user record: ${guestUserId}`);
          }
        } catch (deleteUserError) {
          console.warn(`⚠️ Could not delete guest user (may have dependencies):`, deleteUserError.message);
        }
      }

      console.log(`✅ Transferred ${transferredCount}/${cartItemsResult.rows.length} cart items from guest to user ${authenticatedUserId}`);

      res.json({
        success: true,
        message: `Successfully transferred ${transferredCount} cart item(s)`,
        data: { 
          itemsTransferred: transferredCount,
          totalItemsFound: cartItemsResult.rows.length,
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
