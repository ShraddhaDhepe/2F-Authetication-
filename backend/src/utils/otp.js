const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit numeric OTP.
 */
function generateOTP() {
  // Cryptographically secure random 6-digit code
  const bytes = crypto.randomBytes(4);
  const num   = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Hash an OTP code using bcrypt for storage.
 * (For OTPs we use bcrypt with low cost since they expire fast.)
 */
async function hashOTP(code) {
  return bcrypt.hash(code, 8);
}

/**
 * Compare a raw OTP with a stored bcrypt hash.
 */
async function verifyOTP(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = { generateOTP, hashOTP, verifyOTP };
