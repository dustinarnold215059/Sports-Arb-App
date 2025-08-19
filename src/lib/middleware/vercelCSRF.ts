import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Use JWT-based CSRF tokens for serverless compatibility
const CSRF_SECRET = process.env.CSRF_SECRET || 'csrf-secret-development-only-change-in-production';
const TOKEN_EXPIRY = '1h';

export function generateCSRFToken(sessionId: string): string {
  const nonce = randomBytes(16).toString('hex');
  const payload = {
    sessionId,
    nonce,
    type: 'csrf'
  };
  
  return jwt.sign(payload, CSRF_SECRET, { 
    expiresIn: TOKEN_EXPIRY,
    issuer: 'sports-arb-csrf'
  });
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  try {
    const decoded = jwt.verify(token, CSRF_SECRET, {
      issuer: 'sports-arb-csrf'
    }) as any;
    
    return decoded.sessionId === sessionId && decoded.type === 'csrf';
  } catch (error) {
    console.error('CSRF token validation failed:', error);
    return false;
  }
}

export function vercelCSRFProtection() {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> => {
    try {
      // Skip for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET')) {
        return next();
      }

      // Get session ID from cookie or create temporary one
      const sessionId = req.cookies.session || `temp_${Date.now()}_${Math.random()}`;
      
      // For state-changing methods, validate token
      const token = req.headers['x-csrf-token'] as string;

      if (!token) {
        res.status(403).json({
          success: false,
          error: 'CSRF token missing'
        });
        return;
      }

      // Validate token
      const isValid = validateCSRFToken(token, sessionId);
      
      if (!isValid) {
        res.status(403).json({
          success: false,
          error: 'Invalid CSRF token'
        });
        return;
      }

      // Generate new token for response (stateless)
      const newToken = generateCSRFToken(sessionId);
      res.setHeader('X-CSRF-Token', newToken);

      next();
    } catch (error) {
      console.error('CSRF middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'CSRF protection error'
      });
    }
  };
}

export async function handleVercelCSRFTokenRequest(
  req: NextApiRequest, 
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Get session ID from cookie or create temporary one
    const sessionId = req.cookies.session || `temp_${Date.now()}_${Math.random()}`;
    const token = generateCSRFToken(sessionId);
    
    // Set the session ID in cookie if it was temporary
    if (!req.cookies.session) {
      const cookieOptions = [
        'HttpOnly',
        'SameSite=strict',
        'Path=/',
        `Max-Age=${24 * 60 * 60}`, // 24 hours
        process.env.NODE_ENV === 'production' ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      
      res.setHeader('Set-Cookie', `session=${sessionId}; ${cookieOptions}`);
    }
    
    res.status(200).json({ 
      success: true,
      csrfToken: token,
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    });
  } catch (error) {
    console.error('CSRF token endpoint error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}