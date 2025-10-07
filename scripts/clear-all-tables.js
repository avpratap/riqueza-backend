const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'requeza_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function clearAllTables() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting to clear all tables...');
    
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
    
    console.log('🎉 All tables cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllTables();
