const db = require('../config/database');

class Cart {
  // Get user's cart items with product details
  static async getByUserId(userId) {
    try {
      // userId is UUID from database
      console.log('🛒 Getting cart for user:', userId);
      
      const query = `
        SELECT 
          ci.*,
          p.name as product_name,
          p.slug as product_slug,
          p.description as product_description,
          p.category as product_category,
          p.base_price as product_base_price,
          p.original_price as product_original_price,
          p.rating as product_rating,
          p.review_count as product_review_count,
          p.is_featured as product_is_featured,
          pv.name as variant_name,
          pv.battery_capacity as variant_battery_capacity,
          pv.range_km as variant_range_km,
          pv.top_speed_kmh as variant_top_speed_kmh,
          pv.acceleration_sec as variant_acceleration_sec,
          pv.price as variant_price,
          pv.is_new as variant_is_new,
          pc.name as color_name,
          pc.color_code as color_code,
          pc.css_filter as color_css_filter,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', pi.id,
                'image_url', pi.image_url,
                'alt_text', pi.alt_text,
                'display_order', pi.display_order,
                'is_primary', pi.is_primary
              )
            ) FILTER (WHERE pi.id IS NOT NULL), 
            '[]'::json
          ) as product_images
        FROM cart_items ci
        LEFT JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN product_colors pc ON ci.color_id = pc.id
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE ci.user_id = $1
        GROUP BY ci.id, p.id, pv.id, pc.id
        ORDER BY ci.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      console.log(`✅ Found ${result.rows.length} cart items for user`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching cart items:', error);
      throw error;
    }
  }

  // Add or update item in cart
  static async addItem(userId, cartData) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // userId is UUID, use directly
      const { product_id, variant_id, color_id, quantity, accessories, total_price } = cartData;

      console.log('🛒 Adding item to cart:', {
        userId,
        product_id,
        variant_id,
        color_id,
        quantity,
        total_price
      });

      // Check if item already exists
      const checkQuery = `
        SELECT id, quantity, total_price 
        FROM cart_items 
        WHERE user_id = $1 AND product_id = $2 AND variant_id = $3 AND color_id = $4
      `;
      
      const existingItem = await client.query(checkQuery, [userId, product_id, variant_id, color_id]);
      
      if (existingItem.rows.length > 0) {
        // Item exists - update quantity and total price
        const currentItem = existingItem.rows[0];
        // For existing items, only add 1 to quantity (prevent double counting)
        const newQuantity = currentItem.quantity + 1;
        const unitPrice = total_price / (quantity || 1);
        const newTotalPrice = unitPrice * newQuantity;
        
        console.log('🔄 Updating existing cart item:', {
          currentQuantity: currentItem.quantity,
          newQuantity,
          unitPrice,
          newTotalPrice
        });
        
        const updateQuery = `
          UPDATE cart_items 
          SET quantity = $1, 
              total_price = $2,
              accessories = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `;
        
        const accessoriesJson = typeof accessories === 'string' ? accessories : JSON.stringify(accessories || []);
        
        const result = await client.query(updateQuery, [
          newQuantity,
          newTotalPrice,
          accessoriesJson,
          currentItem.id
        ]);
        
        console.log('✅ Updated existing cart item:', result.rows[0]);
        await client.query('COMMIT');
        
        return { 
          success: true, 
          message: 'Item quantity updated in cart',
          data: result.rows[0]
        };
      } else {
        // Item doesn't exist - insert new item
        const insertQuery = `
          INSERT INTO cart_items (user_id, product_id, variant_id, color_id, quantity, accessories, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const accessoriesJson = typeof accessories === 'string' ? accessories : JSON.stringify(accessories || []);
        
        const result = await client.query(insertQuery, [
          userId,
          product_id,
          variant_id,
          color_id,
          quantity || 1,
          accessoriesJson,
          total_price
        ]);
        
        console.log('✅ Added new cart item:', result.rows[0]);
        await client.query('COMMIT');
        
        return { 
          success: true, 
          message: 'Item added to cart successfully',
          data: result.rows[0]
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error adding item to cart:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update cart item quantity
  static async updateQuantity(userId, itemId, quantity) {
    try {
      // userId is UUID, use directly
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return await this.removeItem(userId, itemId);
      }

      // Get current item to calculate new total price
      const getItemQuery = `
        SELECT ci.*, pv.price as variant_price
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;
      
      const itemResult = await db.query(getItemQuery, [itemId, userId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      const currentItem = itemResult.rows[0];
      const unitPrice = currentItem.total_price / currentItem.quantity;
      const newTotalPrice = unitPrice * quantity;
      
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, 
            total_price = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [quantity, newTotalPrice, itemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }

      return { 
        success: true, 
        message: 'Quantity updated successfully',
        data: result.rows[0] 
      };
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // Increment cart item quantity by 1
  static async incrementQuantity(userId, itemId) {
    try {
      // userId is UUID, use directly
      
      // Get current item to calculate new total price
      const getItemQuery = `
        SELECT ci.*, pv.price as variant_price
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;
      
      const itemResult = await db.query(getItemQuery, [itemId, userId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      const currentItem = itemResult.rows[0];
      const unitPrice = currentItem.total_price / currentItem.quantity;
      const newQuantity = currentItem.quantity + 1;
      const newTotalPrice = unitPrice * newQuantity;
      
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, 
            total_price = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [newQuantity, newTotalPrice, itemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }

      return { 
        success: true, 
        message: 'Quantity incremented successfully',
        data: result.rows[0] 
      };
    } catch (error) {
      console.error('Error incrementing cart item:', error);
      throw error;
    }
  }

  // Decrement cart item quantity by 1
  static async decrementQuantity(userId, itemId) {
    try {
      // userId is UUID, use directly
      
      // Get current item
      const getItemQuery = `
        SELECT ci.*, pv.price as variant_price
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;
      
      const itemResult = await db.query(getItemQuery, [itemId, userId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      const currentItem = itemResult.rows[0];
      
      if (currentItem.quantity <= 1) {
        // Remove item if quantity would be 0 or less
        return await this.removeItem(userId, itemId);
      }
      
      const unitPrice = currentItem.total_price / currentItem.quantity;
      const newQuantity = currentItem.quantity - 1;
      const newTotalPrice = unitPrice * newQuantity;
      
      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, 
            total_price = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [newQuantity, newTotalPrice, itemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }

      return { 
        success: true, 
        message: 'Quantity decremented successfully',
        data: result.rows[0] 
      };
    } catch (error) {
      console.error('Error decrementing cart item:', error);
      throw error;
    }
  }

  // Remove item from cart
  static async removeItem(userId, itemId) {
    try {
      // userId is UUID, use directly
      
      const query = 'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await db.query(query, [itemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }

      return { 
        success: true, 
        message: 'Item removed from cart successfully',
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  }

  // Clear user's cart
  static async clearCart(userId) {
    try {
      // userId is UUID, use directly
      
      const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *';
      const result = await db.query(query, [userId]);
      
      return { 
        success: true, 
        message: 'Cart cleared successfully',
        deletedCount: result.rows.length
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Get cart summary
  static async getCartSummary(userId) {
    try {
      // userId is UUID, use directly
      
      const query = `
        SELECT 
          COUNT(*) as total_items,
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(total_price), 0) as total_price
        FROM cart_items 
        WHERE user_id = $1
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting cart summary:', error);
      throw error;
    }
  }

  // Check if cart is empty
  static async isEmpty(userId) {
    try {
      // userId is UUID, use directly
      
      const query = 'SELECT COUNT(*) as count FROM cart_items WHERE user_id = $1';
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].count) === 0;
    } catch (error) {
      console.error('Error checking if cart is empty:', error);
      throw error;
    }
  }

  // Get cart item by ID
  static async getItemById(userId, itemId) {
    try {
      // userId is UUID, use directly
      
      const query = `
        SELECT 
          ci.*,
          p.name as product_name,
          p.slug as product_slug,
          p.description as product_description,
          p.category as product_category,
          p.base_price as product_base_price,
          p.original_price as product_original_price,
          p.rating as product_rating,
          p.review_count as product_review_count,
          p.is_featured as product_is_featured,
          pv.name as variant_name,
          pv.battery_capacity as variant_battery_capacity,
          pv.range_km as variant_range_km,
          pv.top_speed_kmh as variant_top_speed_kmh,
          pv.acceleration_sec as variant_acceleration_sec,
          pv.price as variant_price,
          pv.is_new as variant_is_new,
          pc.name as color_name,
          pc.color_code as color_code,
          pc.css_filter as color_css_filter
        FROM cart_items ci
        LEFT JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN product_colors pc ON ci.color_id = pc.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;
      
      const result = await db.query(query, [itemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting cart item:', error);
      throw error;
    }
  }
}

module.exports = Cart;
