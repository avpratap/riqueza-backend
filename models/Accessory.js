const pool = require('../config/database');

class Accessory {
  static async getAll() {
    const query = `
      SELECT *
      FROM accessories
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(accessory => ({
        ...accessory,
        id: `acc_${accessory.id}`,
        price: parseFloat(accessory.price) // Convert price from string to number
      }));
    } catch (error) {
      throw error;
    }
  }

  static async getById(id) {
    // Convert prefixed ID to pure UUID for database query
    const pureUuid = id.includes('_') ? id.split('_')[1] : id;
    
    const query = 'SELECT * FROM accessories WHERE id = $1 AND is_active = true';
    const values = [pureUuid];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `acc_${result.rows[0].id}`,
          price: parseFloat(result.rows[0].price) // Convert price from string to number
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async create(accessoryData) {
    const { name, description, price, image_url } = accessoryData;
    
    const query = `
      INSERT INTO accessories (name, description, price, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [name, description, price, image_url];
    
    try {
      const result = await pool.query(query, values);
      const accessory = result.rows[0];
      return {
        ...accessory,
        id: `acc_${accessory.id}`
      };
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
      UPDATE accessories 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `acc_${result.rows[0].id}`
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
    
    const query = 'UPDATE accessories SET is_active = false WHERE id = $1 RETURNING *';
    const values = [pureUuid];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          id: `acc_${result.rows[0].id}`
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Accessory;
