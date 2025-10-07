const SMSService = require('../utils/smsService');
const JWTService = require('../utils/jwt');
const User = require('../models/User');

class AuthController {
  // Send OTP to phone number
  static async sendOTP(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      const result = await SMSService.sendOTP(phoneNumber);

      if (result.success) {
        res.json({
          success: true,
          verificationId: result.verificationId,
          message: 'OTP sent successfully',
          ...(result.otp && { otp: result.otp }) // Include OTP in development mode
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verify OTP only (for signup flow)
  static async verifyOTPOnly(req, res) {
    try {
      const { verificationId, otp, phoneNumber } = req.body;

      if (!verificationId || !otp || !phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Verification ID, OTP, and phone number are required'
        });
      }

      const result = await SMSService.verifyOTPOnly(verificationId, otp, phoneNumber);

      if (result.success) {
        res.json({
          success: true,
          message: 'OTP verified successfully (not consumed)'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Verify OTP Only Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Sign up new user
  static async signup(req, res) {
    try {
      const { phoneNumber, name, email, otp, verificationId } = req.body;

      // First verify OTP
      const otpResult = await SMSService.verifyOTPOnly(verificationId, otp, phoneNumber);
      
      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          error: otpResult.error
        });
      }

      // Check if user already exists
      const userExists = await User.exists(phoneNumber);
      if (userExists) {
        return res.status(400).json({
          success: false,
          error: 'User already exists. Please login instead.'
        });
      }

      // Create new user
      const user = await User.create({
        phone: phoneNumber,
        name: name.trim(),
        email: email?.trim() || null
      });

      // Generate JWT token
      const token = JWTService.generateUserToken(user);

      // Consume the OTP
      await SMSService.consumeOTP(verificationId);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified
        },
        token
      });
    } catch (error) {
      console.error('Signup Error:', error);
      
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(400).json({
          success: false,
          error: 'User already exists with this phone number'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Login existing user
  static async login(req, res) {
    try {
      const { phoneNumber, otp, verificationId } = req.body;

      // First verify OTP
      const otpResult = await SMSService.verifyOTP(verificationId, otp, phoneNumber);
      
      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          error: otpResult.error
        });
      }

      // Find user by phone number
      const user = await User.findByPhone(phoneNumber);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please signup first.'
        });
      }

      // Generate JWT token
      const token = JWTService.generateUserToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified
        },
        token
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.is_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, email } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email?.trim() || null;

      const updatedUser = await User.update(userId, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isVerified: updatedUser.is_verified
        }
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Consume OTP (for cleanup after signup)
  static async consumeOTP(req, res) {
    try {
      const { verificationId } = req.body;

      if (!verificationId) {
        return res.status(400).json({
          success: false,
          error: 'Verification ID is required'
        });
      }

      const result = await SMSService.consumeOTP(verificationId);

      if (result.success) {
        res.json({
          success: true,
          message: 'OTP consumed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Consume OTP Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;
