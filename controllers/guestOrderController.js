const db = require('../config/database');

// Guest order operations
// We'll store guest orders in the database with a guest user ID

// Generate a guest session ID (UUID format)
const generateGuestSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Get guest session ID from request
const getGuestSessionId = (req) => {
  // Try to get from header first
  let sessionId = req.headers['x-guest-session-id'];
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = generateGuestSessionId();
  }
  
  return sessionId;
};

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// Create guest order
const createGuestOrder = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/orders endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { customer_info, delivery_info, payment_info, order_notes, delivery_fee } = req.body;

    // Validate required fields
    if (!customer_info || !delivery_info || !payment_info) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_info, delivery_info, payment_info'
      });
    }

    const client = await db.connect();
    try {
        // Check if guest user already exists, if not create one
        let guestUserId;
        const existingUser = await client.query(`
          SELECT id FROM users WHERE session_id = $1
        `, [sessionId]);
        
        if (existingUser.rows.length > 0) {
          guestUserId = existingUser.rows[0].id;
          console.log('✅ Found existing guest user:', guestUserId);
        } else {
          // Create new guest user
          const { v4: uuidv4 } = require('uuid');
          guestUserId = uuidv4();
          const guestPhone = `guest_${Math.random().toString(36).substr(2, 8)}`;
          await client.query(`
            INSERT INTO users (id, phone, name, email, role, is_verified, session_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            guestUserId, 
            guestPhone, 
            `${customer_info.firstName} ${customer_info.lastName}`, 
            customer_info.email || null,
            'guest', 
            true,
            sessionId
          ]);
          console.log('✅ Created new guest user:', guestUserId);
        }

      // guestUserId is already set above from the user creation/update
      console.log('✅ Guest user UUID:', guestUserId);

      console.log('✅ Guest user created/verified:', sessionId);

      // Get cart items for this guest user to calculate total
      let cartTotal = 0;
      try {
        console.log('🔍 Looking for cart items with guestUserId:', guestUserId);
        const cartResult = await client.query(`
          SELECT SUM(total_price) as total
          FROM cart_items 
          WHERE user_id = $1
        `, [guestUserId]);
        
        console.log('📊 Cart query result:', cartResult.rows);
        cartTotal = parseFloat(cartResult.rows[0]?.total || 0);
        console.log('🛒 Cart total for order:', cartTotal);
      } catch (cartError) {
        console.error('❌ Failed to get cart total:', cartError);
        cartTotal = 0;
      }

      // Generate order number
      const orderNumber = generateOrderNumber();
      
      // Calculate final amounts
      const subtotal = cartTotal;
      const totalAmount = subtotal + (delivery_fee || 0);
      const finalAmount = totalAmount;

      console.log('💰 Order amounts:', { subtotal, delivery_fee, totalAmount, finalAmount });

      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (
          user_id, 
          order_number, 
          customer_info, 
          delivery_info, 
          payment_info, 
          order_notes, 
          delivery_fee, 
          total_amount, 
          final_amount,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, order_number, created_at
      `, [
        guestUserId,
        orderNumber,
        JSON.stringify(customer_info),
        JSON.stringify(delivery_info),
        JSON.stringify(payment_info),
        order_notes || '',
        delivery_fee || 0,
        totalAmount,
        finalAmount,
        'pending'
      ]);

      const order = orderResult.rows[0];

      // Create order items from cart items
      try {
        const cartItemsResult = await client.query(`
          SELECT product_id, variant_id, color_id, quantity, accessories, total_price
          FROM cart_items 
          WHERE user_id = $1
        `, [guestUserId]);

        console.log('📦 Cart items for order:', cartItemsResult.rows.length);

        for (const cartItem of cartItemsResult.rows) {
          const unitPrice = cartItem.total_price / cartItem.quantity;
          await client.query(`
            INSERT INTO order_items (
              order_id, product_id, variant_id, color_id, quantity, accessories, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            order.id,
            cartItem.product_id,
            cartItem.variant_id,
            cartItem.color_id,
            cartItem.quantity,
            cartItem.accessories,
            unitPrice,
            cartItem.total_price
          ]);
        }

        console.log('✅ Order items created:', cartItemsResult.rows.length);
      } catch (orderItemsError) {
        console.error('Failed to create order items:', orderItemsError);
        // Continue anyway - order is still created
      }

      // Create order status history entry
      await client.query(`
        INSERT INTO order_status_history (order_id, status, notes, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [order.id, 'pending', 'Order created']);

      console.log('✅ Guest order created successfully:', order.id);

      res.json({
        success: true,
        message: 'Order created successfully',
        data: {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          status: 'pending'
        },
        sessionId: sessionId
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating guest order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
};

// Get guest order by ID
const getGuestOrderById = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/orders endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { orderId } = req.params;

    const client = await db.connect();
    try {
      const result = await client.query(`
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'status', osh.status,
                   'notes', osh.notes,
                   'created_at', osh.created_at
                 ) ORDER BY osh.created_at
               ) as status_history
        FROM orders o
        LEFT JOIN order_status_history osh ON o.id = osh.order_id
        WHERE o.id = $1 AND o.user_id = $2
        GROUP BY o.id
      `, [orderId, sessionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      const order = result.rows[0];
      res.json({
        success: true,
        data: order,
        sessionId: sessionId
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching guest order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Get guest order by order number
const getGuestOrderByNumber = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/orders endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { orderNumber } = req.params;

    const client = await db.connect();
    try {
      const result = await client.query(`
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'status', osh.status,
                   'notes', osh.notes,
                   'created_at', osh.created_at
                 ) ORDER BY osh.created_at
               ) as status_history
        FROM orders o
        LEFT JOIN order_status_history osh ON o.id = osh.order_id
        WHERE o.order_number = $1 AND o.user_id = $2
        GROUP BY o.id
      `, [orderNumber, sessionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      const order = result.rows[0];
      res.json({
        success: true,
        data: order,
        sessionId: sessionId
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching guest order by number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Get guest user orders
const getGuestUserOrders = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/orders endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { limit = 10, offset = 0 } = req.query;

    const client = await db.connect();
    try {
      const result = await client.query(`
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'status', osh.status,
                   'notes', osh.notes,
                   'created_at', osh.created_at
                 ) ORDER BY osh.created_at
               ) as status_history
        FROM orders o
        LEFT JOIN order_status_history osh ON o.id = osh.order_id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `, [sessionId, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: result.rows,
        sessionId: sessionId
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching guest user orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

module.exports = {
  createGuestOrder,
  getGuestOrderById,
  getGuestOrderByNumber,
  getGuestUserOrders
};
