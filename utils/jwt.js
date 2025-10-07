const jwt = require('jsonwebtoken');

// Use a default secret for production if not set (not recommended for real production)
const JWT_SECRET = process.env.JWT_SECRET || 'riqueza-default-secret-key-change-in-production-2024';

class JWTService {
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static generateUserToken(user) {
    const payload = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    return this.generateToken(payload);
  }
}

module.exports = JWTService;
