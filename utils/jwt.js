const jwt = require('jsonwebtoken');

// Force use of our new secret for production (overriding any old environment variables)
const JWT_SECRET = 'riqueza-default-secret-key-change-in-production-2024';

console.log('🔑 JWT Secret configured:', JWT_SECRET ? 'YES' : 'NO');
console.log('🔑 Using forced JWT secret for production');

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
