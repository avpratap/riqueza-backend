const jwt = require('jsonwebtoken');

class JWTService {
  static generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
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
