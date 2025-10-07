// Mock product controller for testing without database
const mockProducts = [
  {
    id: 'prod_1',
    name: 'Requeza S1 Pro+',
    slug: 'requeza-s1-pro-plus',
    description: 'The most advanced electric scooter with cutting-edge technology and superior performance.',
    category: 'scooter',
    base_price: 129999.00,
    original_price: 159999.00,
    is_active: true,
    is_featured: true,
    rating: 4.5,
    review_count: 1247,
    variants: [
      {
        id: 'var_1',
        name: '2kWh',
        battery_capacity: '2kWh',
        range_km: 176,
        top_speed_kmh: 115,
        acceleration_sec: 3.1,
        price: 129999,
        is_new: false,
        is_active: true
      },
      {
        id: 'var_2',
        name: '3kWh',
        battery_capacity: '3kWh',
        range_km: 195,
        top_speed_kmh: 120,
        acceleration_sec: 2.6,
        price: 139999,
        is_new: true,
        is_active: true
      },
      {
        id: 'var_3',
        name: '4kWh',
        battery_capacity: '4kWh',
        range_km: 242,
        top_speed_kmh: 123,
        acceleration_sec: 3.0,
        price: 149999,
        is_new: true,
        is_active: true
      },
      {
        id: 'var_4',
        name: '5.2kWh',
        battery_capacity: '5.2kWh',
        range_km: 320,
        top_speed_kmh: 141,
        acceleration_sec: 2.1,
        price: 159999,
        is_new: false,
        is_active: true
      }
    ],
    colors: [
      {
        id: 'col_1',
        name: 'Silver',
        color_code: '#9CA3AF',
        css_filter: 'grayscale(1)'
      },
      {
        id: 'col_2',
        name: 'Passion Red',
        color_code: '#EF4444',
        css_filter: 'hue-rotate(0deg) saturate(1.5)'
      },
      {
        id: 'col_3',
        name: 'Stellar Blue',
        color_code: '#3B82F6',
        css_filter: 'hue-rotate(200deg) saturate(1.2)'
      },
      {
        id: 'col_4',
        name: 'Midnight Blue',
        color_code: '#1E3A8A',
        css_filter: 'hue-rotate(220deg) saturate(1.5)'
      }
    ],
    images: [
      {
        id: 'img_1',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m1_o5y1jo.webp',
        alt_text: 'Requeza S1 Pro+ view 1',
        display_order: 0,
        is_primary: true
      },
      {
        id: 'img_2',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562608/m2_xky6n1.webp',
        alt_text: 'Requeza S1 Pro+ view 2',
        display_order: 1,
        is_primary: false
      },
      {
        id: 'img_3',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m3_tn7u9o.webp',
        alt_text: 'Requeza S1 Pro+ view 3',
        display_order: 2,
        is_primary: false
      },
      {
        id: 'img_4',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m5_iq9xd7.webp',
        alt_text: 'Requeza S1 Pro+ view 4',
        display_order: 3,
        is_primary: false
      },
      {
        id: 'img_5',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m4_nvk8rs.webp',
        alt_text: 'Requeza S1 Pro+ view 5',
        display_order: 4,
        is_primary: false
      },
      {
        id: 'img_6',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m6_j0kype.webp',
        alt_text: 'Requeza S1 Pro+ view 6',
        display_order: 5,
        is_primary: false
      }
    ],
    specifications: [],
    features: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'prod_2',
    name: 'Requeza S1 Pro',
    slug: 'requeza-s1-pro',
    description: 'Premium electric scooter with excellent performance and advanced features.',
    category: 'scooter',
    base_price: 119999.00,
    original_price: 149999.00,
    is_active: true,
    is_featured: true,
    rating: 4.3,
    review_count: 892,
    variants: [
      {
        id: 'var_5',
        name: '2kWh',
        battery_capacity: '2kWh',
        range_km: 150,
        top_speed_kmh: 110,
        acceleration_sec: 3.2,
        price: 119999,
        is_new: false,
        is_active: true
      },
      {
        id: 'var_6',
        name: '3kWh',
        battery_capacity: '3kWh',
        range_km: 176,
        top_speed_kmh: 115,
        acceleration_sec: 3.1,
        price: 129999,
        is_new: true,
        is_active: true
      },
      {
        id: 'var_7',
        name: '4kWh',
        battery_capacity: '4kWh',
        range_km: 195,
        top_speed_kmh: 120,
        acceleration_sec: 2.6,
        price: 139999,
        is_new: true,
        is_active: true
      },
      {
        id: 'var_8',
        name: '5.2kWh',
        battery_capacity: '5.2kWh',
        range_km: 242,
        top_speed_kmh: 125,
        acceleration_sec: 2.7,
        price: 149999,
        is_new: false,
        is_active: true
      }
    ],
    colors: [
      {
        id: 'col_5',
        name: 'Silver',
        color_code: '#9CA3AF',
        css_filter: 'grayscale(1)'
      },
      {
        id: 'col_6',
        name: 'Passion Red',
        color_code: '#EF4444',
        css_filter: 'hue-rotate(0deg) saturate(1.5)'
      },
      {
        id: 'col_7',
        name: 'Stellar Blue',
        color_code: '#3B82F6',
        css_filter: 'hue-rotate(200deg) saturate(1.2)'
      },
      {
        id: 'col_8',
        name: 'Midnight Blue',
        color_code: '#1E3A8A',
        css_filter: 'hue-rotate(220deg) saturate(1.5)'
      }
    ],
    images: [
      {
        id: 'img_7',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n1_so0l6n.webp',
        alt_text: 'Requeza S1 Pro view 1',
        display_order: 0,
        is_primary: true
      },
      {
        id: 'img_8',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n2_wnexzw.webp',
        alt_text: 'Requeza S1 Pro view 2',
        display_order: 1,
        is_primary: false
      },
      {
        id: 'img_9',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n3_mxf4xf.webp',
        alt_text: 'Requeza S1 Pro view 3',
        display_order: 2,
        is_primary: false
      },
      {
        id: 'img_10',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n4_xaznx8.webp',
        alt_text: 'Requeza S1 Pro view 4',
        display_order: 3,
        is_primary: false
      },
      {
        id: 'img_11',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562614/n5_a9l6j5.webp',
        alt_text: 'Requeza S1 Pro view 5',
        display_order: 4,
        is_primary: false
      },
      {
        id: 'img_12',
        image_url: 'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562615/n6_wesmwl.webp',
        alt_text: 'Requeza S1 Pro view 6',
        display_order: 5,
        is_primary: false
      }
    ],
    specifications: [],
    features: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z'
  }
];

