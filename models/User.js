const pool = require('../config/database');
const UUIDGenerator = require('../utils/uuidGenerator');

class User {
  static async create(userData) {
    const { phone, name, email, role = 'user' } = userData;
    const userId = await UUIDGenerator.generate(); // Pure UUID for database
    
    const query = `
      INSERT INTO users (id, phone, name, email, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, phone, name, email, role];
    
    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];
      
      // Convert to prefixed format for application use
      return {
        ...user,
        id: `usr_${user.id}` // Convert to prefixed format using original UUID
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1';
    const values = [phone];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `usr_${result.rows[0].id}` // Convert to prefixed format using original UUID
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const query = 'SELECT * FROM users WHERE id = $1';
    const values = [pureUuid];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `usr_${result.rows[0].id}` // Convert to prefixed format using original UUID
        };
      }
      return null;
    } catch (error) {
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
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
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

    values.push(pureUuid);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `usr_${result.rows[0].id}` // Convert to prefixed format using original UUID
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const values = [pureUuid];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `usr_${result.rows[0].id}` // Convert to prefixed format using original UUID
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(user => ({
        ...user,
        id: `usr_${user.id}` // Convert to prefixed format using original UUID
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
