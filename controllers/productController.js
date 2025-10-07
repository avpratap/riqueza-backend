const Product = require('../models/Product');
const Accessory = require('../models/Accessory');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.getAll();
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.getById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
};

// Get product by slug
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.getBySlug(slug);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.getFeatured();
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products'
    });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.getByCategory(category);
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Create new product (Admin only)
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
};

// Update product (Admin only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const product = await Product.update(id, updateData);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product'
    });
  }
};

// Delete product (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.delete(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
};

// Get all accessories
const getAllAccessories = async (req, res) => {
  try {
    const accessories = await Accessory.getAll();
    
    res.json({
      success: true,
      data: accessories,
      count: accessories.length
    });
  } catch (error) {
    console.error('Error fetching accessories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accessories'
    });
  }
};

// Get accessory by ID
const getAccessoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const accessory = await Accessory.getById(id);
    
    if (!accessory) {
      return res.status(404).json({
        success: false,
        error: 'Accessory not found'
      });
    }
    
    res.json({
      success: true,
      data: accessory
    });
  } catch (error) {
    console.error('Error fetching accessory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accessory'
    });
  }
};

// Create new accessory (Admin only)
const createAccessory = async (req, res) => {
  try {
    const accessoryData = req.body;
    const accessory = await Accessory.create(accessoryData);
    
    res.status(201).json({
      success: true,
      data: accessory,
      message: 'Accessory created successfully'
    });
  } catch (error) {
    console.error('Error creating accessory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create accessory'
    });
  }
};

// Update accessory (Admin only)
const updateAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const accessory = await Accessory.update(id, updateData);
    
    if (!accessory) {
      return res.status(404).json({
        success: false,
        error: 'Accessory not found'
      });
    }
    
    res.json({
      success: true,
      data: accessory,
      message: 'Accessory updated successfully'
    });
  } catch (error) {
    console.error('Error updating accessory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update accessory'
    });
  }
};

// Delete accessory (Admin only)
const deleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const accessory = await Accessory.delete(id);
    
    if (!accessory) {
      return res.status(404).json({
        success: false,
        error: 'Accessory not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Accessory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting accessory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete accessory'
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllAccessories,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory
};
