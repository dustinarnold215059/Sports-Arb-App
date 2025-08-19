import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseUserService } from '@/lib/database/userService';
import { sessionService } from '@/lib/cache/sessionService';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { validateRequestBody } from '@/lib/middleware/validation';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { vercelCSRFProtection } from '@/lib/middleware/vercelCSRF';
import { z } from 'zod';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

/**
 * User Login API Endpoint
 * POST /api/auth/login
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply middleware
  await logRequest(req, res);
  
  // Apply CSRF protection
  const csrf = vercelCSRFProtection();
  await new Promise<void>((resolve, reject) => {
    csrf(req, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  }).catch((error) => {
    console.error('CSRF protection failed:', error);
    return res.status(403).json({ 
      success: false, 
      error: 'CSRF validation failed' 
    });
  });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(req);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const validationResult = validateRequestBody(req.body, LoginSchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { identifier, password, rememberMe } = validationResult.data;

    // Authenticate user (static method)
    const authResult = await DatabaseUserService.authenticateUser(identifier, password);
    
    if (!authResult.success || !authResult.user) {
      // Log failed attempt for security monitoring
      console.warn(`Failed login attempt for: ${identifier} from IP: ${req.socket.remoteAddress}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create session token
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session
    const sessionData = {
      userId: authResult.user.id,
      email: authResult.user.email,
      username: authResult.user.username,
      role: authResult.user.role || 'user',
      loginAt: new Date(),
      ipAddress: req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const sessionOptions = {
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    };

    const sessionCreated = await sessionService.createSession(
      sessionToken, 
      sessionData, 
      sessionOptions
    );

    if (!sessionCreated) {
      console.error('Failed to create session for user:', authResult.user.id);
      return res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }

    // Set secure cookie
    const cookieOptions = [
      `httpOnly`,
      `secure=${process.env.NODE_ENV === 'production'}`,
      `sameSite=strict`,
      `path=/`,
      `maxAge=${sessionOptions.maxAge / 1000}`
    ].join('; ');

    res.setHeader('Set-Cookie', `session=${sessionToken}; ${cookieOptions}`);

    // Return success response
    res.status(200).json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        username: authResult.user.username,
        role: authResult.user.role,
        isActive: authResult.user.isActive
      },
      sessionToken: sessionToken,
      expiresAt: new Date(Date.now() + sessionOptions.maxAge)
    });

  } catch (error) {
    console.error('Login API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}