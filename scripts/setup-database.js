const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Don't specify database here - we need to create it first
});

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Connect to PostgreSQL server (not specific database)
    const client = await pool.connect();
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME;
    await client.query(`CREATE DATABASE "${dbName}"`, (err) => {
      if (err && err.code !== '42P04') { // 42P04 = database already exists
        console.error('❌ Error creating database:', err.message);
      } else if (err && err.code === '42P04') {
        console.log('✅ Database already exists');
      } else {
        console.log('✅ Database created successfully');
      }
    });
    
    client.release();
    
    // Now connect to the specific database
    const dbPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    
    const dbClient = await dbPool.connect();
    
    // Create tables
    console.log('🔄 Creating tables...');
    
    // Users table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // OTPs table
    await dbClient.query(`
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
    console.log('✅ OTPs table created');
    
    // Create indexes
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_otps_verification_id ON otps(verification_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps(phone_number)');
    console.log('✅ Indexes created');
    
    // Create function and trigger for updated_at
    await dbClient.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await dbClient.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Triggers created');
    
    dbClient.release();
    await dbPool.end();
    
    console.log('🎉 Database setup completed successfully!');
    console.log(`📊 Database: ${dbName}`);
    console.log(`👤 User: ${process.env.DB_USER}`);
    console.log(`🏠 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
