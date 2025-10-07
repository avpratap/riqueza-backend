const UUIDGenerator = require('./uuidGenerator');

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique verification ID using UUID
const generateVerificationId = () => {
  return UUIDGenerator.generateVerificationId();
};

// Calculate OTP expiration time (5 minutes from now)
const getOTPExpirationTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
};

module.exports = {
  generateOTP,
  generateVerificationId,
  getOTPExpirationTime
};
