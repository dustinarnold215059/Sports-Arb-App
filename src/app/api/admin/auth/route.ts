import { NextRequest, NextResponse } from 'next/server';
import { databaseUserService } from '@/lib/security/databaseUserService';
import { JWTService, RateLimitService, SecurityUtils, InputSanitizer } from '@/lib/security/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting based on IP
    const clientIP = SecurityUtils.getClientIP(request);
    const rateLimitKey = `admin_auth:${clientIP}`;
    const rateLimit = RateLimitService.checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes

    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime);
      return NextResponse.json({
        error: 'Too many login attempts. Please try again later.',
        success: false,
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': resetTime.toISOString()
        }
      });
    }

    const body = await request.json();
    const { username, password } = body;

    // Input validation
    if (!username || !password) {
      return NextResponse.json({
        error: 'Username and password are required',
        success: false
      }, { status: 400 });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({
        error: 'Invalid input format',
        success: false
      }, { status: 400 });
    }

    // Sanitize inputs
    let cleanUsername: string;
    try {
      cleanUsername = InputSanitizer.sanitizeString(username);
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid username format',
        success: false
      }, { status: 400 });
    }

    // Initialize database service if needed
    await databaseUserService.initialize();

    // Authenticate user with database
    const authResult = await databaseUserService.authenticateUser(cleanUsername, password);

    if (!authResult.success) {
      // Log failed attempt for monitoring
      console.warn(`Failed admin login attempt for username: ${cleanUsername} from IP: ${clientIP}`);
      
      return NextResponse.json({
        error: authResult.error || 'Authentication failed',
        success: false
      }, { status: 401 });
    }

    const user = authResult.user!;

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.warn(`Non-admin user ${user.username} attempted admin access from IP: ${clientIP}`);
      
      return NextResponse.json({
        error: 'Admin access required',
        success: false
      }, { status: 403 });
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json({
        error: 'Account is deactivated',
        success: false
      }, { status: 403 });
    }

    // Generate secure JWT tokens
    const accessToken = JWTService.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const refreshToken = JWTService.generateRefreshToken({
      userId: user.id
    });

    // Reset rate limit on successful login
    RateLimitService.resetRateLimit(rateLimitKey);

    // Log successful admin login for monitoring
    console.info(`Successful admin login: ${user.username} from IP: ${clientIP}`);

    // Set secure HTTP-only cookie for refresh token
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin
      },
      success: true,
      accessToken,
      expiresAt: JWTService.getTokenExpiry(accessToken)
    });

    // Set secure refresh token cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
}