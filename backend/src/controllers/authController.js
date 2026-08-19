const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool   = require('../db/pool');
const { generateAccessToken, generateRefreshToken, hashToken, expiresAt, REFRESH_EXPIRES } = require('../utils/jwt');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/otp');
const { sendOTP, verifyTwilioOTP } = require('../utils/sms');
const { auditLog } = require('../utils/audit');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function issueTokens(userId, email) {
  const accessToken  = generateAccessToken({ sub: userId, email });
  const rawRefresh   = generateRefreshToken();
  return { accessToken, rawRefresh };
}

async function storeRefreshToken(userId, rawRefresh) {
  const tokenHash = hashToken(rawRefresh);
  const expiry    = expiresAt(REFRESH_EXPIRES);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiry]
  );
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

async function register(req, res) {
  const { email, password, phone } = req.body;

  try {
    // Check duplicate email
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, phone)
       VALUES ($1, $2, $3)
       RETURNING id, email, phone, is_active, is_2fa_enabled, created_at`,
      [email.toLowerCase().trim(), passwordHash, phone || null]
    );

    const user = result.rows[0];

    const { accessToken, rawRefresh } = issueTokens(user.id, user.email);
    await storeRefreshToken(user.id, rawRefresh);

    await auditLog({ userId: user.id, event: 'register', req });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id:             user.id,
          email:          user.email,
          phone:          user.phone,
          is_2fa_enabled: user.is_2fa_enabled,
        },
        accessToken,
        refreshToken: rawRefresh,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user) {
      await auditLog({ event: 'login_fail', req, meta: { reason: 'user_not_found', email } });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await auditLog({ userId: user.id, event: 'login_fail', req, meta: { reason: 'bad_password' } });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // If 2FA is enabled, issue a temporary challenge instead of full tokens
    if (user.is_2fa_enabled) {
      // Generate & store OTP
      const otp     = generateOTP();
      const otpHash = await hashOTP(otp);
      const expiry  = new Date(Date.now() + 5 * 60 * 1000); // 5 min

      // Invalidate old pending login_2fa OTPs for this user
      await pool.query(
        `UPDATE otps SET used = true WHERE user_id = $1 AND purpose = 'login_2fa' AND used = false`,
        [user.id]
      );

      await pool.query(
        `INSERT INTO otps (user_id, code, purpose, expires_at)
         VALUES ($1, $2, 'login_2fa', $3)`,
        [user.id, otpHash, expiry]
      );

      await sendOTP(user.phone, otp, 'login_2fa');
      await auditLog({ userId: user.id, event: 'login_2fa_otp_sent', req });

      return res.status(200).json({
        success:     true,
        requires2FA: true,
        message:     'OTP sent to your registered phone number.',
        userId:      user.id,   // client must include this in /2fa/verify
      });
    }

    // No 2FA — issue tokens immediately
    const { accessToken, rawRefresh } = issueTokens(user.id, user.email);
    await storeRefreshToken(user.id, rawRefresh);

    await auditLog({ userId: user.id, event: 'login_success', req });

    return res.status(200).json({
      success:      true,
      requires2FA:  false,
      message:      'Login successful.',
      data: {
        user: {
          id:             user.id,
          email:          user.email,
          phone:          user.phone,
          is_2fa_enabled: user.is_2fa_enabled,
        },
        accessToken,
        refreshToken: rawRefresh,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/2fa/enable ────────────────────────────────────────────────

async function enable2FA(req, res) {
  const { id: userId, email } = req.user;

  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.is_2fa_enabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled.' });
    }

    if (!user.phone) {
      return res.status(400).json({ success: false, message: 'Phone number required to enable 2FA. Update your profile first.' });
    }

    // Invalidate any existing enable_2fa OTPs
    await pool.query(
      `UPDATE otps SET used = true WHERE user_id = $1 AND purpose = 'enable_2fa' AND used = false`,
      [userId]
    );

    const otp     = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiry  = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at)
       VALUES ($1, $2, 'enable_2fa', $3)`,
      [userId, otpHash, expiry]
    );

    await sendOTP(user.phone, otp, 'enable_2fa');
    await auditLog({ userId, event: '2fa_enable_otp_sent', req });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered phone. Verify to complete 2FA setup.',
    });
  } catch (err) {
    console.error('[enable2FA]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/2fa/verify ────────────────────────────────────────────────
// Used for both: finishing 2FA setup AND completing a 2FA login.
// Body: { otp, userId? }
//   - If called while authenticated (has Bearer token) → finishing enable flow
//   - If userId is provided (no auth token)            → finishing login flow

async function verify2FA(req, res) {
  const { otp, userId: bodyUserId } = req.body;

  // Determine which user and purpose
  const isLoginFlow = !req.user;
  const userId      = isLoginFlow ? bodyUserId : req.user.id;
  const purpose     = isLoginFlow ? 'login_2fa' : 'enable_2fa';

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId required for login 2FA verification.' });
  }

  try {
    // Fetch most recent, unused, unexpired OTP for this user + purpose
    const otpResult = await pool.query(
      `SELECT * FROM otps
       WHERE user_id = $1
         AND purpose  = $2
         AND used     = false
         AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    const otpRecord = otpResult.rows[0];

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No valid OTP found. Request a new one.' });
    }

    // Increment attempt counter
    await pool.query(
      'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
      [otpRecord.id]
    );

    // Lock out after 5 failed attempts
    if (otpRecord.attempts + 1 >= 5) {
      await pool.query('UPDATE otps SET used = true WHERE id = $1', [otpRecord.id]);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Check OTP — use Twilio Verify if configured, otherwise local DB hash check
    let match = false;
    const twilioVerifyResult = await verifyTwilioOTP(
      isLoginFlow
        ? (await pool.query('SELECT phone FROM users WHERE id=$1', [userId])).rows[0]?.phone
        : req.user?.phone || (await pool.query('SELECT phone FROM users WHERE id=$1', [userId])).rows[0]?.phone,
      otp
    );

    if (twilioVerifyResult !== null) {
      // Twilio Verify handled it
      match = twilioVerifyResult;
    } else {
      // Local bcrypt check
      match = await verifyOTP(otp, otpRecord.code);
    }

    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otps SET used = true WHERE id = $1', [otpRecord.id]);

    if (purpose === 'enable_2fa') {
      // Activate 2FA on the account
      await pool.query(
        'UPDATE users SET is_2fa_enabled = true, updated_at = now() WHERE id = $1',
        [userId]
      );
      await auditLog({ userId, event: '2fa_enabled', req });

      return res.status(200).json({
        success: true,
        message: '2FA has been successfully enabled on your account.',
      });
    }

    // login_2fa — issue full tokens
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    const { accessToken, rawRefresh } = issueTokens(user.id, user.email);
    await storeRefreshToken(user.id, rawRefresh);
    await auditLog({ userId, event: 'login_success_2fa', req });

    return res.status(200).json({
      success: true,
      message: '2FA verified. Login successful.',
      data: {
        user: {
          id:             user.id,
          email:          user.email,
          phone:          user.phone,
          is_2fa_enabled: user.is_2fa_enabled,
        },
        accessToken,
        refreshToken: rawRefresh,
      },
    });
  } catch (err) {
    console.error('[verify2FA]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/token/refresh ─────────────────────────────────────────────

async function refreshToken(req, res) {
  const { refreshToken: rawRefresh } = req.body;

  if (!rawRefresh) {
    return res.status(400).json({ success: false, message: 'Refresh token required.' });
  }

  try {
    const tokenHash = hashToken(rawRefresh);

    const result = await pool.query(
      `SELECT rt.*, u.email FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked    = false
         AND rt.expires_at > now()`,
      [tokenHash]
    );

    const record = result.rows[0];
    if (!record) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Rotate: revoke old token and issue new pair
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [record.id]);

    const { accessToken, rawRefresh: newRawRefresh } = issueTokens(record.user_id, record.email);
    await storeRefreshToken(record.user_id, newRawRefresh);

    await auditLog({ userId: record.user_id, event: 'token_refresh', req });

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed.',
      data: {
        accessToken,
        refreshToken: newRawRefresh,
      },
    });
  } catch (err) {
    console.error('[refreshToken]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

async function logout(req, res) {
  const { refreshToken: rawRefresh } = req.body;

  if (!rawRefresh) {
    return res.status(400).json({ success: false, message: 'Refresh token required.' });
  }

  try {
    const tokenHash = hashToken(rawRefresh);
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
      [tokenHash]
    );

    if (req.user) {
      await auditLog({ userId: req.user.id, event: 'logout', req });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[logout]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

async function forgotPassword(req, res) {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Mobile number is required.' });
  }

  // Normalise — accept 10-digit or +91XXXXXXXXXX
  const normalised = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;

  // Always respond 200 to prevent phone enumeration
  const genericResponse = {
    success: true,
    message: 'If an account exists for that number, an OTP has been sent.',
  };

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1 AND is_active = true',
      [normalised]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Invalidate old reset OTPs
    await pool.query(
      `UPDATE otps SET used = true WHERE user_id = $1 AND purpose = 'forgot_password' AND used = false`,
      [user.id]
    );

    const otp     = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiry  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at)
       VALUES ($1, $2, 'forgot_password', $3)`,
      [user.id, otpHash, expiry]
    );

    await sendOTP(normalised, otp, 'forgot_password');
    await auditLog({ userId: user.id, event: 'forgot_password_request', req });

    return res.status(200).json({
      ...genericResponse,
      userId: user.id,
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

async function resetPassword(req, res) {
  const { otp, userId, newPassword } = req.body;

  try {
    const otpResult = await pool.query(
      `SELECT * FROM otps
       WHERE user_id = $1
         AND purpose  = 'forgot_password'
         AND used     = false
         AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const otpRecord = otpResult.rows[0];

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Increment attempts
    await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);

    if (otpRecord.attempts + 1 >= 5) {
      await pool.query('UPDATE otps SET used = true WHERE id = $1', [otpRecord.id]);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Check OTP — Twilio Verify first, fallback to local hash
    const userRow = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
    const userPhone = userRow.rows[0]?.phone;

    let match = false;
    const twilioResult = userPhone ? await verifyTwilioOTP(userPhone, otp) : null;
    if (twilioResult !== null) {
      match = twilioResult;
    } else {
      match = await verifyOTP(otp, otpRecord.code);
    }

    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otps SET used = true WHERE id = $1', [otpRecord.id]);

    // Update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newHash, userId]
    );

    // Revoke all refresh tokens (force re-login everywhere)
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );

    await auditLog({ userId, event: 'password_reset', req });

    return res.status(200).json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = {
  register,
  login,
  enable2FA,
  verify2FA,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
