# 🚀 Sports Arbitrage Platform - API Documentation

## 📋 Overview

The Sports Arbitrage Platform provides a comprehensive RESTful API for managing users, authentication, arbitrage calculations, and system administration. All endpoints use JSON for request/response bodies and implement proper HTTP status codes.

**Base URL:** `https://your-domain.vercel.app/api`  
**Version:** 1.0  
**Authentication:** JWT Bearer tokens  

---

## 🔐 Authentication Endpoints

### POST `/auth/login`
Authenticate a user and receive access tokens.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "userpassword123",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "trader_joe",
    "role": "premium",
    "isActive": true
  },
  "sessionToken": "jwt_token_here",
  "expiresAt": "2025-01-19T12:00:00Z"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "username": "new_trader",
  "password": "securepassword123",
  "confirmPassword": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "user_124",
    "email": "newuser@example.com",
    "username": "new_trader",
    "role": "basic"
  },
  "sessionToken": "jwt_token_here"
}
```

---

### POST `/auth/logout`
Invalidate current session and logout user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/auth/me`
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "trader_joe",
    "role": "premium",
    "subscriptionStatus": "premium",
    "subscriptionExpiry": "2025-12-31T23:59:59Z",
    "isActive": true,
    "stats": {
      "totalBets": 45,
      "totalProfit": 1250.75,
      "successRate": 68.9
    }
  }
}
```

---

## 🔒 Two-Factor Authentication

### GET `/auth/2fa/setup?userId=user_123`
Generate 2FA setup data for a user.

**Query Parameters:**
- `userId` (required): User ID to set up 2FA for

**Response (200):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/SportsArb:user_123?secret=JBSWY3DPEHPK3PXP&issuer=SportsArb",
    "backupCodes": [
      "A1B2C3D4E5", "F6G7H8I9J0", "..."
    ],
    "manualEntryKey": "JBSW Y3DP EHPK 3PXP"
  }
}
```

---

### POST `/auth/2fa/setup`
Enable 2FA for a user after verification.

**Request Body:**
```json
{
  "userId": "user_123",
  "verificationCode": "123456",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": ["A1B2C3D4E5", "F6G7H8I9J0", "..."]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA has been enabled successfully",
  "backupCodesRemaining": 10
}
```

---

### POST `/auth/2fa/verify`
Verify a 2FA code.

**Request Body:**
```json
{
  "userId": "user_123",
  "code": "123456",
  "isBackupCode": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA verification successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid verification code",
  "remainingAttempts": 3
}
```

---

## 📊 Arbitrage & Odds Endpoints

### GET `/odds`
Get current sports odds data.

