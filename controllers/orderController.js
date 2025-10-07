const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { authenticateToken } = require('../middleware/auth');

// Create new order
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      customer_info,
      delivery_info,
      payment_info,
      order_notes,
      delivery_fee = 0
    } = req.body;

    // Validate required fields
    if (!customer_info || !delivery_info || !payment_info) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_info, delivery_info, payment_info'
      });
    }

    // Get user's cart items
    const cartItems = await Cart.getByUserId(userId);
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Calculate totals
    const total_amount = cartItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const final_amount = total_amount + parseFloat(delivery_fee);

    // Prepare order data
    const orderData = {
      customer_info,
      delivery_info,
      payment_info,
      order_notes,
      cart_items: cartItems.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        color_id: item.color_id,
        quantity: item.quantity,
        accessories: item.accessories,
        unit_price: parseFloat(item.total_price) / item.quantity,
        total_price: parseFloat(item.total_price)
      })),
      total_amount,
      delivery_fee: parseFloat(delivery_fee),
      final_amount
    };

    const result = await Order.create(userId, orderData);

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.getById(orderId, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const orderItems = await Order.getOrderItems(orderId);
    const statusHistory = await Order.getStatusHistory(orderId);

    res.json({
      success: true,
      data: {
        order,
        items: orderItems,
        status_history: statusHistory
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Get order by order number
const getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;

    const order = await Order.getByOrderNumber(orderNumber, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const orderItems = await Order.getOrderItems(order.id);
    const statusHistory = await Order.getStatusHistory(order.id);

    res.json({
      success: true,
      data: {
        order,
        items: orderItems,
        status_history: statusHistory
      }
    });
  } catch (error) {
    console.error('Error fetching order by number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Get user's orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const orders = await Order.getByUserId(userId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: orders,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// Update order status (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const result = await Order.updateStatus(orderId, status, notes);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    const orders = await Order.getAll(parseInt(limit), parseInt(offset), status);

    res.json({
      success: true,
      data: orders,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// Get order statistics (Admin)
const getOrderStatistics = async (req, res) => {
  try {
    const statistics = await Order.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    // Check if order belongs to user
    const order = await Order.getById(orderId, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Order is already cancelled'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel delivered order'
      });
    }

    const result = await Order.updateStatus(orderId, 'cancelled', reason || 'Cancelled by user');

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getUserOrders,
  updateOrderStatus,
  getAllOrders,
  getOrderStatistics,
  cancelOrder
};
