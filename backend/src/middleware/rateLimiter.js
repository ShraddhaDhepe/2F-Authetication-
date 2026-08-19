const rateLimit = require('express-rate-limit');

/**
 * Strict rate-limiter for authentication endpoints.
 * 10 requests per IP per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test', // disable in tests
});

/**
 * General limiter for non-sensitive endpoints.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, generalLimiter };
