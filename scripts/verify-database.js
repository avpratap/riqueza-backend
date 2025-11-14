const pool = require('../config/database');
require('dotenv').config();

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database setup...\n');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🏠 Host: ${process.env.DB_HOST}\n`);
    
    // Check tables
    console.log('📋 Checking tables...');
    
    const tables = [
      'users',
      'otps',
      'products',
      'product_variants',
      'product_colors',
      'product_images',
      'product_specifications',
      'product_features',
      'accessories',
      'cart_items',
      'orders',
      'order_items',
      'order_status_history',
      'contact_messages',
      'reviews'
    ];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${count > 0 ? '✅' : '⚠️ '} ${table.padEnd(25)} - ${count} records`);
    }
    
    console.log('\n📦 Product Details:');
    const products = await client.query(`
      SELECT id, name, slug, base_price, is_featured 
      FROM products 
      ORDER BY created_at
    `);
    
    for (const product of products.rows) {
      console.log(`\n   📱 ${product.name}`);
      console.log(`      ID: ${product.id}`);
      console.log(`      Slug: ${product.slug}`);
      console.log(`      Price: ₹${product.base_price}`);
      console.log(`      Featured: ${product.is_featured ? 'Yes' : 'No'}`);
      
      // Count variants
      const variantsResult = await client.query(
        'SELECT COUNT(*) FROM product_variants WHERE product_id = $1',
        [product.id]
      );
      console.log(`      Variants: ${variantsResult.rows[0].count}`);
      
      // Count colors
      const colorsResult = await client.query(
        'SELECT COUNT(*) FROM product_colors WHERE product_id = $1',
        [product.id]
      );
      console.log(`      Colors: ${colorsResult.rows[0].count}`);
      
      // Count images
      const imagesResult = await client.query(
        'SELECT COUNT(*) FROM product_images WHERE product_id = $1',
        [product.id]
      );
      console.log(`      Images: ${imagesResult.rows[0].count}`);
    }
    
    console.log('\n🎉 Database verification complete!\n');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyDatabase();
}

module.exports = { verifyDatabase };

