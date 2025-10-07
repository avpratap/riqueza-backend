const db = require('../config/database');

// Guest cart operations using session-based storage
// We'll use both in-memory storage and database for guest carts

const guestCarts = new Map(); // sessionId -> cart data

// Generate a guest session ID
const generateGuestSessionId = () => {
  return 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
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

// Get guest's cart
const getGuestCart = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, try to load from database
    if (!cartData) {
      try {
        const client = await db.connect();
        try {
          // Find guest user by session ID
          const guestUserResult = await client.query(`
            SELECT id FROM users WHERE session_id = $1 AND role = 'guest'
          `, [sessionId]);
          
          if (guestUserResult.rows.length > 0) {
            const guestUserId = guestUserResult.rows[0].id;
            
            // Get cart items from database with product details (same as authenticated cart)
            const cartItemsResult = await client.query(`
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
              LEFT JOIN products p ON ci.product_id::text = p.id::text
              LEFT JOIN product_variants pv ON ci.variant_id::text = pv.id::text
              LEFT JOIN product_colors pc ON ci.color_id::text = pc.id::text
              LEFT JOIN product_images pi ON p.id = pi.product_id
              WHERE ci.user_id = $1
              GROUP BY ci.id, p.id, pv.id, pc.id
              ORDER BY ci.created_at DESC
            `, [guestUserId]);
            
            if (cartItemsResult.rows.length > 0) {
              // Return full cart items with product details
              const items = cartItemsResult.rows;
              
              cartData = {
                items,
                totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
                totalPrice: items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
              };
              
              // Store in memory for faster access next time
              guestCarts.set(sessionId, cartData);
              console.log('✅ Loaded guest cart from database:', { sessionId, itemCount: items.length });
            }
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load guest cart from database:', dbError);
      }
    }
    
    // Use empty cart if still not found
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
    }
    
    res.json({
      success: true,
      data: {
        items: cartData.items,
        summary: {
          total_items: cartData.totalItems,
          total_quantity: cartData.totalItems,
          total_price: cartData.totalPrice,
          is_empty: cartData.items.length === 0
        }
      },
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error fetching guest cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
};

// Add item to guest cart
const addToGuestCart = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { product_id, variant_id, color_id, quantity, accessories, total_price } = req.body;

    // Validate required fields
    if (!product_id || !variant_id || !color_id || !quantity || !total_price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: product_id, variant_id, color_id, quantity, total_price'
      });
    }

    // Get existing cart from memory or load from database
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, try to load from database first
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
      
      try {
        const client = await db.connect();
        try {
          // Find guest user by session ID
          const guestUserResult = await client.query(`
            SELECT id FROM users WHERE session_id = $1 AND role = 'guest'
          `, [sessionId]);
          
          if (guestUserResult.rows.length > 0) {
            const guestUserId = guestUserResult.rows[0].id;
            
            // Get existing cart items from database with product details
            const cartItemsResult = await client.query(`
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
              LEFT JOIN products p ON ci.product_id::text = p.id::text
              LEFT JOIN product_variants pv ON ci.variant_id::text = pv.id::text
              LEFT JOIN product_colors pc ON ci.color_id::text = pc.id::text
              WHERE ci.user_id = $1
              ORDER BY ci.created_at DESC
            `, [guestUserId]);
            
            if (cartItemsResult.rows.length > 0) {
              // Load existing cart items
              cartData.items = cartItemsResult.rows;
              cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
              cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
              console.log('✅ Loaded existing cart from database before adding:', { 
                sessionId, 
                existingItemCount: cartData.items.length 
              });
            }
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load existing cart from database:', dbError);
        // Continue with empty cart
      }
    }
    
    // Check if item already exists
    const existingItemIndex = cartData.items.findIndex(
      item => 
        item.product_id === product_id && 
        item.variant_id === variant_id && 
        item.color_id === color_id
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      cartData.items[existingItemIndex].quantity += parseInt(quantity);
      cartData.items[existingItemIndex].total_price = cartData.items[existingItemIndex].quantity * (total_price / quantity);
    } else {
      // Add new item
      const newItem = {
        id: `${product_id}-${variant_id}-${color_id}`,
        product_id,
        variant_id,
        color_id,
        quantity: parseInt(quantity),
        accessories: accessories || [],
        total_price: parseFloat(total_price)
      };
      cartData.items.push(newItem);
    }
    
    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);
    
    // Save cart in memory
    guestCarts.set(sessionId, cartData);

    // Also store in database for persistence
    try {
      const client = await db.connect();
      try {
        // Create a guest user entry if it doesn't exist (convert sessionId to UUID)
        const { v4: uuidv4 } = require('uuid');
        
        // First, check if guest user already exists
        const existingUser = await client.query(`
          SELECT id FROM users WHERE session_id = $1
        `, [sessionId]);
        
        let guestUserId;
        if (existingUser.rows.length > 0) {
          // Use existing user ID
          guestUserId = existingUser.rows[0].id;
          console.log('✅ Using existing guest user:', sessionId, guestUserId);
        } else {
          // Generate new UUID only for new users
          guestUserId = uuidv4();
          await client.query(`
            INSERT INTO users (id, phone, name, role, is_verified, session_id) 
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [guestUserId, `guest_${Math.random().toString(36).substr(2, 8)}`, 'Guest User', 'guest', true, sessionId]);
          console.log('✅ Guest user created:', sessionId, guestUserId);
        }

        // Store cart item in database
        if (existingItemIndex >= 0) {
          // Update existing item in database
          await client.query(`
            UPDATE cart_items 
            SET quantity = $1, total_price = $2, accessories = $3, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4 AND product_id = $5 AND variant_id = $6 AND color_id = $7
          `, [
            cartData.items[existingItemIndex].quantity,
            cartData.items[existingItemIndex].total_price,
            JSON.stringify(accessories),
            guestUserId,
            product_id,
            variant_id,
            color_id
          ]);
          console.log('✅ Updated existing cart item in database');
        } else {
          // Insert new item in database
          await client.query(`
            INSERT INTO cart_items (user_id, product_id, variant_id, color_id, quantity, accessories, total_price)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, product_id, variant_id, color_id) 
            DO UPDATE SET quantity = cart_items.quantity + $5, total_price = cart_items.total_price + $7, updated_at = CURRENT_TIMESTAMP
          `, [guestUserId, product_id, variant_id, color_id, parseInt(quantity), JSON.stringify(accessories), parseFloat(total_price)]);
          console.log('✅ Inserted new cart item in database');
        }
        
        // After saving to database, reload complete cart with full product details
        const finalCartResult = await client.query(`
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
          LEFT JOIN products p ON ci.product_id::text = p.id::text
          LEFT JOIN product_variants pv ON ci.variant_id::text = pv.id::text
          LEFT JOIN product_colors pc ON ci.color_id::text = pc.id::text
          WHERE ci.user_id = $1
          ORDER BY ci.created_at DESC
        `, [guestUserId]);
        
        // Update cartData with complete items from database
        cartData.items = finalCartResult.rows;
        cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
        cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
        
        // Update memory cache with complete data
        guestCarts.set(sessionId, cartData);
        console.log('✅ Reloaded complete cart with full details:', { 
          sessionId, 
          itemCount: cartData.items.length,
          totalItems: cartData.totalItems,
          totalPrice: cartData.totalPrice
        });
        console.log('📦 Cart items:', cartData.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          has_product_name: !!item.product_name
        })));
        
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('❌ Failed to store guest cart in database:', dbError);
      // Continue with memory storage even if database fails
    }

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartData,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error adding to guest cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
};

// Update guest cart item quantity
const updateGuestQuantity = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
    }

    const cartData = guestCarts.get(sessionId);
    if (!cartData) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cartData.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    if (parseInt(quantity) === 0) {
      // Remove item
      cartData.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cartData.items[itemIndex].quantity = parseInt(quantity);
      cartData.items[itemIndex].total_price = cartData.items[itemIndex].quantity * (cartData.items[itemIndex].total_price / cartData.items[itemIndex].quantity);
    }

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);

    // Save cart
    guestCarts.set(sessionId, cartData);

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: cartData,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error updating guest cart quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
};

// Remove item from guest cart
const removeFromGuestCart = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { itemId } = req.params;

    const cartData = guestCarts.get(sessionId);
    if (!cartData) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cartData.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    // Remove item
    cartData.items.splice(itemIndex, 1);

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);

    // Save cart
    guestCarts.set(sessionId, cartData);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cartData,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error removing from guest cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
};

// Clear guest cart
const clearGuestCart = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    
    const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
    guestCarts.set(sessionId, emptyCart);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: emptyCart,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error clearing guest cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
};

// Get guest cart summary
const getGuestCartSummary = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, try to load from database
    if (!cartData) {
      try {
        const client = await db.connect();
        try {
          // Find guest user by session ID
          const guestUserResult = await client.query(`
            SELECT id FROM users WHERE session_id = $1 AND role = 'guest'
          `, [sessionId]);
          
          if (guestUserResult.rows.length > 0) {
            const guestUserId = guestUserResult.rows[0].id;
            
            // Get cart items from database with product details
            const cartItemsResult = await client.query(`
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
              LEFT JOIN products p ON ci.product_id::text = p.id::text
              LEFT JOIN product_variants pv ON ci.variant_id::text = pv.id::text
              LEFT JOIN product_colors pc ON ci.color_id::text = pc.id::text
              WHERE ci.user_id = $1
              ORDER BY ci.created_at DESC
            `, [guestUserId]);
            
            if (cartItemsResult.rows.length > 0) {
              // Return full cart items with product details
              const items = cartItemsResult.rows;
              
              cartData = {
                items,
                totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
                totalPrice: items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
              };
              
              // Store in memory for faster access next time
              guestCarts.set(sessionId, cartData);
            }
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load guest cart summary from database:', dbError);
      }
    }
    
    // Use empty cart if still not found
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
    }

    res.json({
      success: true,
      data: {
        total_items: cartData.totalItems,
        total_quantity: cartData.totalItems,
        total_price: cartData.totalPrice,
        is_empty: cartData.items.length === 0
      },
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error fetching guest cart summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart summary'
    });
  }
};

// Increment guest cart item quantity
const incrementGuestQuantity = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { itemId } = req.params;

    const cartData = guestCarts.get(sessionId);
    if (!cartData) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cartData.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    // Increment quantity
    cartData.items[itemIndex].quantity += 1;
    const unitPrice = cartData.items[itemIndex].total_price / (cartData.items[itemIndex].quantity - 1);
    cartData.items[itemIndex].total_price = cartData.items[itemIndex].quantity * unitPrice;

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);

    // Save cart
    guestCarts.set(sessionId, cartData);

    res.json({
      success: true,
      message: 'Quantity incremented successfully',
      data: cartData,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error incrementing guest cart quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment cart item'
    });
  }
};

// Decrement guest cart item quantity
const decrementGuestQuantity = async (req, res) => {
  try {
    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        error: 'User is already authenticated. Use /api/cart endpoints instead.'
      });
    }

    const sessionId = getGuestSessionId(req);
    const { itemId } = req.params;

    const cartData = guestCarts.get(sessionId);
    if (!cartData) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cartData.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    if (cartData.items[itemIndex].quantity <= 1) {
      // Remove item if quantity would be 0
      cartData.items.splice(itemIndex, 1);
    } else {
      // Decrement quantity
      cartData.items[itemIndex].quantity -= 1;
      const unitPrice = cartData.items[itemIndex].total_price / (cartData.items[itemIndex].quantity + 1);
      cartData.items[itemIndex].total_price = cartData.items[itemIndex].quantity * unitPrice;
    }

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);

    // Save cart
    guestCarts.set(sessionId, cartData);

    res.json({
      success: true,
      message: cartData.items[itemIndex] ? 'Quantity decremented successfully' : 'Item removed from cart',
      data: cartData,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error decrementing guest cart quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decrement cart item'
    });
  }
};

// Check if guest cart is empty
const checkGuestCartEmpty = async (req, res) => {
  try {
    const sessionId = getGuestSessionId(req);
    const cartData = guestCarts.get(sessionId) || { items: [] };

    res.json({
      success: true,
      data: {
        is_empty: cartData.items.length === 0
      },
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error checking guest cart status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check cart status'
    });
  }
};

module.exports = {
  getGuestCart,
  addToGuestCart,
  updateGuestQuantity,
  incrementGuestQuantity,
  decrementGuestQuantity,
  removeFromGuestCart,
  clearGuestCart,
  getGuestCartSummary,
  checkGuestCartEmpty
};
