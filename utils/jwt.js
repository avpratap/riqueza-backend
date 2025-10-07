const jwt = require('jsonwebtoken');

// Use environment variable for JWT secret (development-ready approach)
const JWT_SECRET = process.env.JWT_SECRET || 'riqueza-development-secret-key-2024';

console.log('🔑 JWT Secret configured:', JWT_SECRET ? 'YES' : 'NO');
console.log('🔑 Using JWT secret from environment or development fallback');

class JWTService {
  static generateToken(payload) {
    console.log('🔐 Generating token for user:', payload.phone);
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static verifyToken(token) {
    try {
      console.log('🔍 Verifying token with secret length:', JWT_SECRET.length);
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token valid for user:', decoded.phone);
      return decoded;
    } catch (error) {
      console.error('❌ Token verification error:', error.message);
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
