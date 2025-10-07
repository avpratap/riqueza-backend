const twilio = require('twilio');
const { generateOTP, generateVerificationId, getOTPExpirationTime } = require('./otpGenerator');
const OTP = require('../models/OTP');

// Initialize Twilio client only when needed
let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

class SMSService {
  static async sendOTP(phoneNumber) {
    try {
      // Clean up expired OTPs
      await OTP.cleanupExpired();

      // Generate OTP and verification ID
      const otp = generateOTP();
      const verificationId = generateVerificationId();
      const expiresAt = getOTPExpirationTime();

      // Store OTP in database
      await OTP.create({
        phoneNumber,
        otp,
        verificationId,
        expiresAt
      });

      // Send SMS via Twilio (with trial account handling)
      const client = getTwilioClient();
      if (client) {
        try {
          const message = await client.messages.create({
            body: `Your Riqueza Electric OTP is: ${otp}. Valid for 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          console.log('✅ SMS sent successfully:', message.sid);
        } catch (smsError) {
          console.error('❌ SMS sending failed:', smsError.message);
          
          // Handle trial account limitations
          if (smsError.code === 63038) {
            console.log('⚠️ Daily message limit exceeded for trial account');
          } else if (smsError.code === 21608) {
            console.log('⚠️ Phone number not verified in trial account');
          }
          
          console.log('📱 Development Mode - OTP not sent via SMS due to trial limitations');
          console.log('🔑 Generated OTP:', otp);
          console.log('💡 To send SMS to any number, upgrade your Twilio account or verify the phone number');
        }
      } else {
        console.log('⚠️ Twilio client not configured - OTP not sent via SMS');
        console.log('🔑 Generated OTP:', otp);
      }

      return {
        success: true,
        verificationId,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  static async verifyOTP(verificationId, enteredOTP, phoneNumber) {
    try {
      // Clean up expired OTPs
      await OTP.cleanupExpired();

      // Verify OTP
      const otpRecord = await OTP.verify(verificationId, enteredOTP, phoneNumber);

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      // Mark OTP as used
      await OTP.markAsUsed(verificationId);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('OTP verification failed:', error);
      return {
        success: false,
        error: error.message || 'OTP verification failed'
      };
    }
  }

  static async verifyOTPOnly(verificationId, enteredOTP, phoneNumber) {
    try {
      // Clean up expired OTPs
      await OTP.cleanupExpired();

      // Verify OTP without marking as used
      const otpRecord = await OTP.verify(verificationId, enteredOTP, phoneNumber);

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      return {
        success: true,
        message: 'OTP verified successfully (not consumed)'
      };

    } catch (error) {
      console.error('OTP verification failed:', error);
      return {
        success: false,
        error: error.message || 'OTP verification failed'
      };
    }
  }

  static async consumeOTP(verificationId) {
    try {
      const result = await OTP.delete(verificationId);
      
      if (!result) {
        return {
          success: false,
          error: 'OTP not found'
        };
      }

      return {
        success: true,
        message: 'OTP consumed successfully'
      };

    } catch (error) {
      console.error('OTP consumption failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to consume OTP'
      };
    }
  }
}

module.exports = SMSService;
