# Auth Challenge — JWT + 2FA + Forgot Password

A full-stack authentication system built with:
- **Backend**: Node.js, Express, PostgreSQL, JWT, bcrypt
- **Frontend**: React.js
- **Auth**: Access + Refresh tokens, 2FA via SMS OTP, Forgot Password OTP flow

---

## Features

- ✅ User registration with password strength validation
- ✅ JWT authentication (short-lived access token + long-lived refresh token)
- ✅ Refresh token rotation (revoke on use, stored as hash in DB)
- ✅ Two-Factor Authentication via SMS OTP (mock gateway included)
- ✅ Forgot Password via secure, single-use OTP (1-hour expiry)
- ✅ Password hashing with bcrypt (cost factor 12)
- ✅ OTPs hashed with bcrypt, attempt counter + expiry
- ✅ Rate limiting on all auth endpoints
- ✅ Input validation and sanitization (express-validator)
- ✅ Parameterized queries (no SQL injection)
- ✅ Audit log table for all auth events
- ✅ Docker Compose setup
- ✅ Full automated test suite

---

## Quick Start

See [SUBMISSION.md](./SUBMISSION.md) for full run instructions.

```bash
docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend:  http://localhost:5000  
- OTPs:     `docker compose logs -f backend`

---

## Project Structure

```
auth-challenge/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js     # All auth flows
│   │   │   └── profileController.js  # Profile endpoints
│   │   ├── db/
│   │   │   ├── pool.js               # PostgreSQL pool
│   │   │   ├── migrate.js            # Schema migrations
│   │   │   └── seed.js               # Demo user seed
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT Bearer verification
│   │   │   ├── validate.js           # express-validator helper
│   │   │   └── rateLimiter.js        # Rate limiting config
│   │   ├── routes/
│   │   │   ├── auth.js               # /api/auth/* routes
│   │   │   └── profile.js            # /api/profile routes
│   │   ├── utils/
│   │   │   ├── jwt.js                # Token helpers
│   │   │   ├── otp.js                # OTP generate/hash/verify
│   │   │   ├── sms.js                # Mock/Twilio SMS gateway
│   │   │   └── audit.js              # Audit logging
│   │   ├── tests/
│   │   │   └── auth.test.js          # Integration test suite
│   │   └── server.js                 # Express app entry point
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/axios.js              # Axios + auto token refresh
│   │   ├── context/AuthContext.js    # Auth state + all API calls
│   │   ├── pages/
│   │   │   ├── Register.js
│   │   │   ├── Login.js              # Includes 2FA OTP step
│   │   │   ├── ForgotPassword.js     # 2-step: request OTP → reset
│   │   │   └── Dashboard.js          # Profile, 2FA enable, token demo
│   │   ├── components/               # Alert, Input, Button, Card
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── README.md
└── SUBMISSION.md
```

---

## Security Design

| Concern                | Approach                                                  |
|------------------------|-----------------------------------------------------------|
| Passwords              | bcrypt, cost factor 12                                    |
| Access tokens          | JWT, 15-min expiry, signed with strong secret             |
| Refresh tokens         | Opaque random 64-byte hex, SHA-256 hashed in DB           |
| Token rotation         | Old refresh token revoked on each refresh                 |
| OTPs                   | 6-digit, bcrypt hashed, 5-min expiry, 5-attempt lockout   |
| Password reset tokens  | OTP-based, 1-hour expiry, single-use                      |
| SQL injection          | Parameterized queries only (pg library)                   |
| Rate limiting          | 10 req/15min on auth endpoints per IP                     |
| Email enumeration      | forgot-password always returns 200                        |
| Large payloads         | express.json limit 10KB                                   |
