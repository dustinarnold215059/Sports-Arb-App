import { NextRequest, NextResponse } from 'next/server';
import { JWTService, SecurityUtils } from './auth';
import { secureUserDatabase } from './secureUserDatabase';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

// JWT authentication middleware
export async function authenticateToken(request: NextRequest): Promise<{
  success: boolean;
  user?: { userId: string; username: string; role: string };
  error?: string;
  response?: NextResponse;
}> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return {
        success: false,
        error: 'No access token provided',
        response: NextResponse.json({
          error: 'Authentication required',
          success: false
        }, { status: 401 })
      };
    }

    // Verify token
    const tokenPayload = JWTService.verifyAccessToken(token);

    if (!tokenPayload) {
      return {
        success: false,
        error: 'Invalid or expired token',
        response: NextResponse.json({
          error: 'Invalid or expired token',
          success: false
        }, { status: 401 })
      };
    }

    // Verify user still exists and is active
    const user = await secureUserDatabase.getUserById(tokenPayload.userId);

    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'User not found or inactive',
        response: NextResponse.json({
          error: 'User not found or inactive',
          success: false
        }, { status: 401 })
      };
    }

    return {
      success: true,
      user: tokenPayload
    };

  } catch (error) {
    console.error('Token authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json({
        error: 'Authentication failed',
        success: false
      }, { status: 500 })
    };
  }
}

// Admin authentication middleware
export async function authenticateAdmin(request: NextRequest): Promise<{
  success: boolean;
  user?: { userId: string; username: string; role: string };
  error?: string;
  response?: NextResponse;
}> {
  const authResult = await authenticateToken(request);

  if (!authResult.success) {
    return authResult;
  }

  // Check if user has admin role
  if (authResult.user?.role !== 'admin') {
    return {
      success: false,
      error: 'Admin access required',
      response: NextResponse.json({
        error: 'Admin access required',
        success: false
      }, { status: 403 })
    };
  }

  return authResult;
}

// Premium user authentication middleware
export async function authenticatePremium(request: NextRequest): Promise<{
  success: boolean;
  user?: { userId: string; username: string; role: string };
  error?: string;
  response?: NextResponse;
}> {
  const authResult = await authenticateToken(request);

  if (!authResult.success) {
    return authResult;
  }

  // Check if user has premium access
  const allowedRoles = ['admin', 'premium', 'pro'];
  if (!allowedRoles.includes(authResult.user?.role || '')) {
    return {
      success: false,
      error: 'Premium access required',
      response: NextResponse.json({
        error: 'Premium access required',
        success: false
      }, { status: 403 })
    };
  }

  return authResult;
}

// Rate limiting middleware
export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number,
  keyGenerator?: (request: NextRequest) => string
) {
  return (request: NextRequest): NextResponse | null => {
    const key = keyGenerator ? keyGenerator(request) : SecurityUtils.getClientIP(request);
    const rateLimitKey = `rate_limit:${key}`;
    
    const rateLimit = require('./auth').RateLimitService.checkRateLimit(rateLimitKey, maxRequests, windowMs);

    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime);
      return NextResponse.json({
        error: 'Rate limit exceeded',
        success: false,
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': resetTime.toISOString()
        }
      });
    }

    return null; // No rate limit hit, continue
  };
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // CSRF protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.the-odds-api.com https://*.sentry.io",
    "frame-src https://js.stripe.com"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

// CORS middleware for API routes
export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3005', 'http://localhost:3000'];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '3600');

  return response;
}

// Input validation middleware
export function validateJSONInput(request: NextRequest, schema: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  response?: NextResponse;
}> {
  return new Promise(async (resolve) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      
      resolve({
        success: true,
        data: validatedData
      });
    } catch (error: any) {
      resolve({
        success: false,
        error: error.message || 'Invalid input data',
        response: NextResponse.json({
          error: 'Invalid input data',
          details: error.errors || error.message,
          success: false
        }, { status: 400 })
      });
    }
  });
}

export default {
  authenticateToken,
  authenticateAdmin,
  authenticatePremium,
  createRateLimitMiddleware,
  addSecurityHeaders,
  addCorsHeaders,
  validateJSONInput
};