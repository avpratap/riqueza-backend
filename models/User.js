const pool = require('../config/database');

class User {
  static async create(userData) {
    const { phone, name, email, role = 'user' } = userData;
    
    // Database will auto-generate UUID using uuid_generate_v4()
    const query = `
      INSERT INTO users (phone, name, email, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [phone, name, email, role];
    
    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];
      
      console.log('✅ User created with UUID:', user.id);
      // Return user with UUID
      return user;
    } catch (error) {
      console.error('❌ User creation error:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1';
    const values = [phone];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Find by phone error:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const values = [id];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Find by ID error:', error);
      throw error;
    }
  }

  static async exists(phone) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)';
    const values = [phone];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0].exists;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const values = [id];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  static async getAll() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }
}

module.exports = User;
