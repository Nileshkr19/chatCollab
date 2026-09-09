# Authentication (Auth) Feature

> User registration, login, password management, and JWT-based session handling.

## Overview

The Auth feature manages:

- **User registration** with email verification
- **Login/logout** with JWT tokens
- **Password hashing** with bcryptjs
- **Token refresh** for extended sessions
- **Password reset** via email
- **Session management** with Redis

## Quick Start

```typescript
// Register
POST /api/auth/register
{
  email: "user@example.com",
  password: "SecurePass123!",
  displayName: "John Doe"
}

// Login
POST /api/auth/login
{
  email: "user@example.com",
  password: "SecurePass123!"
}
// Returns: { token, user, expiresIn }

// Logout
POST /api/auth/logout
// Header: Authorization: Bearer {token}

// Refresh Token
POST /api/auth/refresh
// Header: Authorization: Bearer {token}
```

## Architecture

### File Structure

```
features/auth/
├── auth.controller.js      # Request handlers
├── auth.service.js         # Business logic
├── auth.routes.js          # Endpoint definitions
├── auth.middleware.js      # Auth validation middleware
├── auth.validation.js      # Input sanitization
└── README.md              # This file
```

### Authentication Flow

```
┌─────────────┬──────────────┐
│   CLIENT    │  SERVER      │
└──────┬──────┴──────┬───────┘
       │             │
       │ POST /register
       │──────────────>
       │             │ Validate email format
       │             │ Hash password (bcryptjs)
       │             │ Create user in PostgreSQL
       │             │
       │  Generated JWT token
       │<──────────────
       │
       │ Store token (localStorage/cookie)
       │
       │ Every request:
       │ Authorization: Bearer {token}
       │──────────────>
       │             │
       │             │ verify() JWT signature
       │             │ Check Redis session
       │             │ Attach user to request
       │
       │  Success / Unauthorized
       │<──────────────
```

## Core Services

### `auth.service.js` - Main Business Logic

#### `registerUser(email, password, displayName)`

```javascript
// Steps:
1. Validate email format & uniqueness
2. Hash password using bcryptjs (rounds: 10)
3. Create user document in PostgreSQL
4. Generate JWT token with 7d expiration
5. Store session in Redis with TTL
6. Return user object & token

// Throws: `ApiError` if email exists or validation fails
```

#### `loginUser(email, password)`

```javascript
// Steps:
1. Find user by email
2. Compare provided password with hash
3. Generate new JWT token
4. Store session in Redis
5. Return user & token

// Throws: `ApiError` if user not found or password wrong
```

#### `logoutUser(userId, tokenId)`

```javascript
// Steps:
1. Delete session from Redis
2. Mark token as revoked in blacklist
3. Clear any active Socket connections

// Used to: Prevent token reuse after logout
```

#### `generateToken(userId, expiresIn = '7d')`

```javascript
const token = jwt.sign(
  { sub: userId, type: "access" },
  process.env.JWT_SECRET,
  { expiresIn },
);
// Stored in Redis: session:{userId}:{tokenId}
```

#### `verifyToken(token)`

```javascript
// Steps:
1. Verify JWT signature
2. Check token not expired
3. Check session exists in Redis
4. Return decoded payload

// Throws: `ApiError` if invalid/expired
```

#### `resetPassword(email, newPassword)`

```javascript
// Steps:
1. Find user by email
2. Generate reset token (short-lived)
3. Send reset link via email
4. Validate token on callback
5. Hash & update password
6. Revoke all existing sessions
```

## Middleware

### `requireAuth` - Protected Routes

```javascript
import { requireAuth } from "./auth.middleware.js";

router.get("/profile", requireAuth, (req, res) => {
  // req.user is populated + verified
  res.json(req.user);
});
```

Authenticates by:

1. Extracting token from `Authorization: Bearer {token}`
2. Verifying JWT signature
3. Checking Redis session
4. Attaching user object to request

### `checkRole(roles)` - Role-Based Access

```javascript
router.post("/admin/users", checkRole(["ADMIN"]), (req, res) => {
  // Only ADMIN role allowed
});
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Email (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password

# Bcryptjs
BCRYPTJS_ROUNDS=10
```

## Error Handling

| Status | Error                      | Cause                     |
| ------ | -------------------------- | ------------------------- |
| 400    | Invalid email format       | Email validation failed   |
| 400    | Password too weak          | Doesn't meet requirements |
| 409    | Email already registered   | User exists               |
| 401    | Invalid credentials        | Wrong email/password      |
| 401    | Token expired              | JWT expired               |
| 401    | Invalid token              | JWT signature invalid     |
| 500    | Failed to send reset email | SMTP error                |

## Usage Examples

### Register New User

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "password": "SecurePass123!",
    "displayName": "Jane Smith"
  }'
```

### Login

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "password": "SecurePass123!"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "user_123",
#     "email": "new@example.com",
#     "displayName": "Jane Smith"
#   },
#   "expiresIn": "7d"
# }
```

### Access Protected Route

```bash
curl -X GET http://localhost:3003/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Password Policy

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 digit (0-9)
- At least 1 special character (!@#$%^&\*)

**Example valid passwords:**

- `MyPassword123!`
- `SecureP@ss2024`
- `Abc123#xyz`

## Security Considerations

### Best Practices

✅ **Password Hashing**

- Using bcryptjs with 10 rounds (~100ms per hash)
- Salt automatically generated by bcryptjs

✅ **Token Storage** (Recommended)

- Use HttpOnly cookies for web browsers
- localStorage as fallback (XSS vulnerability risk)
- Never store in Redux/Zustand without encryption

✅ **Token Expiration**

- Short-lived access token (7 days)
- Implement refresh token rotation

✅ **Rate Limiting**

- 5 attempts per 15 minutes for login
- 3 attempts per 1 hour for password reset

### Potential Vulnerabilities

⚠️ **CSRF Protection**

- Required for state-changing requests
- Use SameSite=Strict cookie attribute

⚠️ **Session Fixation**

- Generate new token on each login
- Invalidate all tokens on logout

⚠️ **Timing Attacks**

- Use constant-time comparison for passwords
- bcryptjs handles this automatically

## Testing

### Unit Tests

```javascript
describe("Auth Service", () => {
  it("should hash password", async () => {
    const hash = await hashPassword("MyPassword123!");
    expect(await verifyPassword("MyPassword123!", hash)).toBe(true);
  });

  it("should reject weak passwords", async () => {
    expect(() => validatePassword("weak")).toThrow();
  });

  it("should generate valid JWT", () => {
    const token = generateToken("user_123");
    expect(verifyToken(token).sub).toBe("user_123");
  });
});
```

### Integration Tests

```javascript
describe("Auth Routes", () => {
  it("should register user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "SecurePass123!",
      displayName: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});
```

## Performance Considerations

- Password hashing takes ~100ms (intentional for security)
- JWT verification is <1ms
- Redis session lookup is <5ms
- Consider caching user profile after auth

## Related Features

- **Workspace**: Users must have workspace membership
- **Notifications**: Send welcome email after registration
- **Audit Log**: Track login/logout events

---

For issues or questions, see the [main README](../README.md) or [Architecture Guide](../ARCHITECTURE.md).
