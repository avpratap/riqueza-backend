const pool = require('../config/database');

async function clearAllData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting to clear all database data...');
    
    // Clear tables in order to respect foreign key constraints
    const tables = [
      'order_status_history',
      'order_items', 
      'orders',
      'cart_items',
      'otps',
      'users'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        console.error(`❌ Error clearing ${table}:`, error.message);
      }
    }
    
    // Reset sequences
    const sequences = [
      'users_id_seq',
      'otps_id_seq', 
      'cart_items_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'order_status_history_id_seq'
    ];
    
    for (const sequence of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        console.log(`✅ Reset sequence ${sequence}`);
      } catch (error) {
        console.log(`ℹ️ Sequence ${sequence} doesn't exist or already reset`);
      }
    }
    
    console.log('🎉 All database data cleared successfully!');
    console.log('📊 Summary:');
    console.log('   - All users deleted');
    console.log('   - All OTPs deleted');
    console.log('   - All cart items deleted');
    console.log('   - All orders deleted');
    console.log('   - All sequences reset to 1');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

clearAllData();

