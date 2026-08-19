const pool = require('../db/pool');

/**
 * GET /api/profile
 * Protected endpoint — requires valid Bearer access token.
 */
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, phone, is_active, is_2fa_enabled, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/profile
 * Update phone number (needed before enabling 2FA if not set at registration).
 */
async function updateProfile(req, res) {
  const { phone } = req.body;

  // Basic E.164 check
  if (phone && !/^\+\d{7,15}$/.test(phone)) {
    return res.status(422).json({ success: false, message: 'Phone must be in E.164 format (e.g. +14155552671).' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET phone = COALESCE($1, phone), updated_at = now()
       WHERE id = $2
       RETURNING id, email, phone, is_2fa_enabled`,
      [phone || null, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated.',
      data: { user: result.rows[0] },
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { getProfile, updateProfile };
