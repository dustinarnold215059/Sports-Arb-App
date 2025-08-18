import { PrismaClient, User, UserSession } from '@prisma/client';
import { PasswordService } from '@/lib/security/auth';
import { EnvManager } from '@/lib/security/env';

const prisma = new PrismaClient({
  datasourceUrl: EnvManager.getDatabaseURL(),
  log: EnvManager.isDevelopment() ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  requiresEmailVerification?: boolean;
  isLocked?: boolean;
}

export interface SessionData {
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class DatabaseUserService {
  
  /**
   * Initialize database connection and run health checks
   */
  static async initialize(): Promise<void> {
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Run a simple health check
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database health check passed');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new user with hashed password
   */
  static async createUser(userData: CreateUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email.toLowerCase() },
            { username: userData.username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          return { success: false, error: 'Email already exists' };
        }
        if (existingUser.username === userData.username.toLowerCase()) {
          return { success: false, error: 'Username already exists' };
        }
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username.toLowerCase(),
          email: userData.email.toLowerCase(),
          passwordHash,
          role: userData.role || 'basic',
          emailVerified: EnvManager.isFeatureEnabled('ENABLE_EMAIL_VERIFICATION') ? false : true
        }
      });

      // Create default portfolio
      await prisma.portfolio.create({
        data: {
          userId: user.id
        }
      });

      console.log(`✅ User created: ${user.username} (${user.email})`);

      return { 
        success: true, 
        user,
        requiresEmailVerification: !user.emailVerified
      };

    } catch (error) {
      console.error('❌ User creation failed:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  /**
   * Authenticate user with username/email and password
   */
  static async authenticateUser(identifier: string, password: string): Promise<AuthResult> {
    try {
      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() }
          ]
        }
      });

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.isLocked) {
        return { 
          success: false, 
          error: 'Account is locked due to too many failed login attempts',
          isLocked: true
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await PasswordService.verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Reset failed login attempts on successful login
      await this.resetFailedLoginAttempts(user.id);

      // Update last activity
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActivity: new Date() }
      });

      console.log(`✅ User authenticated: ${user.username}`);

      return { 
        success: true, 
        user,
        requiresEmailVerification: !user.emailVerified && EnvManager.isFeatureEnabled('ENABLE_EMAIL_VERIFICATION')
      };

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      console.error('❌ Get user by ID failed:', error);
      return null;
    }
  }

  /**
   * Create user session
   */
  static async createSession(userId: string, sessionData: SessionData): Promise<UserSession | null> {
    try {
      // Clean up expired sessions
      await this.cleanupExpiredSessions(userId);

      // Create new session
      const session = await prisma.userSession.create({
        data: {
          userId,
          sessionToken: sessionData.sessionToken,
          refreshToken: sessionData.refreshToken,
          expiresAt: sessionData.expiresAt,
          userAgent: sessionData.userAgent,
          ipAddress: sessionData.ipAddress
        }
      });

      console.log(`✅ Session created for user: ${userId}`);
      return session;

    } catch (error) {
      console.error('❌ Session creation failed:', error);
      return null;
    }
  }

  /**
   * Get session by refresh token
   */
  static async getSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    try {
      return await prisma.userSession.findUnique({
        where: { 
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });
    } catch (error) {
      console.error('❌ Get session failed:', error);
      return null;
    }
  }

  /**
   * Invalidate session
   */
  static async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      await prisma.userSession.updateMany({
        where: { sessionToken },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      console.error('❌ Session invalidation failed:', error);
      return false;
    }
  }

  /**
   * Increment failed login attempts and lock account if necessary
   */
  private static async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newFailedAttempts >= 5;

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newFailedAttempts,
        lastFailedLogin: new Date(),
        isLocked: shouldLock
      }
    });

    if (shouldLock) {
      console.warn(`⚠️ Account locked due to failed attempts: ${user.username}`);
    }
  }

  /**
   * Reset failed login attempts
   */
  private static async resetFailedLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLogin: null
      }
    });
  }

  /**
   * Clean up expired sessions for a user
   */
  private static async cleanupExpiredSessions(userId: string): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: {
          userId,
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false }
          ]
        }
      });
    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<any> {
    try {
      const [user, portfolio, betStats] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.portfolio.findUnique({ where: { userId } }),
        prisma.bet.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { stake: true, potentialWin: true, profit: true }
        })
      ]);

      return {
        user,
        portfolio,
        betStats: {
          totalBets: betStats._count.id || 0,
          totalStaked: betStats._sum.stake || 0,
          totalPotentialWin: betStats._sum.potentialWin || 0,
          totalProfit: betStats._sum.profit || 0
        }
      };
    } catch (error) {
      console.error('❌ Get user stats failed:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  static async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
    }
  }
}

export default DatabaseUserService;