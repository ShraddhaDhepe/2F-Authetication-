const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const {
  register, login, enable2FA, verify2FA,
  refreshToken, logout, forgotPassword, resetPassword,
} = require('../controllers/authController');
const { requireAuth }  = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const { authLimiter }  = require('../middleware/rateLimiter');

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character (!@#$%^&*).'),
  body('phone')
    .optional()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Phone must be a valid Indian mobile number in E.164 format (e.g. +919876543210).'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password required.'),
];

const otpRules = [
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number.'),
];

const refreshRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token required.'),
];

const forgotRules = [
  body('phone')
    .notEmpty().withMessage('Mobile number is required.')
    .custom(val => {
      const digits = val.replace(/\D/g, '');
      const last10 = digits.slice(-10);
      if (!/^[6-9]\d{9}$/.test(last10)) throw new Error('Enter a valid 10-digit Indian mobile number.');
      return true;
    }),
];

const resetRules = [
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number.'),
  body('userId').isUUID().withMessage('Valid userId required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character (!@#$%^&*).'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public auth endpoints (rate-limited)
router.post('/register',       authLimiter, registerRules, validate, register);
router.post('/login',          authLimiter, loginRules,    validate, login);
router.post('/token/refresh',  authLimiter, refreshRules,  validate, refreshToken);
router.post('/logout',         authLimiter, refreshRules,  validate, logout);
router.post('/forgot-password',authLimiter, forgotRules,   validate, forgotPassword);
router.post('/reset-password', authLimiter, resetRules,    validate, resetPassword);

// 2FA verify — works both authenticated (enable flow) and unauthenticated (login flow)
router.post(
  '/2fa/verify',
  authLimiter,
  [
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number.'),
    body('userId').optional().isUUID().withMessage('Invalid userId.'),
  ],
  validate,
  (req, res, next) => {
    // Optionally attach user from token if present (non-blocking)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const { verifyAccessToken } = require('../utils/jwt');
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email };
      } catch (_) {
        // If token invalid here, treat as login flow (userId in body)
      }
    }
    next();
  },
  verify2FA
);

// Protected — must be logged in
router.post('/2fa/enable', requireAuth, authLimiter, enable2FA);

module.exports = router;
