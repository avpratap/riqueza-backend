// Simple UUID v4 generator without external dependencies
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class UUIDGenerator {
  /**
   * Generate a new UUID v4
   * @returns {string} A new UUID
   */
  static generate() {
    return generateUUID();
  }

  /**
   * Generate a UUID with a prefix
   * @param {string} prefix - Prefix to add to the UUID
   * @returns {string} A prefixed UUID
   */
  static generateWithPrefix(prefix) {
    return `${prefix}_${generateUUID()}`;
  }

  /**
   * Generate a user ID
   * @returns {string} A user UUID
   */
  static generateUserId() {
    return this.generateWithPrefix('usr');
  }

  /**
   * Generate an OTP verification ID
   * @returns {string} An OTP verification UUID
   */
  static generateVerificationId() {
    return this.generateWithPrefix('otp');
  }

  /**
   * Validate if a string is a valid UUID
   * @param {string} uuid - String to validate
   * @returns {boolean} True if valid UUID
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate if a string is a valid prefixed UUID
   * @param {string} prefixedUuid - String to validate
   * @returns {boolean} True if valid prefixed UUID
   */
  static isValidPrefixedUUID(prefixedUuid) {
    const parts = prefixedUuid.split('_');
    if (parts.length !== 2) return false;
    
    const [prefix, uuid] = parts;
    return prefix.length > 0 && this.isValidUUID(uuid);
  }
}

module.exports = UUIDGenerator;
