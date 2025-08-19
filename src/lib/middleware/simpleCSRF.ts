import { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';

// Simple in-memory store for CSRF tokens (for development)
// In production, you'd want to use Redis or a database
const tokenStore = new Map<string, { token: string; expires: number; sessionId: string }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hash, data] of tokenStore.entries()) {
    if (now > data.expires) {
      tokenStore.delete(hash);
    }
  }
}, 5 * 60 * 1000);

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

function createTokenHash(token: string, sessionId: string): string {
  return createHash('sha256').update(`${token}:${sessionId}`).digest('hex');
}

export function getCSRFToken(sessionId: string): string {
  const token = generateCSRFToken();
  const hash = createTokenHash(token, sessionId);
  const expires = Date.now() + (60 * 60 * 1000); // 1 hour
  
  tokenStore.set(hash, { token, expires, sessionId });
  return token;
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  const hash = createTokenHash(token, sessionId);
  const stored = tokenStore.get(hash);
  
  if (!stored || Date.now() > stored.expires) {
    if (stored) tokenStore.delete(hash);
    return false;
  }
  
  // Remove token after use (single use)
  tokenStore.delete(hash);
  return true;
}

export function simpleCSRFProtection() {
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

      // Generate new token for response
      const newToken = getCSRFToken(sessionId);
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

export async function handleSimpleCSRFTokenRequest(
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
    const token = getCSRFToken(sessionId);
    
    // Set the session ID in cookie if it was temporary
    if (!req.cookies.session) {
      res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; SameSite=strict; Path=/; Max-Age=${24 * 60 * 60}`);
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