const mockAccessories = [
  {
    id: 'acc_1',
    name: 'Buddy Step Floor Mat and Scooter Cover combo',
    description: 'Complete protection package for your scooter',
    price: 3597.00,
    image_url: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:49:11.875.webp',
    is_active: true
  },
  {
    id: 'acc_2',
    name: 'Buddy Step and Floor Mat combo',
    description: 'Essential accessories for comfort and protection',
    price: 2598.00,
    image_url: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:52:22.439.webp',
    is_active: true
  },
  {
    id: 'acc_3',
    name: 'Buddy Step and Scooter Cover combo',
    description: 'Protection and convenience in one package',
    price: 2998.00,
    image_url: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:58:20.266.webp',
    is_active: true
  },
  {
    id: 'acc_4',
    name: 'Floor Mat and Scooter Cover combo',
    description: 'Basic protection accessories',
    price: 1598.00,
    image_url: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_12:03:19.606.webp',
    is_active: true
  }
];

// Get all products
const getAllProducts = async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockProducts,
      count: mockProducts.length
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
    const product = mockProducts.find(p => p.id === id);
    
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
    const product = mockProducts.find(p => p.slug === slug);
    
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
    const featuredProducts = mockProducts.filter(p => p.is_featured);
    
    res.json({
      success: true,
      data: featuredProducts,
      count: featuredProducts.length
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
    const products = mockProducts.filter(p => p.category === category);
    
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

// Get all accessories
const getAllAccessories = async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockAccessories,
      count: mockAccessories.length
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
    const accessory = mockAccessories.find(a => a.id === id);
    
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

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  getAllAccessories,
  getAccessoryById
};
