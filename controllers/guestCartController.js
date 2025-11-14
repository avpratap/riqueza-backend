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
          // For guest carts, we generate a deterministic UUID from the session ID
          // First, generate the UUID from session ID
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
          // Get cart items for this guest user
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
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            LEFT JOIN product_colors pc ON ci.color_id = pc.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE ci.user_id = $1
            GROUP BY ci.id, p.id, pv.id, pc.id
            ORDER BY ci.created_at DESC
          `, [guestUserId]);
            
            if (cartItemsResult.rows.length > 0) {
              // Return full cart items with product details
              const items = cartItemsResult.rows;
              
              // Debug: Log first item to see what data we're getting
              if (items.length > 0) {
                console.log('🔍 Sample cart item from database:', {
                  id: items[0].id,
                  product_id: items[0].product_id,
                  product_name: items[0].product_name,
                  variant_name: items[0].variant_name,
                  color_name: items[0].color_name
                });
              }
              
              cartData = {
                items,
                totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
                totalPrice: items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
              };
              
              // Store in memory for faster access next time
              guestCarts.set(sessionId, cartData);
              console.log('✅ Loaded guest cart from database:', { sessionId, itemCount: items.length });
            } else {
              console.log('ℹ️ No cart items found in database for guest user:', guestUserId);
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
          // Generate deterministic UUID from session ID
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
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
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            LEFT JOIN product_colors pc ON ci.color_id = pc.id
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
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load existing cart from database:', dbError);
        // Continue with empty cart
      }
    }
    
    // Check if item already exists in memory (for optimization)
    // Note: We'll verify this against the database later to handle race conditions
    const existingItemIndex = cartData.items.findIndex(
      item => 
        item.product_id === product_id && 
        item.variant_id === variant_id && 
        item.color_id === color_id
    );
    
    // Update memory cache optimistically (will be corrected by database reload after save)
    if (existingItemIndex >= 0) {
      // Update existing item in memory
      cartData.items[existingItemIndex].quantity += parseInt(quantity);
      cartData.items[existingItemIndex].total_price = cartData.items[existingItemIndex].quantity * (total_price / quantity);
    } else {
      // Add new item to memory
      const newItem = {
        id: `${product_id}-${variant_id}-${color_id}`, // Temporary ID, will be replaced by database ID
        product_id,
        variant_id,
        color_id,
        quantity: parseInt(quantity),
        accessories: accessories || [],
        total_price: parseFloat(total_price)
      };
      cartData.items.push(newItem);
    }
    
    // Update totals in memory (will be recalculated after database reload)
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + item.total_price, 0);
    
    // Save cart in memory (will be updated with correct data after database save)
    guestCarts.set(sessionId, cartData);

    // Also store in database for persistence
    try {
      const client = await db.connect();
      try {
        // For guest carts, we'll generate a deterministic UUID from the session ID
        // This allows us to store guest cart items with a UUID user_id that matches users table
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(sessionId).digest();
        const uuidBytes = hash.slice(0, 16); // Take first 16 bytes for UUID
        
        // Convert to UUID format (8-4-4-4-12 hex digits)
        const uuidString = [
          uuidBytes.slice(0, 4).toString('hex'),
          uuidBytes.slice(4, 6).toString('hex'),
          uuidBytes.slice(6, 8).toString('hex'),
          uuidBytes.slice(8, 10).toString('hex'),
          uuidBytes.slice(10, 16).toString('hex')
        ].join('-');
        
        // Create or find guest user record to satisfy FK constraint
        // Note: We use a deterministic UUID from session ID, and a short phone number
        let guestUserId = uuidString;
        
        // Check if guest user already exists by UUID
        const existingGuestUser = await client.query(`
          SELECT id FROM users WHERE id = $1
        `, [guestUserId]);
        
        if (existingGuestUser.rows.length === 0) {
          // Create guest user with deterministic UUID and short phone number
          // Phone field is VARCHAR(20) with UNIQUE constraint, so we need a unique short phone number
          // We'll use just 5 bytes of hash = 10 hex chars, giving us "guest" (5) + 10 = 15 chars max
          // But to ensure uniqueness while staying under 20 chars, we'll use first 5 bytes = 10 hex chars
          // Generate short unique phone number for guest user
          // Use first 5 bytes of hash = 10 hex characters, prefix with "g" = 11 chars total
          const hexString = hash.slice(0, 5).toString('hex'); // 5 bytes = 10 hex characters
          const shortPhone = `g${hexString}`; // "g" (1 char) + 10 hex = 11 chars total, well under 20
          
          console.log('📝 Creating guest user:', { guestUserId, shortPhone, phoneLength: shortPhone.length });
          
          try {
            await client.query(`
              INSERT INTO users (id, phone, name, role, is_verified)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (id) DO NOTHING
            `, [guestUserId, shortPhone, 'Guest User', 'guest', true]);
            console.log('✅ Guest user created successfully');
          } catch (phoneError) {
            // If phone conflict occurs (shouldn't happen with unique hash), try with timestamp
            if (phoneError.code === '23505') { // Unique constraint violation
              console.warn('⚠️ Phone conflict, using timestamp-based phone');
              const timestampPhone = `g${Date.now().toString().slice(-10)}`; // Last 10 digits of timestamp
              await client.query(`
                INSERT INTO users (id, phone, name, role, is_verified)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING
              `, [guestUserId, timestampPhone, 'Guest User', 'guest', true]);
            } else {
              throw phoneError;
            }
          }
        }

        // Check database directly for existing item to avoid race conditions
        // This is critical when multiple requests come in simultaneously
        const existingItemResult = await client.query(`
          SELECT id, quantity, total_price 
          FROM cart_items 
          WHERE user_id = $1 AND product_id = $2 AND variant_id = $3 AND color_id = $4
        `, [guestUserId, product_id, variant_id, color_id]);
        
        const existingItemInDb = existingItemResult.rows[0];
        
        console.log('💾 Storing cart item in database:', {
          guestUserId,
          product_id,
          variant_id,
          color_id,
          quantity,
          existingItemInDb: existingItemInDb ? { id: existingItemInDb.id, quantity: existingItemInDb.quantity } : 'new',
          existingItemIndex: existingItemIndex >= 0 ? existingItemIndex : 'new'
        });
        
        if (existingItemInDb) {
          // Item exists in database - update it (handles race conditions)
          const newQuantity = parseInt(existingItemInDb.quantity) + parseInt(quantity);
          const unitPrice = parseFloat(total_price) / parseInt(quantity);
          const newTotalPrice = newQuantity * unitPrice;
          
          const result = await client.query(`
            UPDATE cart_items 
            SET quantity = $1, total_price = $2, accessories = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
          `, [
            newQuantity,
            newTotalPrice,
            JSON.stringify(accessories),
            existingItemInDb.id
          ]);
          console.log('✅ Updated existing cart item in database:', {
            itemId: result.rows[0]?.id,
            oldQuantity: existingItemInDb.quantity,
            newQuantity,
            newTotalPrice
          });
        } else {
          // Item doesn't exist in database - use UPSERT to handle concurrent inserts
          // This ensures that even if two requests try to insert simultaneously,
          // only one will succeed and the other will update
          const result = await client.query(`
            INSERT INTO cart_items (user_id, product_id, variant_id, color_id, quantity, accessories, total_price)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, product_id, variant_id, color_id) 
            DO UPDATE SET 
              quantity = cart_items.quantity + EXCLUDED.quantity,
              total_price = cart_items.total_price + EXCLUDED.total_price,
              accessories = EXCLUDED.accessories,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `, [guestUserId, product_id, variant_id, color_id, parseInt(quantity), JSON.stringify(accessories), parseFloat(total_price)]);
          
          if (result.rows[0]) {
            const wasConflict = result.rows[0].quantity > parseInt(quantity);
            console.log(wasConflict 
              ? '✅ Inserted item but conflict occurred - updated existing item in database:'
              : '✅ Inserted new cart item in database:', 
              { itemId: result.rows[0]?.id, finalQuantity: result.rows[0]?.quantity }
            );
          }
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
          LEFT JOIN products p ON ci.product_id = p.id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.id
          LEFT JOIN product_colors pc ON ci.color_id = pc.id
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

    // Load cart from memory or database
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, try to load from database
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
      
      try {
        const client = await db.connect();
        try {
          // Generate deterministic UUID from session ID
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
          // Load cart items from database
          const cartItemsResult = await client.query(`
            SELECT * FROM cart_items WHERE user_id = $1
            ORDER BY created_at DESC
          `, [guestUserId]);
          
          if (cartItemsResult.rows.length > 0) {
            cartData.items = cartItemsResult.rows;
            cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
            cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            guestCarts.set(sessionId, cartData);
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load cart from database:', dbError);
      }
    }

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Find item in cart (can be by database ID or frontend composite ID)
    const itemIndex = cartData.items.findIndex(item => {
      return item.id === itemId || 
             item.id?.toString() === itemId ||
             `${item.product_id}-${item.variant_id}-${item.color_id}` === itemId;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    const item = cartData.items[itemIndex];
    const newQuantity = parseInt(quantity);
    const unitPrice = parseFloat(item.total_price) / parseFloat(item.quantity || 1);
    const newTotalPrice = newQuantity * unitPrice;

    // Update in memory
    if (newQuantity === 0) {
      // Remove item
      cartData.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cartData.items[itemIndex].quantity = newQuantity;
      cartData.items[itemIndex].total_price = newTotalPrice;
    }

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    // Save to memory
    guestCarts.set(sessionId, cartData);

    // Also update in database
    try {
      const client = await db.connect();
      try {
        // Generate deterministic UUID from session ID
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(sessionId).digest();
        const uuidBytes = hash.slice(0, 16);
        const guestUserId = [
          uuidBytes.slice(0, 4).toString('hex'),
          uuidBytes.slice(4, 6).toString('hex'),
          uuidBytes.slice(6, 8).toString('hex'),
          uuidBytes.slice(8, 10).toString('hex'),
          uuidBytes.slice(10, 16).toString('hex')
        ].join('-');

        if (newQuantity === 0) {
          // Delete item from database
          await client.query(`
            DELETE FROM cart_items WHERE id = $1 AND user_id = $2
          `, [item.id, guestUserId]);
          console.log('🗑️ Deleted item from database:', item.id);
        } else {
          // Update item in database
          await client.query(`
            UPDATE cart_items 
            SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4
          `, [newQuantity, newTotalPrice, item.id, guestUserId]);
          console.log('✅ Updated item quantity in database:', {
            itemId: item.id,
            oldQuantity: item.quantity,
            newQuantity,
            newTotalPrice
          });
        }
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('❌ Failed to update cart item in database:', dbError);
      // Continue even if database update fails - memory is updated
    }

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

    // Load cart from memory or database
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, try to load from database
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
      
      try {
        const client = await db.connect();
        try {
          // Generate deterministic UUID from session ID
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
          // Load cart items from database
          const cartItemsResult = await client.query(`
            SELECT * FROM cart_items WHERE user_id = $1
            ORDER BY created_at DESC
          `, [guestUserId]);
          
          if (cartItemsResult.rows.length > 0) {
            cartData.items = cartItemsResult.rows;
            cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
            cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            guestCarts.set(sessionId, cartData);
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load cart from database:', dbError);
      }
    }

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Find item in cart (can be by database ID or frontend composite ID)
    const itemIndex = cartData.items.findIndex(item => {
      return item.id === itemId || 
             item.id?.toString() === itemId ||
             `${item.product_id}-${item.variant_id}-${item.color_id}` === itemId;
    });
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    const item = cartData.items[itemIndex];

    // Remove item from memory
    cartData.items.splice(itemIndex, 1);

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

    // Save to memory
    guestCarts.set(sessionId, cartData);

    // Also remove from database
    try {
      const client = await db.connect();
      try {
        // Generate deterministic UUID from session ID
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(sessionId).digest();
        const uuidBytes = hash.slice(0, 16);
        const guestUserId = [
          uuidBytes.slice(0, 4).toString('hex'),
          uuidBytes.slice(4, 6).toString('hex'),
          uuidBytes.slice(6, 8).toString('hex'),
          uuidBytes.slice(8, 10).toString('hex'),
          uuidBytes.slice(10, 16).toString('hex')
        ].join('-');

        // Delete item from database
        const deleteResult = await client.query(`
          DELETE FROM cart_items WHERE id = $1 AND user_id = $2
          RETURNING *
        `, [item.id, guestUserId]);
        
        if (deleteResult.rows.length > 0) {
          console.log('🗑️ Deleted item from database (guest cart):', {
            itemId: item.id,
            productId: item.product_id,
            guestUserId: guestUserId.substring(0, 20) + '...'
          });
        } else {
          console.log('⚠️ Item not found in database (may have been already deleted):', {
            itemId: item.id,
            guestUserId: guestUserId.substring(0, 20) + '...'
          });
        }
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('❌ Failed to remove item from database:', dbError);
      // Continue even if database deletion fails - memory is updated
    }

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
          // Generate deterministic UUID from session ID
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
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

    // Load cart from memory or database
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, load from database
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
      
      try {
        const client = await db.connect();
        try {
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
          const cartItemsResult = await client.query(`
            SELECT * FROM cart_items WHERE user_id = $1
            ORDER BY created_at DESC
          `, [guestUserId]);
          
          if (cartItemsResult.rows.length > 0) {
            cartData.items = cartItemsResult.rows;
            cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
            cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            guestCarts.set(sessionId, cartData);
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load cart from database:', dbError);
      }
    }

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Find item in cart
    const itemIndex = cartData.items.findIndex(item => {
      return item.id === itemId || 
             item.id?.toString() === itemId ||
             `${item.product_id}-${item.variant_id}-${item.color_id}` === itemId;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    const item = cartData.items[itemIndex];
    const oldQuantity = parseFloat(item.quantity);
    const newQuantity = oldQuantity + 1;
    const unitPrice = parseFloat(item.total_price) / oldQuantity;
    const newTotalPrice = newQuantity * unitPrice;

    // Update in memory
    cartData.items[itemIndex].quantity = newQuantity;
    cartData.items[itemIndex].total_price = newTotalPrice;

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    // Save to memory
    guestCarts.set(sessionId, cartData);

    // Update in database
    try {
      const client = await db.connect();
      try {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(sessionId).digest();
        const uuidBytes = hash.slice(0, 16);
        const guestUserId = [
          uuidBytes.slice(0, 4).toString('hex'),
          uuidBytes.slice(4, 6).toString('hex'),
          uuidBytes.slice(6, 8).toString('hex'),
          uuidBytes.slice(8, 10).toString('hex'),
          uuidBytes.slice(10, 16).toString('hex')
        ].join('-');

        await client.query(`
          UPDATE cart_items 
          SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3 AND user_id = $4
        `, [newQuantity, newTotalPrice, item.id, guestUserId]);
        
        console.log('✅ Incremented item quantity in database:', {
          itemId: item.id,
          oldQuantity,
          newQuantity,
          newTotalPrice
        });
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('❌ Failed to update cart item in database:', dbError);
    }

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

    // Load cart from memory or database
    let cartData = guestCarts.get(sessionId);
    
    // If not in memory, load from database
    if (!cartData) {
      cartData = { items: [], totalItems: 0, totalPrice: 0 };
      
      try {
        const client = await db.connect();
        try {
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(sessionId).digest();
          const uuidBytes = hash.slice(0, 16);
          const guestUserId = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex')
          ].join('-');
          
          const cartItemsResult = await client.query(`
            SELECT * FROM cart_items WHERE user_id = $1
            ORDER BY created_at DESC
          `, [guestUserId]);
          
          if (cartItemsResult.rows.length > 0) {
            cartData.items = cartItemsResult.rows;
            cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
            cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            guestCarts.set(sessionId, cartData);
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('❌ Failed to load cart from database:', dbError);
      }
    }

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Find item in cart
    const itemIndex = cartData.items.findIndex(item => {
      return item.id === itemId || 
             item.id?.toString() === itemId ||
             `${item.product_id}-${item.variant_id}-${item.color_id}` === itemId;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    const item = cartData.items[itemIndex];
    const oldQuantity = parseFloat(item.quantity);
    let itemRemoved = false;

    // Update in memory
    if (oldQuantity <= 1) {
      // Remove item if quantity would be 0
      cartData.items.splice(itemIndex, 1);
      itemRemoved = true;
    } else {
      // Decrement quantity
      const newQuantity = oldQuantity - 1;
      const unitPrice = parseFloat(item.total_price) / oldQuantity;
      const newTotalPrice = newQuantity * unitPrice;
      
      cartData.items[itemIndex].quantity = newQuantity;
      cartData.items[itemIndex].total_price = newTotalPrice;
    }

    // Update totals
    cartData.totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
    cartData.totalPrice = cartData.items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    // Save to memory
    guestCarts.set(sessionId, cartData);

    // Update in database
    try {
      const client = await db.connect();
      try {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(sessionId).digest();
        const uuidBytes = hash.slice(0, 16);
        const guestUserId = [
          uuidBytes.slice(0, 4).toString('hex'),
          uuidBytes.slice(4, 6).toString('hex'),
          uuidBytes.slice(6, 8).toString('hex'),
          uuidBytes.slice(8, 10).toString('hex'),
          uuidBytes.slice(10, 16).toString('hex')
        ].join('-');

        if (itemRemoved) {
          // Delete item from database
          await client.query(`
            DELETE FROM cart_items WHERE id = $1 AND user_id = $2
          `, [item.id, guestUserId]);
          console.log('🗑️ Deleted item from database (decrement):', item.id);
        } else {
          // Update quantity in database
          const newQuantity = oldQuantity - 1;
          const unitPrice = parseFloat(item.total_price) / oldQuantity;
          const newTotalPrice = newQuantity * unitPrice;
          
          await client.query(`
            UPDATE cart_items 
            SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4
          `, [newQuantity, newTotalPrice, item.id, guestUserId]);
          
          console.log('✅ Decremented item quantity in database:', {
            itemId: item.id,
            oldQuantity,
            newQuantity,
            newTotalPrice
          });
        }
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('❌ Failed to update cart item in database:', dbError);
    }

    res.json({
      success: true,
      message: itemRemoved ? 'Item removed from cart' : 'Quantity decremented successfully',
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
