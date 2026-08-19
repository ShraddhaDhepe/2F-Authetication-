/**
 * Integration tests for all authentication flows.
 * Requires a real PostgreSQL instance (uses the same DB_* env vars).
 * Each test suite cleans up its own data.
 */

require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.MOCK_SMS = 'true';

const request = require('supertest');
const app     = require('../server');
const pool    = require('../db/pool');
const bcrypt  = require('bcryptjs');
const { hashToken } = require('../utils/jwt');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createUser(overrides = {}) {
  const email        = overrides.email        || `test_${Date.now()}@example.com`;
  const password     = overrides.password     || 'Password123!';
  const passwordHash = await bcrypt.hash(password, 8);
  const phone        = overrides.phone        || '+14155550000';
  const is2fa        = overrides.is_2fa_enabled !== undefined ? overrides.is_2fa_enabled : false;

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, phone, is_2fa_enabled)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, passwordHash, phone, is2fa]
  );
  return { ...result.rows[0], rawPassword: password };
}

async function cleanupUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let userId;

  afterEach(async () => {
    if (userId) {
      await cleanupUser(userId);
      userId = null;
    }
  });

  it('registers a new user successfully', async () => {
    const email = `reg_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
      phone:    '+14155551234',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
    userId = res.body.data.user.id;
  });

  it('rejects duplicate email', async () => {
    const email = `dup_${Date.now()}@example.com`;

    const first = await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
    });
    userId = first.body.data.user.id;

    const second = await request(app).post('/api/auth/register').send({
      email,
      password: 'Password123!',
    });
    expect(second.status).toBe(409);
  });

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email:    `weak_${Date.now()}@example.com`,
      password: 'short',
    });
    expect(res.status).toBe(422);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email:    'not-an-email',
      password: 'Password123!',
    });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let user;

  beforeAll(async () => {
    user = await createUser({ email: `login_${Date.now()}@example.com` });
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.requires2FA).toBe(false);
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: 'WrongPassword!1',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    'nobody@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('2FA enable + verify flow', () => {
  let user;
  let accessToken;

  beforeAll(async () => {
    user = await createUser({
      email:          `twofa_${Date.now()}@example.com`,
      is_2fa_enabled: false,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('sends OTP when enable 2FA is requested', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('activates 2FA after verifying the correct OTP', async () => {
    // Fetch the raw OTP from DB (tests bypass SMS)
    const otpRow = await pool.query(
      `SELECT * FROM otps WHERE user_id = $1 AND purpose = 'enable_2fa' AND used = false ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    // We need the raw OTP — since it is hashed, we generate a fresh one directly
    // for testing purposes: insert a known OTP
    const { generateOTP, hashOTP } = require('../utils/otp');
    const rawOtp = '123456';
    const otpHash = await hashOTP(rawOtp);
    await pool.query(
      `UPDATE otps SET code = $1, used = false WHERE id = $2`,
      [otpHash, otpRow.rows[0].id]
    );

    const res = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ otp: rawOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB updated
    const updated = await pool.query('SELECT is_2fa_enabled FROM users WHERE id = $1', [user.id]);
    expect(updated.rows[0].is_2fa_enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Login with 2FA', () => {
  let user;

  beforeAll(async () => {
    user = await createUser({
      email:          `login2fa_${Date.now()}@example.com`,
      is_2fa_enabled: true,
    });
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('returns requires2FA=true and sends OTP', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.requires2FA).toBe(true);
    expect(res.body.userId).toBe(user.id);
  });

  it('completes login after correct OTP', async () => {
    // Seed a known OTP
    const { hashOTP } = require('../utils/otp');
    const rawOtp  = '654321';
    const otpHash = await hashOTP(rawOtp);
    const expiry  = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at)
       VALUES ($1, $2, 'login_2fa', $3)`,
      [user.id, otpHash, expiry]
    );

    const res = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ otp: rawOtp, userId: user.id });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Token refresh + logout', () => {
  let user;
  let refreshTokenRaw;

  beforeAll(async () => {
    user = await createUser({ email: `refresh_${Date.now()}@example.com` });

    const loginRes = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    refreshTokenRaw = loginRes.body.data.refreshToken;
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('returns new access + refresh token on refresh', async () => {
    const res = await request(app)
      .post('/api/auth/token/refresh')
      .send({ refreshToken: refreshTokenRaw });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Store new refresh token for logout test
    refreshTokenRaw = res.body.data.refreshToken;
  });

  it('rejects a re-used (revoked) refresh token', async () => {
    // Use the old token (already rotated above)
    const loginRes = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    const oldToken = loginRes.body.data.refreshToken;

    // Refresh once (rotates old → new)
    await request(app).post('/api/auth/token/refresh').send({ refreshToken: oldToken });

    // Try to use the old token again
    const res = await request(app)
      .post('/api/auth/token/refresh')
      .send({ refreshToken: oldToken });

    expect(res.status).toBe(401);
  });

  it('logs out and invalidates refresh token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    const rt = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: rt });

    expect(logoutRes.status).toBe(200);

    // Token should now be invalid
    const refreshRes = await request(app)
      .post('/api/auth/token/refresh')
      .send({ refreshToken: rt });

    expect(refreshRes.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Forgot password + reset password', () => {
  let user;

  beforeAll(async () => {
    user = await createUser({ email: `forgot_${Date.now()}@example.com` });
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('responds 200 even for unknown email (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody_special@example.com' });
    expect(res.status).toBe(200);
  });

  it('sends OTP for known email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user.id);
  });

  it('resets password with valid OTP', async () => {
    // Seed a known OTP
    const { hashOTP } = require('../utils/otp');
    const rawOtp  = '999888';
    const otpHash = await hashOTP(rawOtp);
    const expiry  = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE otps SET used = true WHERE user_id = $1 AND purpose = 'forgot_password'`,
      [user.id]
    );
    await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at)
       VALUES ($1, $2, 'forgot_password', $3)`,
      [user.id, otpHash, expiry]
    );

    const res = await request(app).post('/api/auth/reset-password').send({
      userId:      user.id,
      otp:         rawOtp,
      newPassword: 'NewPassword456!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('can login with new password after reset', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: 'NewPassword456!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects invalid OTP for reset', async () => {
    // First, generate a valid OTP in DB
    const { hashOTP } = require('../utils/otp');
    const rawOtp  = '111222';
    const otpHash = await hashOTP(rawOtp);
    const expiry  = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at)
       VALUES ($1, $2, 'forgot_password', $3)`,
      [user.id, otpHash, expiry]
    );

    const res = await request(app).post('/api/auth/reset-password').send({
      userId:      user.id,
      otp:         '000000',  // wrong OTP
      newPassword: 'AnotherPassword789!',
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/profile (protected endpoint)', () => {
  let user;
  let accessToken;

  beforeAll(async () => {
    user = await createUser({ email: `profile_${Date.now()}@example.com` });
    const loginRes = await request(app).post('/api/auth/login').send({
      email:    user.email,
      password: user.rawPassword,
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupUser(user.id);
  });

  it('returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('rejects request without token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('rejects request with tampered token', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature');
    expect(res.status).toBe(401);
  });
});

// ─── Cleanup pool after all tests ────────────────────────────────────────────
afterAll(async () => {
  await pool.end();
});
