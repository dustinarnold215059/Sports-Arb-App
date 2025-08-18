import { PasswordService, SecurityUtils, InputSanitizer } from './auth';
import { prisma } from '@/lib/database';
import type { User as PrismaUser } from '@prisma/client';

// Re-export types for consistency
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  createdAt: Date;
  lastActivity: Date;
  isLocked: boolean;
  emailVerified: boolean;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  error?: string;
  isLocked?: boolean;
  requiresEmailVerification?: boolean;
}

/**
 * Database-backed secure user service
 * Replaces the in-memory user database with Prisma/SQLite storage
 */
class DatabaseBackedUserService {
  private initialized = false;

  /**
   * Initialize the service and database connection
   */
  async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database user service initialized');
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize database user service:', error);
      throw error;
    }
  }

  /**
   * Create a new user with hashed password
   */
  async createUser(userData: CreateUserInput): Promise<AuthResult> {
    try {
      // Validate and sanitize inputs
      const cleanUsername = InputSanitizer.sanitizeUsername(userData.username);
      const cleanEmail = InputSanitizer.sanitizeEmail(userData.email);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            { username: cleanUsername }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === cleanEmail) {
          return { success: false, error: 'Email already exists' };
        }
        if (existingUser.username === cleanUsername) {
          return { success: false, error: 'Username already exists' };
        }
      }

      // Validate password strength
      const passwordValidation = SecurityUtils.isSecurePassword(userData.password);
      if (!passwordValidation.isValid) {
        return { 
          success: false, 
          error: `Password requirements not met: ${passwordValidation.errors.join(', ')}` 
        };
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(userData.password);

      // Create user in database
      const newUser = await prisma.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          role: userData.role || 'basic',
          isActive: true,
          emailVerified: false
        }
      });

      // Create default portfolio
      await prisma.portfolio.create({
        data: {
          userId: newUser.id
        }
      });

      console.log(`✅ User created: ${newUser.username} (${newUser.email})`);

      return { 
        success: true, 
        user: this.sanitizeUser(newUser),
        requiresEmailVerification: !newUser.emailVerified
      };

    } catch (error: any) {
      console.error('❌ User creation failed:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  /**
   * Authenticate user with username/email and password
   */
  async authenticateUser(identifier: string, password: string): Promise<AuthResult> {
    try {
      // Sanitize input
      const cleanIdentifier = InputSanitizer.sanitizeString(identifier);

      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanIdentifier.toLowerCase() },
            { username: cleanIdentifier.toLowerCase() }
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
          error: 'Account is locked due to too many failed login attempts. Please contact support.',
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
        user: this.sanitizeUser(user),
        requiresEmailVerification: !user.emailVerified
      };

    } catch (error: any) {
      console.error('❌ Authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      return user ? this.mapPrismaUser(user) : null;
    } catch (error) {
      console.error('❌ Get user by ID failed:', error);
      return null;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const cleanUsername = InputSanitizer.sanitizeUsername(username);
      
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername }
      });

      return user ? this.mapPrismaUser(user) : null;
    } catch (error) {
      console.error('❌ Get user by username failed:', error);
      return null;
    }
  }

  /**
   * Update user activity
   */
  async updateUserActivity(userId: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActivity: new Date() }
      });
      return true;
    } catch (error) {
      console.error('❌ Update user activity failed:', error);
      return false;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => this.sanitizeUser(user));
    } catch (error) {
      console.error('❌ Get all users failed:', error);
      return [];
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { role: newRole }
      });

      console.log(`✅ User role updated: ${userId} -> ${newRole}`);
      return true;
    } catch (error) {
      console.error('❌ Update user role failed:', error);
      return false;
    }
  }

  /**
   * Lock/unlock user account
   */
  async setUserLockStatus(userId: string, isLocked: boolean): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          isLocked,
          failedLoginAttempts: isLocked ? 0 : undefined // Reset failed attempts when unlocking
        }
      });

      console.log(`✅ User lock status updated: ${userId} -> ${isLocked ? 'locked' : 'unlocked'}`);
      return true;
    } catch (error) {
      console.error('❌ Update user lock status failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      const [
        totalUsers,
        activeUsers,
        lockedUsers,
        adminUsers
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isLocked: true } }),
        prisma.user.count({ where: { role: 'admin' } })
      ]);

      return {
        totalUsers,
        activeUsers,
        lockedUsers,
        adminUsers,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Get stats failed:', error);
      return null;
    }
  }

  /**
   * Private helper: Increment failed login attempts and lock if necessary
   */
  private async incrementFailedLoginAttempts(userId: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error('❌ Failed to increment login attempts:', error);
    }
  }

  /**
   * Private helper: Reset failed login attempts
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lastFailedLogin: null
        }
      });
    } catch (error) {
      console.error('❌ Failed to reset login attempts:', error);
    }
  }

  /**
   * Private helper: Map Prisma user to our User interface
   */
  private mapPrismaUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      username: prismaUser.username,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      role: prismaUser.role,
      isActive: prismaUser.isActive,
      failedLoginAttempts: prismaUser.failedLoginAttempts,
      lastFailedLogin: prismaUser.lastFailedLogin,
      createdAt: prismaUser.createdAt,
      lastActivity: prismaUser.lastActivity,
      isLocked: prismaUser.isLocked,
      emailVerified: prismaUser.emailVerified
    };
  }

  /**
   * Private helper: Remove sensitive data from user object
   */
  private sanitizeUser(user: PrismaUser): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = this.mapPrismaUser(user);
    return sanitizedUser;
  }
}

// Export singleton instance
export const databaseUserService = new DatabaseBackedUserService();
export default databaseUserService;