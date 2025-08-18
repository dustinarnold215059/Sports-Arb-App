/**
 * JWT Token Blacklist Service
 * Manages blacklisted/revoked JWT tokens to prevent token reuse
 */

import { redisCache } from '@/lib/cache/redisClient';
import { verify, JwtPayload } from 'jsonwebtoken';

export interface BlacklistedToken {
  jti: string; // JWT ID
  userId: string;
  exp: number; // Expiration timestamp
  reason: 'logout' | 'security' | 'admin_revoke' | 'password_change';
  blacklistedAt: Date;
}

export class TokenBlacklist {
  private static instance: TokenBlacklist;
  private readonly BLACKLIST_PREFIX = 'jwt:blacklist';
  private readonly USER_TOKENS_PREFIX = 'user:tokens';

  static getInstance(): TokenBlacklist {
    if (!TokenBlacklist.instance) {
      TokenBlacklist.instance = new TokenBlacklist();
    }
    return TokenBlacklist.instance;
  }

  /**
   * Add token to blacklist
   */
  async blacklistToken(
    token: string, 
    userId: string, 
    reason: BlacklistedToken['reason']
  ): Promise<boolean> {
    try {
      // Decode token to get JTI and expiration
      const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const jti = decoded.jti || this.generateJTI(token);
      const exp = decoded.exp || (Math.floor(Date.now() / 1000) + 3600);

      const blacklistedToken: BlacklistedToken = {
        jti,
        userId,
        exp,
        reason,
        blacklistedAt: new Date()
      };

      // Store in blacklist with TTL based on token expiration
      const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
      const blacklistKey = `${this.BLACKLIST_PREFIX}:${jti}`;
      
      await redisCache.set(blacklistKey, blacklistedToken, { ttl });
      
      // Also track under user's tokens
      const userTokensKey = `${this.USER_TOKENS_PREFIX}:${userId}`;
      const userTokens = await redisCache.get<string[]>(userTokensKey) || [];
      
      if (!userTokens.includes(jti)) {
        userTokens.push(jti);
        await redisCache.set(userTokensKey, userTokens, { ttl: 86400 }); // 24 hours
      }

      console.log(`🚫 Token blacklisted: ${jti} (reason: ${reason})`);
      return true;
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const jti = decoded.jti || this.generateJTI(token);
      
      const blacklistKey = `${this.BLACKLIST_PREFIX}:${jti}`;
      const blacklisted = await redisCache.get<BlacklistedToken>(blacklistKey);
      
      return blacklisted !== null;
    } catch (error) {
      // If token can't be decoded, consider it invalid/blacklisted
      return true;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(
    userId: string, 
    reason: BlacklistedToken['reason']
  ): Promise<number> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}:${userId}`;
      const userTokens = await redisCache.get<string[]>(userTokensKey) || [];
      
      let revokedCount = 0;
      
      for (const jti of userTokens) {
        const blacklistKey = `${this.BLACKLIST_PREFIX}:${jti}`;
        
        // Check if not already blacklisted
        const existing = await redisCache.get(blacklistKey);
        if (!existing) {
          const blacklistedToken: BlacklistedToken = {
            jti,
            userId,
            exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
            reason,
            blacklistedAt: new Date()
          };
          
          await redisCache.set(blacklistKey, blacklistedToken, { ttl: 86400 });
          revokedCount++;
        }
      }

      // Clear user's token list
      await redisCache.delete(userTokensKey);
      
      console.log(`🚫 Revoked ${revokedCount} tokens for user ${userId} (reason: ${reason})`);
      return revokedCount;
    } catch (error) {
      console.error('Failed to revoke user tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up expired blacklisted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // This is handled automatically by Redis TTL, but we can implement manual cleanup
      // For monitoring purposes, we'll just log the cleanup
      console.log('🧹 JWT blacklist cleanup completed (handled by Redis TTL)');
      return 0;
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    byReason: Record<string, number>;
    recentlyBlacklisted: BlacklistedToken[];
  }> {
    try {
      // This would require scanning Redis keys, which is expensive
      // For now, return basic stats
      return {
        totalBlacklisted: 0, // Would need Redis SCAN to count
        byReason: {},
        recentlyBlacklisted: []
      };
    } catch (error) {
      console.error('Failed to get blacklist stats:', error);
      return {
        totalBlacklisted: 0,
        byReason: {},
        recentlyBlacklisted: []
      };
    }
  }

  /**
   * Generate JTI if not present in token
   */
  private generateJTI(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Validate and check token in one operation
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    blacklisted: boolean;
    decoded?: JwtPayload;
    reason?: string;
  }> {
    try {
      // First check if blacklisted
      const blacklisted = await this.isTokenBlacklisted(token);
      if (blacklisted) {
        return {
          valid: false,
          blacklisted: true,
          reason: 'Token has been revoked'
        };
      }

      // Then verify token signature and expiration
      const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      return {
        valid: true,
        blacklisted: false,
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        blacklisted: false,
        reason: 'Token verification failed'
      };
    }
  }
}

// Export singleton instance
export const tokenBlacklist = TokenBlacklist.getInstance();

// Utility functions
export async function blacklistToken(
  token: string, 
  userId: string, 
  reason: BlacklistedToken['reason']
): Promise<boolean> {
  return tokenBlacklist.blacklistToken(token, userId, reason);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return tokenBlacklist.isTokenBlacklisted(token);
}

export async function revokeAllUserTokens(
  userId: string, 
  reason: BlacklistedToken['reason']
): Promise<number> {
  return tokenBlacklist.revokeAllUserTokens(userId, reason);
}