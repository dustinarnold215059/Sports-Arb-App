import { redisCache } from './redisClient';
import { prisma } from '@/lib/database';
import { SecurityUtils } from '@/lib/security/auth';

export interface SessionData {
  userId: string;
  username: string;
  role: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionOptions {
  ttl?: number; // Time to live in seconds, default 7 days
  slidingExpiration?: boolean; // Extend expiration on activity
}

/**
 * Session management service using Redis for fast access
 * Falls back to database when Redis is unavailable
 */
class SessionService {
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly SESSION_PREFIX = 'session';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions';

  /**
   * Create a new session
   */
  async createSession(
    sessionToken: string, 
    sessionData: SessionData, 
    options: SessionOptions = {}
  ): Promise<boolean> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      
      // Store in Redis for fast access
      const redisStored = await redisCache.set(
        sessionToken, 
        sessionData, 
        { 
          prefix: this.SESSION_PREFIX, 
          ttl 
        }
      );

      // Also store in database for persistence
      try {
        await prisma.userSession.create({
          data: {
            userId: sessionData.userId,
            sessionToken,
            refreshToken: `refresh_${sessionToken}`, // Generate refresh token
            userAgent: sessionData.userAgent,
            ipAddress: sessionData.ipAddress,
            expiresAt: new Date(Date.now() + ttl * 1000),
            createdAt: sessionData.createdAt,
            lastActivity: sessionData.lastActivity
          }
        });
      } catch (dbError) {
        console.warn('⚠️ Failed to store session in database:', dbError);
        // Continue with Redis-only storage
      }

      // Track user sessions for management
      await this.addToUserSessions(sessionData.userId, sessionToken);

