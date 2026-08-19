# Implementation Notes — Auth Challenge

## Architecture Decisions

### Why OTP-based Forgot Password (not email link)?
The spec required "mobile phone OTP" for the 2FA and the forgot-password flow.
An OTP delivered via SMS (or mock console) was chosen for consistency and
because it avoids setting up an email provider. The `otps` table handles all
three OTP purposes: `login_2fa`, `enable_2fa`, `forgot_password`.

### Refresh Token Design
Refresh tokens are opaque 64-byte random hex strings. Only the SHA-256 hash
is stored in the DB (`refresh_tokens.token_hash`). On each refresh, the old
token is revoked and a new pair is issued (token rotation), preventing replay
attacks even if a token is intercepted after use.

### OTP Security
OTPs are hashed with bcrypt (cost 8 — lower than password hashing since they
expire in 5 minutes, but still protected at rest). Each OTP row has an
`attempts` counter. After 5 wrong guesses the OTP is invalidated automatically.

### Rate Limiting
All `/api/auth/*` routes are capped at 10 requests per IP per 15 minutes.
This is enforced at the middleware layer and skipped in test mode.

### Mock SMS Gateway
`backend/src/utils/sms.js` checks `MOCK_SMS` env var. When `true` it prints
the OTP to stdout in a clearly labelled box. This makes the demo video easy
to record without real Twilio credentials or SMS costs.

### Audit Logging
Every significant auth event (register, login success/fail, 2FA toggle,
password reset, token refresh, logout) is recorded in `audit_logs`.
The logging is fire-and-forget (errors are swallowed) so it never blocks
the request.

## Token Lifecycle

```
[Register / Login]
  → generateAccessToken()  → JWT (15 min)
  → generateRefreshToken() → random hex
  → hashToken(rawRefresh)  → stored in refresh_tokens

[Protected request]
  → Bearer {accessToken} in Authorization header
  → verifyAccessToken() validates signature + expiry

[Access token expired]
  → POST /api/auth/token/refresh { refreshToken }
  → lookup hash in DB, check revoked=false + expires_at
  → revoke old, issue new pair

[Logout]
  → POST /api/auth/logout { refreshToken }
  → set revoked=true in DB
```

## Database Schema Summary

See `backend/src/db/migrate.js` for the full SQL.

- `users`          — core user record with 2FA flag
- `refresh_tokens` — hashed refresh tokens with expiry + revocation
- `otps`           — all OTPs (login 2FA, enable 2FA, forgot password)
- `audit_logs`     — immutable event log

## Test Coverage

`backend/src/tests/auth.test.js` covers:
- Registration (happy path, duplicate email, weak password, invalid email)
- Login (happy path, wrong password, unknown email)
- 2FA enable + verify (OTP activation)
- Login with 2FA (OTP challenge → token issuance)
- Token refresh (rotation, revoked token rejection)
- Logout (token invalidation)
- Forgot password (anti-enumeration, OTP send)
- Reset password (valid OTP, invalid OTP, login with new password)
- Protected endpoint (with/without token, tampered token)
