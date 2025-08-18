/**
 * Admin Authentication API Endpoint
 * POST /api/admin/auth
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { validateRequestBody } from '@/lib/middleware/validation';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { z } from 'zod';

const AdminAuthSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Rate limiting for admin auth
    const rateLimitResult = await rateLimiter.checkLimit(req, 'admin-auth', {
      requests: 5,
      window: 300000 // 5 minutes
    });

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        description: 'Admin auth rate limit exceeded',
        req,
        severity: 'high',
        metadata: { endpoint: 'admin-auth' }
      });

      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const validationResult = validateRequestBody(req.body, AdminAuthSchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { username, password } = validationResult.data;

    // Admin credentials - in production, these should be environment variables
    const validCredentials = [
      { username: 'admin@test.com', password: 'admin123' },
      { username: 'admin', password: 'admin123' }
    ];

    // Check credentials
    const isValid = validCredentials.some(
      cred => cred.username === username && cred.password === password
    );

    if (!isValid) {
      logSecurityEvent({
        type: 'failed_login',
        description: `Failed admin login attempt for username: ${username}`,
        req,
        severity: 'high',
        metadata: { 
          action: 'admin_login_failed',
          username,
          userAgent: req.headers['user-agent']
        }
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Success
    logSecurityEvent({
      type: 'successful_login',
      description: `Successful admin login for username: ${username}`,
      req,
      severity: 'medium',
      metadata: { 
        action: 'admin_login_success',
        username,
        userAgent: req.headers['user-agent']
      }
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        username,
        role: 'admin',
        isActive: true
      }
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    
    logSecurityEvent({
      type: 'system_error',
      description: 'Admin authentication system error',
      req,
      severity: 'high',
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'admin_auth_system_error'
      }
    });

    res.status(500).json({
      success: false,
      error: 'Authentication failed due to system error'
    });
  }
}