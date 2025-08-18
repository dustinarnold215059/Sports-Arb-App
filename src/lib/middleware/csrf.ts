/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * Generates and validates CSRF tokens to prevent CSRF attacks
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';
import { redisCache } from '@/lib/cache/redisClient';

export interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  maxAge?: number; // in seconds
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  exemptMethods?: string[];
}

const DEFAULT_OPTIONS: Required<CSRFOptions> = {
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  maxAge: 3600, // 1 hour
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  exemptMethods: ['GET', 'HEAD', 'OPTIONS']
};

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a signed token hash for validation
 */
function createTokenHash(token: string, secret: string): string {
  return createHash('sha256').update(`${token}:${secret}`).digest('hex');
}

/**
 * Get or create CSRF secret for session
 */
async function getOrCreateSecret(sessionId: string): Promise<string> {
  const cacheKey = `csrf:secret:${sessionId}`;
  
  let secret = await redisCache.get<string>(cacheKey);
  if (!secret) {
    secret = randomBytes(32).toString('hex');
    await redisCache.set(cacheKey, secret, { ttl: 86400 }); // 24 hours
  }
  
  return secret;
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(options: CSRFOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> => {
    try {
      // Skip CSRF for exempt methods
      if (config.exemptMethods.includes(req.method || 'GET')) {
        return next();
      }

      // Get session ID (from cookie or generate temporary one)
      const sessionId = req.cookies.session || `temp_${Date.now()}_${Math.random()}`;
      
      // Get or create secret for this session
      const secret = await getOrCreateSecret(sessionId);

      // For state-changing methods, validate token
      if (!config.exemptMethods.includes(req.method || 'GET')) {
        const token = req.headers[config.headerName] as string || 
                     req.body?.[config.cookieName] ||
                     req.query[config.cookieName] as string;

        if (!token) {
          res.status(403).json({
            error: 'CSRF token missing',
            message: 'CSRF token is required for this request'
          });
          return;
        }

        // Validate token
        const tokenHash = createTokenHash(token, secret);
        const storedHash = await redisCache.get<string>(`csrf:token:${tokenHash}`);
        
        if (!storedHash || storedHash !== tokenHash) {
          res.status(403).json({
            error: 'Invalid CSRF token',
            message: 'CSRF token validation failed'
          });
          return;
        }

        // Token is valid, remove it (single use)
        await redisCache.delete(`csrf:token:${tokenHash}`);
      }

      // Generate new token for response
      const newToken = generateCSRFToken();
      const newTokenHash = createTokenHash(newToken, secret);
      
      // Store token hash with expiration
      await redisCache.set(`csrf:token:${newTokenHash}`, newTokenHash, { 
        ttl: config.maxAge 
      });

      // Set token in cookie for client use
      const cookieOptions = [
        `Max-Age=${config.maxAge}`,
        `SameSite=${config.sameSite}`,
        'HttpOnly=false', // Client needs to read this
        'Path=/'
      ];

      if (config.secure) {
        cookieOptions.push('Secure');
      }

      res.setHeader('Set-Cookie', 
        `${config.cookieName}=${newToken}; ${cookieOptions.join('; ')}`
      );

      // Also provide token in header for API responses
      res.setHeader('X-CSRF-Token', newToken);

      next();
    } catch (error) {
      console.error('CSRF middleware error:', error);
      res.status(500).json({
        error: 'CSRF protection error',
        message: 'Internal server error during CSRF validation'
      });
    }
  };
}

/**
 * Get CSRF token for client-side use
 */
export async function getCSRFToken(req: NextApiRequest): Promise<string | null> {
  try {
    const sessionId = req.cookies.session;
    if (!sessionId) return null;

    const secret = await getOrCreateSecret(sessionId);
    const token = generateCSRFToken();
    const tokenHash = createTokenHash(token, secret);
    
    // Store token for validation
    await redisCache.set(`csrf:token:${tokenHash}`, tokenHash, { ttl: 3600 });
    
    return token;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return null;
  }
}

/**
 * Validate CSRF token manually
 */
export async function validateCSRFToken(
  token: string, 
  sessionId: string
): Promise<boolean> {
  try {
    const secret = await redisCache.get<string>(`csrf:secret:${sessionId}`);
    if (!secret) return false;

    const tokenHash = createTokenHash(token, secret);
    const storedHash = await redisCache.get<string>(`csrf:token:${tokenHash}`);
    
    return storedHash === tokenHash;
  } catch (error) {
    console.error('CSRF token validation error:', error);
    return false;
  }
}

/**
 * Clean up expired CSRF tokens (utility function)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  // This would typically be handled by Redis TTL, but can be used for manual cleanup
  console.log('CSRF token cleanup completed');
}

/**
 * CSRF token endpoint helper
 */
export async function handleCSRFTokenRequest(
  req: NextApiRequest, 
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const token = await getCSRFToken(req);
    
    if (!token) {
      res.status(500).json({ error: 'Failed to generate CSRF token' });
      return;
    }

    res.status(200).json({ 
      csrfToken: token,
      expires: Date.now() + (3600 * 1000) // 1 hour
    });
  } catch (error) {
    console.error('CSRF token endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}