**Query Parameters:**
- `sport` (optional): Filter by sport (e.g., "americanfootball_nfl")
- `regions` (optional): Comma-separated regions (e.g., "us,eu")
- `markets` (optional): Market types (e.g., "h2h,spreads")
- `oddsFormat` (optional): "american" | "decimal" (default: "american")

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "game_123",
      "sport_key": "americanfootball_nfl",
      "sport_title": "NFL",
      "commence_time": "2025-01-20T17:00:00Z",
      "home_team": "Kansas City Chiefs",
      "away_team": "Buffalo Bills",
      "bookmakers": [
        {
          "key": "draftkings",
          "title": "DraftKings",
          "last_update": "2025-01-18T12:00:00Z",
          "markets": [
            {
              "key": "h2h",
              "outcomes": [
                {
                  "name": "Kansas City Chiefs",
                  "price": -110
                },
                {
                  "name": "Buffalo Bills",
                  "price": -110
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "total_games": 15,
    "last_updated": "2025-01-18T12:00:00Z",
    "api_requests_used": 1
  }
}
```

---

### GET `/optimized-odds`
Get optimized odds data with arbitrage detection.

**Query Parameters:**
- `sport` (optional): Sport to filter by
- `minProfitMargin` (optional): Minimum profit margin percentage

**Response (200):**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "game": "Chiefs vs Bills",
        "sport": "NFL",
        "profitMargin": 3.2,
        "guaranteedProfit": 64.50,
        "totalStake": 2000,
        "isArbitrage": true,
        "bets": [
          {
            "bookmaker": "DraftKings",
            "team": "Chiefs",
            "odds": -105,
            "stake": 1025.50,
            "potentialPayout": 2001.50
          },
          {
            "bookmaker": "BetMGM",
            "team": "Bills",
            "odds": 110,
            "stake": 974.50,
            "potentialPayout": 2047.00
          }
        ]
      }
    ],
    "totalOpportunities": 3,
    "calculationTime": 45.2
  }
}
```

---

### POST `/arbitrage/cached`
Calculate arbitrage opportunities from cached data.

**Request Body:**
```json
{
  "games": [
    {
      "id": "game_123",
      "homeTeam": "Chiefs",
      "awayTeam": "Bills",
      "bookmakers": {
        "draftkings": { "home": -105, "away": -115 },
        "betmgm": { "home": 100, "away": -110 }
      }
    }
  ],
  "filters": {
    "minProfitMargin": 1.0,
    "maxStakePerBet": 5000
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "opportunities": [
    {
      "gameId": "game_123",
      "profitMargin": 2.1,
      "guaranteedProfit": 42.00,
      "isArbitrage": true,
      "bets": [...]
    }
  ],
  "calculationTime": 23.1
}
```

---

## 👑 Admin Endpoints

### POST `/admin/users`
Manage users (admin only).

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body (Get Users):**
```json
{
  "action": "getUsers",
  "portfolioData": {
    "user_123": {
      "portfolioStats": {...},
      "userBets": 25,
      "userGroups": 5
    }
  }
}
```

**Request Body (Update User):**
```json
{
  "action": "updateUserRole",
  "userId": "user_123",
  "data": {
    "role": "premium",
    "subscriptionStatus": "premium",
    "expiryDays": 30
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_123",
      "username": "trader_joe",
      "email": "joe@example.com",
      "role": "premium",
      "subscriptionStatus": "premium",
      "isActive": true,
      "stats": {
        "totalBets": 45,
        "totalProfit": 1250.75,
        "successRate": 68.9
      }
    }
  ],
  "platformStats": {
    "totalUsers": 256,
    "activeUsers": 127,
    "premiumUsers": 45,
    "totalProfit": 125847.50
  }
}
```

---

### GET `/admin/dashboard`
Get admin dashboard statistics.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 256,
      "active": 127,
      "premium": 45,
      "basic": 182
    },
    "revenue": {
      "total": 45600.00,
      "monthly": 3800.00,
      "growth": 12.5
    },
    "platform": {
      "totalBets": 5647,
      "totalProfit": 125847.50,
      "avgSuccessRate": 67.3
    },
    "api": {
      "requestsToday": 12847,
      "requestsMonth": 456789,
      "quotaRemaining": 543211
    }
  }
}
```

---

### GET `/admin/system`
Get system health and performance metrics.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "system": {
    "status": "healthy",
    "uptime": 2647832,
    "memory": {
      "used": "156MB",
      "available": "2GB"
    },
    "database": {
      "status": "connected",
      "responseTime": 23,
      "connections": 15
    },
    "redis": {
      "status": "connected",
      "memory": "45MB",
      "keys": 1247
    },
    "api": {
      "responseTime": 145,
      "errorRate": 0.02
    }
  }
}
```

---

## 🏥 Health & Monitoring

### GET `/health`
System health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T12:00:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 23
    },
    "redis": {
      "status": "healthy",
      "responseTime": 8
    },
    "api": {
      "status": "healthy",
      "responseTime": 145
    }
  },
  "metrics": {
    "memoryUsage": {
      "rss": 167772160,
      "heapTotal": 134217728,
      "heapUsed": 89478485
    }
  }
}
```

---

### GET `/test/system-health`
Comprehensive system health testing (admin only).

**Response (200):**
```json
{
  "overall": "pass",
  "timestamp": "2025-01-18T12:00:00Z",
  "totalDuration": 2341,
  "tests": [
    {
      "component": "Database Connection",
      "status": "pass",
      "duration": 234,
      "details": { "queryCount": 2 }
    },
    {
      "component": "Redis Cache Operations",
      "status": "pass",
      "duration": 123,
      "details": { "cacheOperations": 3 }
    }
  ],
  "summary": {
    "passed": 8,
    "failed": 0,
    "warnings": 0,
    "total": 8
  }
}
```

---

## 💳 Payment Endpoints

### POST `/payments/square`
Process Square payment for subscription upgrade.

**Request Body:**
```json
{
  "nonce": "card_nonce_from_square",
  "amount": 2999,
  "currency": "USD",
  "subscriptionTier": "premium",
  "userId": "user_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "payment": {
    "id": "payment_123",
    "status": "COMPLETED",
    "amount": 2999,
    "currency": "USD"
  },
  "subscription": {
    "tier": "premium",
    "expiresAt": "2026-01-18T12:00:00Z"
  }
}
```

---

## 📊 Analytics Endpoints

### POST `/analytics/web-vitals`
Submit web vitals metrics.

**Request Body:**
```json
{
  "name": "LCP",
  "value": 1247.5,
  "id": "metric_123",
  "url": "/dashboard",
  "userAgent": "Mozilla/5.0..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Metric recorded successfully"
}
```

---

## 🔗 CSRF Token

### GET `/csrf-token`
Get CSRF token for secure form submissions.

**Response (200):**
```json
{
  "csrfToken": "abc123def456...",
  "expires": 1705665600000
}
```

---

## 🚨 Error Responses

All endpoints follow consistent error response format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 300
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "requestId": "req_123"
}
```

---

## 📝 Rate Limiting

Most endpoints implement rate limiting:

- **Authentication:** 5 requests per 5 minutes per IP
- **2FA Operations:** 5 requests per 5 minutes per IP  
- **API Requests:** 100 requests per hour per user
- **Admin Operations:** 10 requests per minute
- **Health Checks:** 60 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705665600
```

---

## 🔐 Security Headers

All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 📚 SDK Examples

### JavaScript/TypeScript
```typescript
const apiClient = {
  baseUrl: 'https://your-domain.vercel.app/api',
  
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      },
      ...options
    });
    
    return response.json();
  },
  
  async login(identifier: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  },
  
  async getArbitrageOpportunities(sport?: string) {
    const params = sport ? `?sport=${sport}` : '';
    return this.request(`/optimized-odds${params}`);
  }
};
```

---

## 📖 Changelog

### Version 1.0.0 (2025-01-18)
- Initial API release
- Authentication system with JWT
- 2FA implementation
- Admin management endpoints
- Arbitrage calculation APIs
- Health monitoring endpoints
- Rate limiting and security measures

---

*This documentation covers all available API endpoints. For additional support, contact: support@sportsarb.com*