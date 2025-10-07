const db = require('../config/database');

async function addCartTables() {
  const client = await db.connect();
  
  try {
    console.log('Adding cart and order tables to existing database...');
    
    // Create cart_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        variant_id VARCHAR(50) NOT NULL,
        color_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        accessories JSONB DEFAULT '[]',
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, variant_id, color_id)
      );
    `);
    console.log('✅ Created cart_items table');

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
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
      );
    `);
    console.log('✅ Created orders table');

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        variant_id VARCHAR(50) NOT NULL,
        color_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        accessories JSONB DEFAULT '[]',
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created order_items table');

    // Create order_status_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created order_status_history table');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
    `);
    console.log('✅ Created indexes');

    // Create function to generate order number
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TEXT AS $$
      DECLARE
          order_num TEXT;
          counter INTEGER;
      BEGIN
          -- Get current date in YYYYMMDD format
          order_num := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
          
          -- Get count of orders for today
          SELECT COALESCE(COUNT(*), 0) + 1 INTO counter
          FROM orders 
          WHERE DATE(created_at) = CURRENT_DATE;
          
          -- Format: REQ-YYYYMMDD-XXXX
          order_num := 'REQ-' || order_num || '-' || LPAD(counter::TEXT, 4, '0');
          
          RETURN order_num;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created generate_order_number function');

    // Create trigger to update updated_at for cart_items
    await client.query(`
      CREATE TRIGGER update_cart_items_updated_at 
          BEFORE UPDATE ON cart_items 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Created cart_items update trigger');

    // Create trigger to update updated_at for orders
    await client.query(`
      CREATE TRIGGER update_orders_updated_at 
          BEFORE UPDATE ON orders 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Created orders update trigger');

    console.log('🎉 All cart and order tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addCartTables();
    console.log('✅ Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { addCartTables };
