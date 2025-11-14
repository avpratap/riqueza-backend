const db = require('../config/database');

class Order {
  // Create new order
  static async create(userId, orderData) {
    // userId is UUID, use directly
    
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const {
        customer_info,
        delivery_info,
        payment_info,
        order_notes,
        delivery_fee = 0
      } = orderData;

      console.log('📦 Creating order for user:', userId);

      // Get cart items from database
      const cartItemsResult = await client.query(
        'SELECT * FROM cart_items WHERE user_id = $1',
        [userId]
      );
      
      const cart_items = cartItemsResult.rows;
      
      if (cart_items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate totals
      const total_amount = cart_items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const final_amount = total_amount + parseFloat(delivery_fee);

      // Generate order number
      const orderNumberResult = await client.query('SELECT generate_order_number() as order_number');
      const orderNumber = orderNumberResult.rows[0].order_number;

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          order_number, user_id, total_amount, delivery_fee, final_amount,
          customer_info, delivery_info, payment_info, order_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderNumber,
        userId,
        total_amount,
        delivery_fee,
        final_amount,
        JSON.stringify(customer_info),
        JSON.stringify(delivery_info),
        JSON.stringify(payment_info),
        order_notes
      ]);
      
      console.log('✅ Order created:', orderNumber);

      const order = orderResult.rows[0];

      // Create order items from cart
      for (const item of cart_items) {
        const unit_price = parseFloat(item.total_price) / parseInt(item.quantity);
        
        const orderItemQuery = `
          INSERT INTO order_items (
            order_id, product_id, variant_id, color_id, quantity,
            accessories, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await client.query(orderItemQuery, [
          order.id,
          item.product_id,
          item.variant_id,
          item.color_id,
          item.quantity,
          JSON.stringify(item.accessories),
          unit_price,
          item.total_price
        ]);
      }

      // Add initial status
      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
        [order.id, 'pending', 'Order created successfully']
      );

      // Clear user's cart after successful order
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      console.log('🗑️ Cart cleared for user');

      await client.query('COMMIT');
      return { success: true, data: order };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order by ID
  static async getById(orderId, userId = null) {
    try {
      let query = `
        SELECT 
          o.*,
          u.name as customer_name,
          u.phone as customer_phone,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `;
      let params = [orderId];

      if (userId) {
        // userId is UUID, use directly
        query += ' AND o.user_id = $2';
        params.push(userId);
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get order by order number
  static async getByOrderNumber(orderNumber, userId = null) {
    try {
      let query = `
        SELECT 
          o.*,
          u.name as customer_name,
          u.phone as customer_phone,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.order_number = $1
      `;
      let params = [orderNumber];

      if (userId) {
        // userId is UUID, use directly
        query += ' AND o.user_id = $2';
        params.push(userId);
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching order by number:', error);
      throw error;
    }
  }

  // Get user's orders
  static async getByUserId(userId, limit = 10, offset = 0) {
    try {
      // userId is UUID, use directly
      
      const query = `
        SELECT 
          o.*,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }

  // Get order items
  static async getOrderItems(orderId) {
    try {
      const query = `
        SELECT 
          oi.*,
          p.name as product_name,
          v.name as variant_name,
          c.name as color_name,
          c.color_code,
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
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants v ON oi.variant_id = v.id
        LEFT JOIN product_colors c ON oi.color_id = c.id
        LEFT JOIN product_images pi ON oi.product_id = pi.product_id
        WHERE oi.order_id = $1
        GROUP BY oi.id, p.id, v.id, c.id
        ORDER BY oi.created_at
      `;

      const result = await db.query(query, [orderId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw error;
    }
  }

  // Update order status
  static async updateStatus(orderId, status, notes = null) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, orderId]
      );

      // Add status history
      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
        [orderId, status, notes]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Order status updated successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating order status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order status history
  static async getStatusHistory(orderId) {
    try {
      const query = `
        SELECT *
        FROM order_status_history
        WHERE order_id = $1
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [orderId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching order status history:', error);
      throw error;
    }
  }

  // Get all orders (Admin)
  static async getAll(limit = 20, offset = 0, status = null) {
    try {
      let query = `
        SELECT 
          o.*,
          u.name as customer_name,
          u.phone as customer_phone,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
      `;
      
      let params = [limit, offset];
      let paramCount = 2;

      if (status) {
        query += ` WHERE o.status = $${paramCount + 1}`;
        params.push(status);
        paramCount++;
      }

      query += `
        GROUP BY o.id, u.name, u.phone
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  }

  // Get order statistics
  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(final_amount), 0) as total_revenue
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      throw error;
    }
  }
}

module.exports = Order;
