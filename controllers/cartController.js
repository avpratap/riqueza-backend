const Cart = require('../models/Cart');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItems = await Cart.getByUserId(userId);
    const summary = await Cart.getCartSummary(userId);

    res.json({
      success: true,
      data: {
        items: cartItems,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, variant_id, color_id, quantity, accessories, total_price } = req.body;

    // Validate required fields
    if (!product_id || !variant_id || !color_id || !total_price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: product_id, variant_id, color_id, total_price'
      });
    }

    const cartData = {
      product_id,
      variant_id,
      color_id,
      quantity: parseInt(quantity) || 1,
      accessories: accessories || [],
      total_price: parseFloat(total_price)
    };

    const result = await Cart.addItem(userId, cartData);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
};

// Update cart item quantity
const updateQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
    }

    const result = await Cart.updateQuantity(userId, itemId, parseInt(quantity));

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const result = await Cart.removeItem(userId, itemId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Cart.clearCart(userId);

    res.json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
};

// Get cart summary
const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await Cart.getCartSummary(userId);
    const isEmpty = await Cart.isEmpty(userId);

    res.json({
      success: true,
      data: {
        ...summary,
        is_empty: isEmpty
      }
    });
  } catch (error) {
    console.error('Error fetching cart summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart summary'
    });
  }
};

// Check if cart is empty
const checkCartEmpty = async (req, res) => {
  try {
    const userId = req.user.id;
    const isEmpty = await Cart.isEmpty(userId);

    res.json({
      success: true,
      data: {
        is_empty: isEmpty
      }
    });
  } catch (error) {
    console.error('Error checking cart status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check cart status'
    });
  }
};

// Increment cart item quantity
const incrementQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const result = await Cart.incrementQuantity(userId, itemId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error incrementing cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment cart item'
    });
  }
};

// Decrement cart item quantity
const decrementQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const result = await Cart.decrementQuantity(userId, itemId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error decrementing cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decrement cart item'
    });
  }
};

// Get cart item by ID
const getCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const item = await Cart.getItemById(userId, itemId);

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error getting cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart item'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartSummary,
  checkCartEmpty,
  incrementQuantity,
  decrementQuantity,
  getCartItem
};