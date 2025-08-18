import { NextApiRequest } from 'next';
import { redisCache } from '@/lib/cache/redisClient';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limiter service for API endpoints
 */
class RateLimiter {
  private defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    keyGenerator: (req) => this.getClientIdentifier(req),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  /**
   * Check if request is within rate limit
   */
  async checkLimit(req: NextApiRequest, config?: Partial<RateLimitConfig>): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Get current request count for this key
      const rateLimitKey = `rate_limit:${key}:${Math.floor(now / finalConfig.windowMs)}`;
      const currentCount = await redisCache.get<number>(rateLimitKey) || 0;

      if (currentCount >= finalConfig.maxRequests) {
        const resetTime = Math.ceil(now / finalConfig.windowMs) * finalConfig.windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }

      // Increment counter
      const newCount = currentCount + 1;
      await redisCache.set(rateLimitKey, newCount, { 
        ttl: Math.ceil(finalConfig.windowMs / 1000) 
      });

      const resetTime = Math.ceil(now / finalConfig.windowMs) * finalConfig.windowMs;

      return {
        allowed: true,
        remaining: finalConfig.maxRequests - newCount,
        resetTime
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter is down
      return {
        allowed: true,
        remaining: finalConfig.maxRequests - 1,
        resetTime: now + finalConfig.windowMs
      };
    }
  }

  /**
   * Create endpoint-specific rate limiter
   */
  createEndpointLimiter(config: Partial<RateLimitConfig>) {
    return (req: NextApiRequest) => this.checkLimit(req, config);
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(req: NextApiRequest): string {
    // Try to get real IP from headers (Vercel, Cloudflare, etc.)
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    
    const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    
    // For authenticated requests, also include user ID for better granularity
    const sessionToken = req.cookies.session || req.headers.authorization?.replace('Bearer ', '');
    
    return sessionToken ? `${ip}:${sessionToken}` : ip;
  }

  /**
   * Clear rate limit for a specific key (admin function)
   */
  async clearLimit(req: NextApiRequest, config?: Partial<RateLimitConfig>): Promise<boolean> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const key = finalConfig.keyGenerator!(req);
      const now = Date.now();
      const rateLimitKey = `rate_limit:${key}:${Math.floor(now / finalConfig.windowMs)}`;
      
      await redisCache.del(rateLimitKey);
      return true;
    } catch (error) {
      console.error('Clear rate limit error:', error);
      return false;
    }
  }

  /**
   * Get rate limit status without incrementing
   */
  async getStatus(req: NextApiRequest, config?: Partial<RateLimitConfig>): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();

    try {
      const rateLimitKey = `rate_limit:${key}:${Math.floor(now / finalConfig.windowMs)}`;
      const currentCount = await redisCache.get<number>(rateLimitKey) || 0;
      const resetTime = Math.ceil(now / finalConfig.windowMs) * finalConfig.windowMs;

      return {
        allowed: currentCount < finalConfig.maxRequests,
        remaining: Math.max(0, finalConfig.maxRequests - currentCount),
        resetTime,
        retryAfter: currentCount >= finalConfig.maxRequests 
          ? Math.ceil((resetTime - now) / 1000) 
          : undefined
      };
    } catch (error) {
      console.error('Get rate limit status error:', error);
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs
      };
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Predefined rate limiters for common use cases
export const authRateLimiter = rateLimiter.createEndpointLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 login attempts per 15 minutes
});

export const apiRateLimiter = rateLimiter.createEndpointLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
});

export const strictRateLimiter = rateLimiter.createEndpointLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests per minute
});

export default rateLimiter;