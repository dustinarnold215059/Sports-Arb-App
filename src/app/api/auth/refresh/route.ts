import { NextRequest, NextResponse } from 'next/server';
import { JWTService, RateLimitService, SecurityUtils } from '@/lib/security/auth';
import { secureUserDatabase } from '@/lib/security/secureUserDatabase';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for token refresh
    const clientIP = SecurityUtils.getClientIP(request);
    const rateLimitKey = `token_refresh:${clientIP}`;
    const rateLimit = RateLimitService.checkRateLimit(rateLimitKey, 10, 60 * 1000); // 10 attempts per minute

    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Too many refresh attempts',
        success: false
      }, { status: 429 });
    }

    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({
        error: 'No refresh token provided',
        success: false
      }, { status: 401 });
    }

    // Verify refresh token
    const tokenPayload = JWTService.verifyRefreshToken(refreshToken);

    if (!tokenPayload) {
      return NextResponse.json({
        error: 'Invalid refresh token',
        success: false
      }, { status: 401 });
    }

    // Get user from database
    const user = await secureUserDatabase.getUserById(tokenPayload.userId);

    if (!user || !user.isActive) {
      return NextResponse.json({
        error: 'User not found or inactive',
        success: false
      }, { status: 401 });
    }

    // Generate new access token
    const accessToken = JWTService.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    return NextResponse.json({
      accessToken,
      expiresAt: JWTService.getTokenExpiry(accessToken),
      success: true
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({
      error: 'Token refresh failed',
      success: false
    }, { status: 500 });
  }
}

// Logout endpoint - clear refresh token
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Logged out successfully',
      success: true
    });

    // Clear the refresh token cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Immediate expiry
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      error: 'Logout failed',
      success: false
    }, { status: 500 });
  }
}