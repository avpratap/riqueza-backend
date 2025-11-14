const { Pool } = require('pg');
require('dotenv').config();

// Create pool connection with the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function setupUUIDDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting UUID-based database setup...');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🏠 Host: ${process.env.DB_HOST}`);
    console.log('');

    // Start transaction
    await client.query('BEGIN');

    // Enable UUID extension
    console.log('📝 Enabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Drop existing tables in correct order (reverse of dependencies)
    console.log('\n🗑️ Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS order_status_history CASCADE');
    await client.query('DROP TABLE IF EXISTS order_items CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS cart_items CASCADE');
    await client.query('DROP TABLE IF EXISTS reviews CASCADE');
    await client.query('DROP TABLE IF EXISTS contact_messages CASCADE');
    await client.query('DROP TABLE IF EXISTS product_features CASCADE');
    await client.query('DROP TABLE IF EXISTS product_specifications CASCADE');
    await client.query('DROP TABLE IF EXISTS product_images CASCADE');
    await client.query('DROP TABLE IF EXISTS product_colors CASCADE');
    await client.query('DROP TABLE IF EXISTS product_variants CASCADE');
    await client.query('DROP TABLE IF EXISTS accessories CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS otps CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Existing tables dropped');

    // Create helper function for timestamps
    console.log('\n📝 Creating helper functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Helper functions created');

    // Create users table with UUID
    console.log('\n📝 Creating users table with UUID...');
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE otps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone_number VARCHAR(20) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        verification_id VARCHAR(100) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_otps_verification_id ON otps(verification_id);
      CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps(phone_number);
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Users and OTP tables created with UUID');

    // Create products tables
    console.log('\n📝 Creating products tables...');
    await client.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await client.query(`
      CREATE TABLE product_variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await client.query(`
      CREATE TABLE product_colors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color_code VARCHAR(7) NOT NULL,
        css_filter VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE product_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await client.query(`
      CREATE TABLE product_specifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
        spec_name VARCHAR(255) NOT NULL,
        spec_value VARCHAR(255) NOT NULL,
        spec_unit VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE product_features (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        feature_name VARCHAR(255) NOT NULL,
        feature_description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE accessories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_colors_product_id ON product_colors(product_id);
      CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_specs_product_id ON product_specifications(product_id);
      CREATE INDEX IF NOT EXISTS idx_features_product_id ON product_features(product_id);
    `);
    console.log('✅ Products tables created with UUID');

    // Create cart and order tables with UUID
    console.log('\n📝 Creating cart and order tables with UUID...');
    await client.query(`
      CREATE TABLE cart_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        variant_id UUID NOT NULL,
        color_id UUID NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        accessories JSONB DEFAULT '[]',
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, variant_id, color_id)
      )
    `);

    await client.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2) NOT NULL,
        customer_info JSONB NOT NULL,
        delivery_info JSONB NOT NULL,
        payment_info JSONB NOT NULL,
        order_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        variant_id UUID NOT NULL,
        color_id UUID NOT NULL,
        quantity INTEGER NOT NULL,
        accessories JSONB DEFAULT '[]',
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE order_status_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
      CREATE TRIGGER update_cart_items_updated_at 
        BEFORE UPDATE ON cart_items 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at 
        BEFORE UPDATE ON orders 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TEXT AS $$
      DECLARE
          order_num TEXT;
          counter INTEGER;
      BEGIN
          order_num := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
          SELECT COALESCE(COUNT(*), 0) + 1 INTO counter
          FROM orders 
          WHERE DATE(created_at) = CURRENT_DATE;
          order_num := 'REQ-' || order_num || '-' || LPAD(counter::TEXT, 4, '0');
          RETURN order_num;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Cart and order tables created with UUID');

    // Create contact and review tables
    console.log('\n📝 Creating contact and review tables...');
    await client.query(`
      CREATE TABLE contact_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200) NOT NULL,
        review TEXT NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        user_email VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
    `);
    console.log('✅ Contact and review tables created');

    // Insert sample products with UUID
    console.log('\n📦 Inserting sample product data...');
    
    const s1ProPlusResult = await client.query(`
      INSERT INTO products (name, slug, description, category, base_price, original_price, is_featured, rating, review_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      'Riqueza S1 Pro+',
      'riqueza-s1-pro-plus',
      'The most advanced electric scooter with cutting-edge technology and superior performance.',
      'scooter',
      129999.00,
      159999.00,
      true,
      4.5,
      1247
    ]);

    const s1ProPlusId = s1ProPlusResult.rows[0].id;
    console.log(`✅ Product 1: Riqueza S1 Pro+ (ID: ${s1ProPlusId})`);

    const s1ProResult = await client.query(`
      INSERT INTO products (name, slug, description, category, base_price, original_price, is_featured, rating, review_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      'Riqueza S1 Pro',
      'riqueza-s1-pro',
      'Premium electric scooter with excellent performance and advanced features.',
      'scooter',
      119999.00,
      149999.00,
      true,
      4.3,
      892
    ]);

    const s1ProId = s1ProResult.rows[0].id;
    console.log(`✅ Product 2: Riqueza S1 Pro (ID: ${s1ProId})`);

    // Insert variants
    const s1ProPlusVariants = [
      { name: '2kWh', battery: '2kWh', range: 176, speed: 115, acceleration: 3.1, price: 129999, isNew: false },
      { name: '3kWh', battery: '3kWh', range: 195, speed: 120, acceleration: 2.6, price: 139999, isNew: true },
      { name: '4kWh', battery: '4kWh', range: 242, speed: 123, acceleration: 3.0, price: 149999, isNew: true },
      { name: '5.2kWh', battery: '5.2kWh', range: 320, speed: 141, acceleration: 2.1, price: 159999, isNew: false }
    ];

    for (const variant of s1ProPlusVariants) {
      await client.query(`
        INSERT INTO product_variants (product_id, name, battery_capacity, range_km, top_speed_kmh, acceleration_sec, price, is_new)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [s1ProPlusId, variant.name, variant.battery, variant.range, variant.speed, variant.acceleration, variant.price, variant.isNew]);
    }
    console.log(`✅ Added ${s1ProPlusVariants.length} variants for S1 Pro+`);

    const s1ProVariants = [
      { name: '2kWh', battery: '2kWh', range: 150, speed: 110, acceleration: 3.2, price: 119999, isNew: false },
      { name: '3kWh', battery: '3kWh', range: 176, speed: 115, acceleration: 3.1, price: 129999, isNew: true },
      { name: '4kWh', battery: '4kWh', range: 195, speed: 120, acceleration: 2.6, price: 139999, isNew: true },
      { name: '5.2kWh', battery: '5.2kWh', range: 242, speed: 125, acceleration: 2.7, price: 149999, isNew: false }
    ];

    for (const variant of s1ProVariants) {
      await client.query(`
        INSERT INTO product_variants (product_id, name, battery_capacity, range_km, top_speed_kmh, acceleration_sec, price, is_new)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [s1ProId, variant.name, variant.battery, variant.range, variant.speed, variant.acceleration, variant.price, variant.isNew]);
    }
    console.log(`✅ Added ${s1ProVariants.length} variants for S1 Pro`);

    // Insert colors
    const colors = [
      { name: 'Silver', code: '#9CA3AF', filter: 'grayscale(1)' },
      { name: 'Passion Red', code: '#EF4444', filter: 'hue-rotate(0deg) saturate(1.5)' },
      { name: 'Stellar Blue', code: '#3B82F6', filter: 'hue-rotate(200deg) saturate(1.2)' },
      { name: 'Midnight Blue', code: '#1E3A8A', filter: 'hue-rotate(220deg) saturate(1.5)' }
    ];

    for (const color of colors) {
      await client.query(`
        INSERT INTO product_colors (product_id, name, color_code, css_filter)
        VALUES ($1, $2, $3, $4)
      `, [s1ProPlusId, color.name, color.code, color.filter]);

      await client.query(`
        INSERT INTO product_colors (product_id, name, color_code, css_filter)
        VALUES ($1, $2, $3, $4)
      `, [s1ProId, color.name, color.code, color.filter]);
    }
    console.log(`✅ Added ${colors.length} colors for each product`);

    // Insert images for S1 Pro+
    const s1ProPlusImages = [
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m1_o5y1jo.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562608/m2_xky6n1.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m3_tn7u9o.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m5_iq9xd7.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m4_nvk8rs.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562609/m6_j0kype.webp'
    ];

    for (let i = 0; i < s1ProPlusImages.length; i++) {
      await client.query(`
        INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
      `, [s1ProPlusId, s1ProPlusImages[i], `Riqueza S1 Pro+ view ${i + 1}`, i, i === 0]);
    }
    console.log(`✅ Added ${s1ProPlusImages.length} images for S1 Pro+`);

    // Insert images for S1 Pro
    const s1ProImages = [
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n1_so0l6n.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n2_wnexzw.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n3_mxf4xf.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562610/n4_xaznx8.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562614/n5_a9l6j5.webp',
      'https://res.cloudinary.com/dnulm62j6/image/upload/v1758562615/n6_wesmwl.webp'
    ];

    for (let i = 0; i < s1ProImages.length; i++) {
      await client.query(`
        INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
      `, [s1ProId, s1ProImages[i], `Riqueza S1 Pro view ${i + 1}`, i, i === 0]);
    }
    console.log(`✅ Added ${s1ProImages.length} images for S1 Pro`);

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
      await client.query(`
        INSERT INTO accessories (name, description, price, image_url)
        VALUES ($1, $2, $3, $4)
      `, [accessory.name, accessory.description, accessory.price, accessory.imageUrl]);
    }
    console.log(`✅ Added ${accessories.length} accessories`);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n' + '='.repeat(70));
    console.log('🎉 UUID DATABASE SETUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   ✅ UUID extension enabled');
    console.log('   ✅ All tables created with UUID primary keys');
    console.log('   ✅ User IDs are now UUID');
    console.log('   ✅ Product IDs are UUID');
    console.log('   ✅ Cart uses UUID for user_id');
    console.log('   ✅ Orders use UUID for user_id');
    console.log('   ✅ 2 products inserted');
    console.log('   ✅ 8 variants inserted');
    console.log('   ✅ 8 colors inserted');
    console.log('   ✅ 12 images inserted');
    console.log('   ✅ 4 accessories inserted');
    console.log('\n🚀 Restart your backend server to use the new schema!');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
if (require.main === module) {
  setupUUIDDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupUUIDDatabase };

