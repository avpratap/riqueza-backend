const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateOTP = (otp) => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

const validateRequest = (req, res, next) => {
  const { phoneNumber } = req.body;

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Use international format (e.g., +919876543210)'
    });
  }

  next();
};

const validateSignupRequest = (req, res, next) => {
  const { phoneNumber, name, email, otp, verificationId } = req.body;

  if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Valid phone number is required'
    });
  }

  if (!name || !validateName(name)) {
    return res.status(400).json({
      success: false,
      error: 'Valid name is required (2-100 characters)'
    });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  if (!otp || !validateOTP(otp)) {
    return res.status(400).json({
      success: false,
      error: 'Valid 6-digit OTP is required'
    });
  }

  if (!verificationId) {
    return res.status(400).json({
      success: false,
      error: 'Verification ID is required'
    });
  }

  next();
};

const validateLoginRequest = (req, res, next) => {
  const { phoneNumber, otp, verificationId } = req.body;

  if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Valid phone number is required'
    });
  }

  if (!otp || !validateOTP(otp)) {
    return res.status(400).json({
      success: false,
      error: 'Valid 6-digit OTP is required'
    });
  }

  if (!verificationId) {
    return res.status(400).json({
      success: false,
      error: 'Verification ID is required'
    });
  }

  next();
};

module.exports = {
  validatePhoneNumber,
  validateEmail,
  validateOTP,
  validateName,
  validateRequest,
  validateSignupRequest,
  validateLoginRequest
};
