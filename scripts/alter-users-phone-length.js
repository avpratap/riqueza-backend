/**
 * Script to alter users table phone column length
 * Run this to increase phone VARCHAR limit from 20 to 50
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.EXTERNAL_DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

async function alterPhoneColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Altering users table phone column...');
    
    // Alter the phone column to VARCHAR(50)
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN phone TYPE VARCHAR(50)
    `);
    
    console.log('✅ Successfully altered phone column to VARCHAR(50)');
    
    // Verify the change
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    console.log('📊 Phone column info:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error altering phone column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

alterPhoneColumn()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

