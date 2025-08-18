import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseUserService } from '@/lib/database/userService';
import { sessionService } from '@/lib/cache/sessionService';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { validateRequestBody } from '@/lib/middleware/validation';
import { logRequest } from '@/lib/middleware/logging';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * User Registration API Endpoint
 * POST /api/auth/register
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply middleware
  await logRequest(req, res);
  
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
        error: 'Too many registration attempts',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const validationResult = validateRequestBody(req.body, RegisterSchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { email, username, password } = validationResult.data;

    // Initialize user service
    const userService = new DatabaseUserService();
    
    // Create user
    const createResult = await userService.createUser({
      email,
      username,
      password,
      role: 'user' // Default role
    });
    
    if (!createResult.success) {
      return res.status(400).json({
        success: false,
        error: createResult.error || 'Failed to create user'
      });
    }

    // Auto-login after successful registration
    if (createResult.user && createResult.sessionToken) {
      const sessionData = {
        userId: createResult.user.id,
        email: createResult.user.email,
        username: createResult.user.username,
        role: createResult.user.role || 'user',
        loginAt: new Date(),
        ipAddress: req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      const sessionCreated = await sessionService.createSession(
        createResult.sessionToken, 
        sessionData, 
        { maxAge: 24 * 60 * 60 * 1000 } // 1 day
      );

      if (sessionCreated) {
        // Set secure cookie
        const cookieOptions = [
          `httpOnly`,
          `secure=${process.env.NODE_ENV === 'production'}`,
          `sameSite=strict`,
          `path=/`,
          `maxAge=86400`
        ].join('; ');

        res.setHeader('Set-Cookie', `session=${createResult.sessionToken}; ${cookieOptions}`);
      }
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: createResult.user!.id,
        email: createResult.user!.email,
        username: createResult.user!.username,
        role: createResult.user!.role,
        isActive: createResult.user!.isActive
      },
      sessionToken: createResult.sessionToken
    });

  } catch (error) {
    console.error('Registration API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}