/**
 * Database Services Index
 * Centralized database service exports
 */

export { DatabaseUserService } from './userService';
export { DatabaseMigrationService } from './migrationService';

// Re-export Prisma client for direct access when needed
export { PrismaClient } from '@prisma/client';

// Database connection with pooling
import { PrismaClient } from '@prisma/client';
import { dbPool } from './connectionPool';
import { EnvManager } from '@/lib/security/env';

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Ensure single instance of Prisma Client for backwards compatibility
if (typeof window === 'undefined') {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
      log: ['error'],
    });
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    prisma = global.__prisma;
  }
}

export { prisma, dbPool };

/**
 * Initialize database connection with pooling
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (typeof window !== 'undefined') return; // Skip on client side
    
    // Initialize connection pool for better performance
    await dbPool.initialize();
    console.log('✅ Database connection pool initialized');
    
    // Fallback single connection for compatibility
    await prisma.$connect();
    console.log('✅ Database initialized successfully');
    
    // Run health check using the pool
    await dbPool.withConnection(async (client) => {
      await client.$queryRaw`SELECT 1`;
    });
    console.log('✅ Database health check passed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database and shutdown pool
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    if (typeof window !== 'undefined') return; // Skip on client side
    
    // Shutdown connection pool
    await dbPool.shutdown();
    console.log('✅ Database connection pool shutdown');
    
    // Disconnect single connection
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

/**
 * Get database performance statistics
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    const poolStats = dbPool.getStats();
    const poolHealth = await dbPool.healthCheck();
    
    return {
      pool: poolStats,
      health: poolHealth,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Get database stats failed:', error);
    return null;
  }
}

/**
 * Execute database operation with connection pooling
 */
export async function withDatabase<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  return dbPool.withConnection(operation);
}

/**
 * Execute database transaction with connection pooling
 */
export async function withDatabaseTransaction<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  return dbPool.withTransaction(operation);
}