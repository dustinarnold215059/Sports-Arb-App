import { NextApiRequest } from 'next';
import { sessionService } from '@/lib/cache/sessionService';

export interface AuthResult {
  authenticated: boolean;
  user?: {
    userId: string;
    email: string;
    username: string;
    role: string;
    loginAt: Date;
    ipAddress: string;
    userAgent: string;
  };
  error?: string;
}

/**
 * Authentication middleware for API routes
 * Validates session and returns user data
 */
export async function authMiddleware(req: NextApiRequest): Promise<AuthResult> {
  try {
    // Get session token from cookie or Authorization header
    const sessionToken = req.cookies.session || 
      req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return {
        authenticated: false,
        error: 'No session token provided'
      };
    }

    // Validate session
    const sessionData = await sessionService.getSession(sessionToken);
    
    if (!sessionData) {
      return {
        authenticated: false,
        error: 'Invalid or expired session'
      };
    }

    // Return authenticated user data
    return {
      authenticated: true,
      user: {
        userId: sessionData.userId,
        email: sessionData.email,
        username: sessionData.username,
        role: sessionData.role,
        loginAt: sessionData.loginAt,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent
      }
    };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      authenticated: false,
      error: 'Authentication error'
    };
  }
}

/**
 * Role-based access control middleware
 */
export async function requireRole(req: NextApiRequest, requiredRole: string): Promise<AuthResult> {
  const authResult = await authMiddleware(req);
  
  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  // Check if user has required role
  const userRole = authResult.user.role;
  const roleHierarchy = {
    'user': 0,
    'moderator': 1,
    'admin': 2,
    'superadmin': 3
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

  if (userLevel < requiredLevel) {
    return {
      authenticated: false,
      error: `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`
    };
  }

  return authResult;
}

/**
 * Admin access middleware
 */
export async function requireAdmin(req: NextApiRequest): Promise<AuthResult> {
  return requireRole(req, 'admin');
}

/**
 * Moderator access middleware
 */
export async function requireModerator(req: NextApiRequest): Promise<AuthResult> {
  return requireRole(req, 'moderator');
}