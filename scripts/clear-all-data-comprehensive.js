const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'riqueza_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: false, // Disable SSL for local development
});

async function clearAllData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting comprehensive data clearing...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // List of tables to clear (in dependency order)
    const tablesToClear = [
      'order_items',
      'orders', 
      'cart_items',
      'cart',
      'otps',
      'users'
    ];
    
    console.log('📋 Tables to clear:', tablesToClear);
    
    // Clear each table
    for (const table of tablesToClear) {
      try {
        console.log(`🗑️  Clearing table: ${table}`);
        
        // Check if table exists first
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (tableExists.rows[0].exists) {
          const result = await client.query(`DELETE FROM ${table}`);
          console.log(`✅ Cleared ${result.rowCount} rows from ${table}`);
        } else {
          console.log(`⚠️  Table ${table} does not exist, skipping...`);
        }
      } catch (error) {
        console.error(`❌ Error clearing table ${table}:`, error.message);
        // Continue with other tables even if one fails
      }
    }
    
    // Reset sequences if they exist
    const sequencesToReset = [
      'users_id_seq',
      'otps_id_seq', 
      'cart_id_seq',
      'cart_items_id_seq',
      'orders_id_seq',
      'order_items_id_seq'
    ];
    
    console.log('🔄 Resetting sequences...');
    for (const sequence of sequencesToReset) {
      try {
        const sequenceExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_sequences 
            WHERE schemaname = 'public' 
            AND sequencename = $1
          );
        `, [sequence]);
        
        if (sequenceExists.rows[0].exists) {
          await client.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
          console.log(`✅ Reset sequence: ${sequence}`);
        } else {
          console.log(`⚠️  Sequence ${sequence} does not exist, skipping...`);
        }
      } catch (error) {
        console.error(`❌ Error resetting sequence ${sequence}:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ All data cleared successfully!');
    
    // Verify tables are empty
    console.log('🔍 Verifying tables are empty...');
    for (const table of tablesToClear) {
      try {
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (tableExists.rows[0].exists) {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
          const count = countResult.rows[0].count;
          console.log(`📊 Table ${table}: ${count} rows remaining`);
        }
      } catch (error) {
        console.error(`❌ Error checking table ${table}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during data clearing:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
clearAllData()
  .then(() => {
    console.log('🎉 Database clearing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database clearing failed:', error);
    process.exit(1);
  });
