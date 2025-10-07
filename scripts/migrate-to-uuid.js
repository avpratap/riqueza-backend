const pool = require('../config/database');

async function migrateToUUID() {
  try {
    console.log('🔄 Starting migration to UUID schema...');

    // First, let's check if the users table exists and what its current structure is
    const checkTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table structure:');
    checkTable.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Check if users table has any data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`Current users count: ${userCount.rows[0].count}`);

    if (userCount.rows[0].count > 0) {
      console.log('⚠️ Users table has data. Backing up...');
      
      // Create backup table
      await pool.query(`
        CREATE TABLE users_backup AS 
        SELECT * FROM users
      `);
      console.log('✅ Users data backed up to users_backup table');
    }

    // Drop existing users table
    console.log('🔄 Dropping existing users table...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    // Create new users table with UUID
    console.log('🔄 Creating new users table with UUID...');
    await pool.query(`
      CREATE TABLE users (
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

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    console.log('✅ Users table recreated with UUID');

    // Create function and trigger for updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Triggers created');

    // Check if we need to migrate data from backup
    const backupExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users_backup'
      )
    `);

    if (backupExists.rows[0].exists) {
      console.log('🔄 Migrating data from backup...');
      
      // Get backup data
      const backupData = await pool.query('SELECT * FROM users_backup');
      
      for (const user of backupData.rows) {
        await pool.query(`
          INSERT INTO users (phone, name, email, role, is_verified, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          user.phone,
          user.name,
          user.email,
          user.role,
          user.is_verified,
          user.created_at,
          user.updated_at
        ]);
      }
      
      console.log(`✅ Migrated ${backupData.rows.length} users from backup`);
      
      // Drop backup table
      await pool.query('DROP TABLE users_backup');
      console.log('✅ Backup table cleaned up');
    }

    console.log('🎉 Migration to UUID completed successfully!');
    console.log('📊 New users table structure:');
    
    const newStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    newStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateToUUID()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToUUID };