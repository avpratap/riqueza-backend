const pool = require('../config/database');

async function fixDatabase() {
  try {
    console.log('🔄 Fixing database schema...');

    // Create users table with UUID
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');

    // Create OTPs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        verification_id VARCHAR(100) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ OTPs table created/verified');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_otps_verification_id ON otps(verification_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps(phone_number)');
    console.log('✅ Indexes created/verified');

    // Create function for updated_at trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('✅ Function created/verified');

    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Trigger created/verified');

    // Test the setup
    const testUser = await pool.query(`
      INSERT INTO users (phone, name) 
      VALUES ('+1234567890', 'Test User') 
      RETURNING id, phone, name
    `);
    console.log('✅ Test user created:', testUser.rows[0]);

    // Clean up test user
    await pool.query('DELETE FROM users WHERE phone = $1', ['+1234567890']);
    console.log('✅ Test user cleaned up');

    console.log('🎉 Database schema fixed successfully!');

  } catch (error) {
    console.error('❌ Database fix failed:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixDatabase()
    .then(() => {
      console.log('✅ Database fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDatabase };
