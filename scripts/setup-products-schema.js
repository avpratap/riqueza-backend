const pool = require('../config/database');
const UUIDGenerator = require('../utils/uuidGenerator');

async function setupProductsSchema() {
  try {
    console.log('🚀 Setting up products database schema...');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL DEFAULT 'scooter',
        base_price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0.0,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_variants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        battery_capacity VARCHAR(50) NOT NULL,
        range_km INTEGER NOT NULL,
        top_speed_kmh INTEGER NOT NULL,
        acceleration_sec DECIMAL(4,2) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        is_new BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_colors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_colors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color_code VARCHAR(7) NOT NULL,
        css_filter VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
        color_id UUID REFERENCES product_colors(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        alt_text VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_specifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_specifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
        spec_name VARCHAR(255) NOT NULL,
        spec_value VARCHAR(255) NOT NULL,
        spec_unit VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_features table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        feature_name VARCHAR(255) NOT NULL,
        feature_description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create accessories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accessories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_colors_product_id ON product_colors(product_id);
      CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_specs_product_id ON product_specifications(product_id);
      CREATE INDEX IF NOT EXISTS idx_features_product_id ON product_features(product_id);
    `);

    console.log('✅ Products schema created successfully!');

    // Insert sample data
    await insertSampleData();

  } catch (error) {
    console.error('❌ Error setting up products schema:', error);
    throw error;
  }
}

async function insertSampleData() {
  try {
    console.log('📦 Inserting sample product data...');

    // Insert Requeza S1 Pro+ product
    const s1ProPlusResult = await pool.query(`
      INSERT INTO products (name, slug, description, category, base_price, original_price, is_featured, rating, review_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      'Requeza S1 Pro+',
      'requeza-s1-pro-plus',
      'The most advanced electric scooter with cutting-edge technology and superior performance.',
      'scooter',
      129999.00,
      159999.00,
      true,
      4.5,
      1247
    ]);

    const s1ProPlusId = s1ProPlusResult.rows[0].id;

    // Insert Requeza S1 Pro product
    const s1ProResult = await pool.query(`
      INSERT INTO products (name, slug, description, category, base_price, original_price, is_featured, rating, review_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      'Requeza S1 Pro',
      'requeza-s1-pro',
      'Premium electric scooter with excellent performance and advanced features.',
      'scooter',
      119999.00,
      149999.00,
      true,
      4.3,
      892
    ]);

    const s1ProId = s1ProResult.rows[0].id;

    // Insert variants for S1 Pro+
    const s1ProPlusVariants = [
      { name: '2kWh', battery: '2kWh', range: 176, speed: 115, acceleration: 3.1, price: 129999, isNew: false },
      { name: '3kWh', battery: '3kWh', range: 195, speed: 120, acceleration: 2.6, price: 139999, isNew: true },
      { name: '4kWh', battery: '4kWh', range: 242, speed: 123, acceleration: 3.0, price: 149999, isNew: true },
      { name: '5.2kWh', battery: '5.2kWh', range: 320, speed: 141, acceleration: 2.1, price: 159999, isNew: false }
    ];

    for (const variant of s1ProPlusVariants) {
      await pool.query(`
        INSERT INTO product_variants (product_id, name, battery_capacity, range_km, top_speed_kmh, acceleration_sec, price, is_new)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [s1ProPlusId, variant.name, variant.battery, variant.range, variant.speed, variant.acceleration, variant.price, variant.isNew]);
    }

    // Insert variants for S1 Pro
    const s1ProVariants = [
      { name: '2kWh', battery: '2kWh', range: 150, speed: 110, acceleration: 3.2, price: 119999, isNew: false },
      { name: '3kWh', battery: '3kWh', range: 176, speed: 115, acceleration: 3.1, price: 129999, isNew: true },
      { name: '4kWh', battery: '4kWh', range: 195, speed: 120, acceleration: 2.6, price: 139999, isNew: true },
      { name: '5.2kWh', battery: '5.2kWh', range: 242, speed: 125, acceleration: 2.7, price: 149999, isNew: false }
    ];

    for (const variant of s1ProVariants) {
      await pool.query(`
        INSERT INTO product_variants (product_id, name, battery_capacity, range_km, top_speed_kmh, acceleration_sec, price, is_new)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [s1ProId, variant.name, variant.battery, variant.range, variant.speed, variant.acceleration, variant.price, variant.isNew]);
    }

    // Insert colors for both products
    const colors = [
      { name: 'Silver', code: '#9CA3AF', filter: 'grayscale(1)' },
      { name: 'Passion Red', code: '#EF4444', filter: 'hue-rotate(0deg) saturate(1.5)' },
      { name: 'Stellar Blue', code: '#3B82F6', filter: 'hue-rotate(200deg) saturate(1.2)' },
      { name: 'Midnight Blue', code: '#1E3A8A', filter: 'hue-rotate(220deg) saturate(1.5)' }
    ];

    for (const color of colors) {
      // Insert for S1 Pro+
      await pool.query(`
        INSERT INTO product_colors (product_id, name, color_code, css_filter)
        VALUES ($1, $2, $3, $4)
      `, [s1ProPlusId, color.name, color.code, color.filter]);

      // Insert for S1 Pro
      await pool.query(`
        INSERT INTO product_colors (product_id, name, color_code, css_filter)
        VALUES ($1, $2, $3, $4)
      `, [s1ProId, color.name, color.code, color.filter]);
    }

    // Insert images for S1 Pro+ (6 images)
    const s1ProPlusImages = [
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m1_o5y1jo.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562608/m2_xky6n1.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m3_tn7u9o.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m5_iq9xd7.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m4_nvk8rs.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m6_j0kype.webp'
    ];

    for (let i = 0; i < s1ProPlusImages.length; i++) {
      await pool.query(`
        INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
      `, [s1ProPlusId, s1ProPlusImages[i], `Requeza S1 Pro+ view ${i + 1}`, i, i === 0]);
    }

    // Insert images for S1 Pro (6 images)
    const s1ProImages = [
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n1_so0l6n.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n2_wnexzw.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n3_mxf4xf.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n4_xaznx8.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562614/n5_a9l6j5.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562615/n6_wesmwl.webp'
    ];

    for (let i = 0; i < s1ProImages.length; i++) {
      await pool.query(`
        INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
      `, [s1ProId, s1ProImages[i], `Requeza S1 Pro view ${i + 1}`, i, i === 0]);
    }

    // Insert accessories
    const accessories = [
      {
        name: 'Buddy Step Floor Mat and Scooter Cover combo',
        description: 'Complete protection package for your scooter',
        price: 3597.00,
        imageUrl: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:49:11.875.webp'
      },
      {
        name: 'Buddy Step and Floor Mat combo',
        description: 'Essential accessories for comfort and protection',
        price: 2598.00,
        imageUrl: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:52:22.439.webp'
      },
      {
        name: 'Buddy Step and Scooter Cover combo',
        description: 'Protection and convenience in one package',
        price: 2998.00,
        imageUrl: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_11:58:20.266.webp'
      },
      {
        name: 'Floor Mat and Scooter Cover combo',
        description: 'Basic protection accessories',
        price: 1598.00,
        imageUrl: 'https://d3hekx7hmqyjmq.cloudfront.net/accessoryStore/0_2025-06-11_12:03:19.606.webp'
      }
    ];

    for (const accessory of accessories) {
      await pool.query(`
        INSERT INTO accessories (name, description, price, image_url)
        VALUES ($1, $2, $3, $4)
      `, [accessory.name, accessory.description, accessory.price, accessory.imageUrl]);
    }

    console.log('✅ Sample data inserted successfully!');
    console.log('🎉 Products database setup completed!');

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupProductsSchema()
    .then(() => {
      console.log('✅ Products schema setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Products schema setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupProductsSchema };
