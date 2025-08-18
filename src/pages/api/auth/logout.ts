import { NextApiRequest, NextApiResponse } from 'next';
import { sessionService } from '@/lib/cache/sessionService';
import { authMiddleware } from '@/lib/middleware/auth';
import { logRequest } from '@/lib/middleware/logging';

/**
 * User Logout API Endpoint
 * POST /api/auth/logout
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
    // Get session token from cookie or header
    const sessionToken = req.cookies.session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'No session token provided'
      });
    }

    // Invalidate session
    const invalidated = await sessionService.invalidateSession(sessionToken);
    
    if (!invalidated) {
      console.warn('Failed to invalidate session:', sessionToken);
    }

    // Clear cookie
    res.setHeader('Set-Cookie', [
      'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
    ]);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}