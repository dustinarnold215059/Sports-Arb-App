import { NextApiRequest, NextApiResponse } from 'next';
import { authMiddleware } from '@/lib/middleware/auth';
import { logRequest } from '@/lib/middleware/logging';

/**
 * Get Current User API Endpoint
 * GET /api/auth/me
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply middleware
  await logRequest(req, res);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(req);
    
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Return user data
    res.status(200).json({
      success: true,
      user: {
        id: authResult.user.userId,
        email: authResult.user.email,
        username: authResult.user.username,
        role: authResult.user.role,
        loginAt: authResult.user.loginAt,
        isActive: true // From session, user is active
      },
      session: {
        loginAt: authResult.user.loginAt,
        ipAddress: authResult.user.ipAddress,
        userAgent: authResult.user.userAgent
      }
    });

  } catch (error) {
    console.error('Get current user API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}