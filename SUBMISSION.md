# Submission

## Evaluator Credentials (pre-seeded)

| Email               | Password       | 2FA     |
|---------------------|----------------|---------|
| demo@example.com    | Password123!   | Disabled |
| twofa@example.com   | Password123!   | Enabled  |

---

## Run with Docker (recommended)

```bash
# 1. Clone / unzip the repo
cd auth-challenge

# 2. Start everything (Postgres + Backend + Frontend)
docker compose up --build

# 3. Backend is at  http://localhost:5000
#    Frontend is at http://localhost:3000
```

> OTPs appear in the **backend container logs** (MOCK_SMS=true by default).  
> `docker compose logs -f backend`

---

## Run Locally (without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### Backend

```bash
cd backend
npm install

# Copy and edit env if needed
copy .env.example .env

# Run migrations and seed
npm run migrate
npm run seed

# Start server (port 5000)
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start       # Opens http://localhost:3000
```

---

## Run Tests

```bash
cd backend

# Make sure Postgres is running and .env is configured
npm test
```

All tests run in-band and clean up after themselves.

---

## API Quick Reference

| Method | Endpoint                  | Auth?     | Description                        |
|--------|---------------------------|-----------|------------------------------------|
| POST   | /api/auth/register        | No        | Register new user                  |
| POST   | /api/auth/login           | No        | Login (returns tokens or 2FA flag) |
| POST   | /api/auth/2fa/enable      | Yes       | Send OTP to enable 2FA             |
| POST   | /api/auth/2fa/verify      | Optional  | Verify OTP (enable or login flow)  |
| POST   | /api/auth/token/refresh   | No        | Rotate refresh → new access token  |
| POST   | /api/auth/logout          | No        | Revoke refresh token               |
| POST   | /api/auth/forgot-password | No        | Send password-reset OTP            |
| POST   | /api/auth/reset-password  | No        | Reset password with OTP            |
| GET    | /api/profile              | Yes       | Get authenticated user profile     |
| PATCH  | /api/profile              | Yes       | Update phone number                |

---

## Where to Find Key Logic

| Feature                  | File                                              |
|--------------------------|---------------------------------------------------|
| JWT generation/verify    | `backend/src/utils/jwt.js`                        |
| OTP generation/hash      | `backend/src/utils/otp.js`                        |
| Mock SMS gateway         | `backend/src/utils/sms.js`                        |
| All auth flows           | `backend/src/controllers/authController.js`       |
| Auth middleware          | `backend/src/middleware/auth.js`                  |
| Rate limiting            | `backend/src/middleware/rateLimiter.js`           |
| DB migrations            | `backend/src/db/migrate.js`                       |
| Seed data                | `backend/src/db/seed.js`                          |
| Tests                    | `backend/src/tests/auth.test.js`                  |
| React auth context       | `frontend/src/context/AuthContext.js`             |
| Axios + auto-refresh     | `frontend/src/api/axios.js`                       |
