import { PrismaClient } from '@prisma/client';
import { PasswordService } from '@/lib/security/auth';
import { userDatabase } from '@/lib/userDatabase';

const prisma = new PrismaClient();

export interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  errors: string[];
  skipped: number;
}

export class DatabaseMigrationService {
  
  /**
   * Migrate users from in-memory database to PostgreSQL
   */
  static async migrateUsersFromMemory(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedUsers: 0,
      errors: [],
      skipped: 0
    };

    try {
      console.log('🔄 Starting user migration from in-memory to PostgreSQL...');

      // Get all users from in-memory database
      const memoryUsers = userDatabase.getAllUsers();
      console.log(`📊 Found ${memoryUsers.length} users in memory database`);

      for (const memoryUser of memoryUsers) {
        try {
          // Check if user already exists in database
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: memoryUser.email },
                { username: memoryUser.username }
              ]
            }
          });

          if (existingUser) {
            console.log(`⏭️ Skipping existing user: ${memoryUser.username}`);
            result.skipped++;
            continue;
          }

          // Create user in database
          // Note: In-memory users might have plain text passwords, so we need to hash them
          let passwordHash: string;
          if (memoryUser.password && memoryUser.password.length > 50 && memoryUser.password.includes('$')) {
            // Assume already hashed
            passwordHash = memoryUser.password;
          } else {
            // Plain text password, hash it
            passwordHash = await PasswordService.hashPassword(memoryUser.password || 'ChangeMe123!');
          }

          const newUser = await prisma.user.create({
            data: {
              username: memoryUser.username,
              email: memoryUser.email,
              passwordHash,
              role: memoryUser.role || 'basic',
              isActive: true,
              emailVerified: true, // Assume existing users are verified
              createdAt: new Date(), // Use current time as we don't have original creation date
              lastActivity: new Date()
            }
          });

          // Create default portfolio
          await prisma.portfolio.create({
            data: {
              userId: newUser.id
            }
          });

          console.log(`✅ Migrated user: ${memoryUser.username}`);
          result.migratedUsers++;

        } catch (userError: any) {
          const errorMsg = `Failed to migrate user ${memoryUser.username}: ${userError.message}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      console.log(`🎉 Migration completed: ${result.migratedUsers} users migrated, ${result.skipped} skipped, ${result.errors.length} errors`);

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;

    } catch (error: any) {
      console.error('❌ Migration failed:', error);
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Seed database with default admin user and test data
   */
  static async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Seeding database...');

      // Create admin user if not exists
      const adminExists = await prisma.user.findUnique({
        where: { username: 'admin' }
      });

      if (!adminExists) {
        const adminPasswordHash = await PasswordService.hashPassword('Admin123!');
        
        const adminUser = await prisma.user.create({
          data: {
            username: 'admin',
            email: 'admin@sportsarb.com',
            passwordHash: adminPasswordHash,
            role: 'admin',
            isActive: true,
            emailVerified: true
          }
        });

        // Create admin portfolio
        await prisma.portfolio.create({
          data: {
            userId: adminUser.id
          }
        });

        console.log('✅ Admin user created');
      }

      // Create demo users if in development
      if (process.env.NODE_ENV === 'development') {
        await this.createDemoUsers();
      }

      // Seed app settings
      await this.seedAppSettings();

      console.log('🌱 Database seeding completed');

    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Create demo users for development
   */
  private static async createDemoUsers(): Promise<void> {
    const demoUsers = [
      {
        username: 'demo_basic',
        email: 'demo.basic@example.com',
        password: 'Demo123!',
        role: 'basic'
      },
      {
        username: 'demo_premium',
        email: 'demo.premium@example.com',
        password: 'Demo123!',
        role: 'premium'
      },
      {
        username: 'demo_pro',
        email: 'demo.pro@example.com',
        password: 'Demo123!',
        role: 'pro'
      }
    ];

    for (const demoUser of demoUsers) {
      try {
        const exists = await prisma.user.findUnique({
          where: { username: demoUser.username }
        });

        if (!exists) {
          const passwordHash = await PasswordService.hashPassword(demoUser.password);
          
          const user = await prisma.user.create({
            data: {
              username: demoUser.username,
              email: demoUser.email,
              passwordHash,
              role: demoUser.role,
              isActive: true,
              emailVerified: true
            }
          });

          // Create portfolio
          await prisma.portfolio.create({
            data: {
              userId: user.id
            }
          });

          console.log(`✅ Demo user created: ${demoUser.username}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create demo user ${demoUser.username}:`, error);
      }
    }
  }

  /**
   * Seed application settings
   */
  private static async seedAppSettings(): Promise<void> {
    const settings = [
      {
        key: 'app_name',
        value: 'Sports Arbitrage Pro',
        description: 'Application name',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable maintenance mode',
        isPublic: false
      },
      {
        key: 'max_api_requests_per_hour',
        value: '1000',
        description: 'Maximum API requests per hour per user',
        isPublic: false
      },
      {
        key: 'default_odds_refresh_interval',
        value: '300',
        description: 'Default odds refresh interval in seconds',
        isPublic: true
      }
    ];

    for (const setting of settings) {
      try {
        await prisma.appSettings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            description: setting.description,
            isPublic: setting.isPublic
          },
          create: setting
        });
      } catch (error) {
        console.error(`❌ Failed to seed setting ${setting.key}:`, error);
      }
    }

    console.log('✅ App settings seeded');
  }

  /**
   * Clean up old data
   */
  static async cleanupOldData(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old data...');

      // Clean expired sessions
      await prisma.userSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      // Clean old API cache entries
      await prisma.apiCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      // Clean old rate limit entries (older than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.rateLimit.deleteMany({
        where: {
          resetTime: { lt: oneDayAgo }
        }
      });

      // Clean old system metrics (keep only last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.systemMetrics.deleteMany({
        where: {
          timestamp: { lt: thirtyDaysAgo }
        }
      });

      console.log('✅ Data cleanup completed');

    } catch (error) {
      console.error('❌ Data cleanup failed:', error);
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<any> {
    try {
      const [
        userCount,
        betCount,
        sessionCount,
        cacheCount
      ] = await Promise.all([
        prisma.user.count(),
        prisma.bet.count(),
        prisma.userSession.count({ where: { isActive: true } }),
        prisma.apiCache.count()
      ]);

      return {
        users: userCount,
        bets: betCount,
        activeSessions: sessionCount,
        cacheEntries: cacheCount,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }
}

export default DatabaseMigrationService;