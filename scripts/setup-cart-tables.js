const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'riqueza',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function setupCartTables() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up cart and order tables...');
    
    // Read the cart schema file
    const schemaPath = path.join(__dirname, '../config/cart-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await client.query(schema);
    
    console.log('✅ Cart and order tables created successfully!');
    console.log('Tables created:');
    console.log('- cart_items');
    console.log('- orders');
    console.log('- order_items');
    console.log('- order_status_history');
    
  } catch (error) {
    console.error('❌ Error setting up cart tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await setupCartTables();
    console.log('🎉 Database setup completed successfully!');
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

module.exports = { setupCartTables };
