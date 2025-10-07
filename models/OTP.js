const pool = require('../config/database');

class OTP {
  static async create(otpData) {
    const { phoneNumber, otp, verificationId, expiresAt } = otpData;
    const query = `
      INSERT INTO otps (phone_number, otp, verification_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [phoneNumber, otp, verificationId, expiresAt];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByVerificationId(verificationId) {
    const query = 'SELECT * FROM otps WHERE verification_id = $1';
    const values = [verificationId];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async verify(verificationId, enteredOTP, phoneNumber) {
    const query = `
      SELECT * FROM otps 
      WHERE verification_id = $1 
      AND phone_number = $2 
      AND otp = $3 
      AND expires_at > NOW() 
      AND is_used = false
    `;
    const values = [verificationId, phoneNumber, enteredOTP];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async markAsUsed(verificationId) {
    const query = `
      UPDATE otps 
      SET is_used = true 
      WHERE verification_id = $1 
      RETURNING *
    `;
    const values = [verificationId];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(verificationId) {
    const query = 'DELETE FROM otps WHERE verification_id = $1 RETURNING *';
    const values = [verificationId];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async cleanupExpired() {
    const query = 'DELETE FROM otps WHERE expires_at < NOW()';
    
    try {
      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  static async getByPhoneNumber(phoneNumber) {
    const query = `
      SELECT * FROM otps 
      WHERE phone_number = $1 
      AND expires_at > NOW() 
      AND is_used = false
      ORDER BY created_at DESC
    `;
    const values = [phoneNumber];
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OTP;
