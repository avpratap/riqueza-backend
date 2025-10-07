const JWTService = require('../utils/jwt');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    console.log('🔐 Verifying token...');
    const decoded = JWTService.verifyToken(token);
    console.log('✅ Token verified for user:', decoded.id);
    
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ User not found:', decoded.id);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User authenticated:', user.phone);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      message: 'Please log in again to get a new token'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