      console.log(`✅ Session created: ${sessionToken.substring(0, 8)}... for user ${sessionData.username}`);
      return redisStored;

    } catch (error) {
      console.error('❌ Session creation failed:', error);
      return false;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionToken: string): Promise<SessionData | null> {
    try {
      // Try Redis first
      let sessionData = await redisCache.get<SessionData>(
        sessionToken, 
        { prefix: this.SESSION_PREFIX }
      );

      if (sessionData) {
        // Update last activity if sliding expiration is enabled
        sessionData.lastActivity = new Date();
        await this.updateSessionActivity(sessionToken, sessionData);
        return sessionData;
      }

      // Fallback to database
      const dbSession = await prisma.userSession.findUnique({
        where: { 
          sessionToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (dbSession && dbSession.user) {
        sessionData = {
          userId: dbSession.userId,
          username: dbSession.user.username,
          role: dbSession.user.role,
          userAgent: dbSession.userAgent || undefined,
          ipAddress: dbSession.ipAddress || undefined,
          createdAt: dbSession.createdAt,
          lastActivity: new Date()
        };

        // Restore to Redis
        await redisCache.set(
          sessionToken, 
          sessionData, 
          { 
            prefix: this.SESSION_PREFIX, 
            ttl: Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000)
          }
        );

        return sessionData;
      }

      return null;

    } catch (error) {
      console.error('❌ Get session failed:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionToken: string, sessionData?: SessionData): Promise<boolean> {
    try {
      if (!sessionData) {
        sessionData = await this.getSession(sessionToken);
        if (!sessionData) return false;
      }

      sessionData.lastActivity = new Date();

      // Update in Redis
      await redisCache.set(
        sessionToken, 
        sessionData, 
        { 
          prefix: this.SESSION_PREFIX, 
          ttl: this.DEFAULT_TTL 
        }
      );

      // Update in database (async, non-blocking)
      prisma.userSession.update({
        where: { sessionToken },
        data: { lastActivity: sessionData.lastActivity }
      }).catch(error => {
        console.warn('⚠️ Failed to update session activity in database:', error);
      });

      return true;

    } catch (error) {
      console.error('❌ Update session activity failed:', error);
      return false;
    }
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      // Get session data to identify user
      const sessionData = await this.getSession(sessionToken);

      // Remove from Redis
      await redisCache.delete(sessionToken, { prefix: this.SESSION_PREFIX });

      // Deactivate in database
      await prisma.userSession.updateMany({
        where: { sessionToken },
        data: { isActive: false }
      });

      // Remove from user sessions list
      if (sessionData) {
        await this.removeFromUserSessions(sessionData.userId, sessionToken);
      }

      console.log(`✅ Session invalidated: ${sessionToken.substring(0, 8)}...`);
      return true;

    } catch (error) {
      console.error('❌ Session invalidation failed:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      // Get session tokens from Redis list
      const sessionTokens = await redisCache.get<string[]>(
        userId, 
        { prefix: this.USER_SESSIONS_PREFIX }
      ) || [];

      const sessions: SessionData[] = [];

      for (const token of sessionTokens) {
        const sessionData = await this.getSession(token);
        if (sessionData) {
          sessions.push(sessionData);
        }
      }

      return sessions;

    } catch (error) {
      console.error('❌ Get user sessions failed:', error);
      return [];
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<boolean> {
    try {
      const sessionTokens = await redisCache.get<string[]>(
        userId, 
        { prefix: this.USER_SESSIONS_PREFIX }
      ) || [];

      // Invalidate each session
      for (const token of sessionTokens) {
        await this.invalidateSession(token);
      }

      // Clear the user sessions list
      await redisCache.delete(userId, { prefix: this.USER_SESSIONS_PREFIX });

      console.log(`✅ All sessions invalidated for user: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Invalidate user sessions failed:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      let cleaned = 0;

      // Clean up database sessions
      const expiredSessions = await prisma.userSession.findMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false }
          ]
        },
        select: { sessionToken: true, userId: true }
      });

      for (const session of expiredSessions) {
        // Remove from Redis
        await redisCache.delete(session.sessionToken, { prefix: this.SESSION_PREFIX });
        
        // Remove from user sessions list
        await this.removeFromUserSessions(session.userId, session.sessionToken);
        
        cleaned++;
      }

      // Delete from database
      if (expiredSessions.length > 0) {
        await prisma.userSession.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { isActive: false }
            ]
          }
        });
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
      }

      return cleaned;

    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<any> {
    try {
      const [
        totalSessions,
        activeSessions,
        expiredSessions
      ] = await Promise.all([
        prisma.userSession.count(),
        prisma.userSession.count({ 
          where: { 
            isActive: true, 
            expiresAt: { gt: new Date() } 
          } 
        }),
        prisma.userSession.count({ 
          where: { 
            OR: [
              { expiresAt: { lt: new Date() } },
              { isActive: false }
            ]
          } 
        })
      ]);

      return {
        total: totalSessions,
        active: activeSessions,
        expired: expiredSessions,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Get session stats failed:', error);
      return null;
    }
  }

  /**
   * Private helper: Add session to user's session list
   */
  private async addToUserSessions(userId: string, sessionToken: string): Promise<void> {
    try {
      const existingSessions = await redisCache.get<string[]>(
        userId, 
        { prefix: this.USER_SESSIONS_PREFIX }
      ) || [];

      existingSessions.push(sessionToken);

      await redisCache.set(
        userId, 
        existingSessions, 
        { 
          prefix: this.USER_SESSIONS_PREFIX, 
          ttl: this.DEFAULT_TTL 
        }
      );
    } catch (error) {
      console.warn('⚠️ Failed to add to user sessions:', error);
    }
  }

  /**
   * Private helper: Remove session from user's session list
   */
  private async removeFromUserSessions(userId: string, sessionToken: string): Promise<void> {
    try {
      const existingSessions = await redisCache.get<string[]>(
        userId, 
        { prefix: this.USER_SESSIONS_PREFIX }
      ) || [];

      const updatedSessions = existingSessions.filter(token => token !== sessionToken);

      if (updatedSessions.length > 0) {
        await redisCache.set(
          userId, 
          updatedSessions, 
          { 
            prefix: this.USER_SESSIONS_PREFIX, 
            ttl: this.DEFAULT_TTL 
          }
        );
      } else {
        await redisCache.delete(userId, { prefix: this.USER_SESSIONS_PREFIX });
      }
    } catch (error) {
      console.warn('⚠️ Failed to remove from user sessions:', error);
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;