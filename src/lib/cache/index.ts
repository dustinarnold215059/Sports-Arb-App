/**
 * Cache Services Index
 * Centralized cache service exports and initialization
 */

export { redisCache } from './redisClient';
export { sessionService } from './sessionService';
export { apiCache } from './apiCache';

// Re-export types
export type { CacheOptions, CacheStats } from './redisClient';
export type { SessionData, SessionOptions } from './sessionService';
export type { CacheEntry, CacheMetrics } from './apiCache';

import { redisCache } from './redisClient';
import { sessionService } from './sessionService';
import { apiCache } from './apiCache';

/**
 * Initialize all cache services
 */
export async function initializeCacheServices(): Promise<void> {
  try {
    console.log('🔄 Initializing cache services...');

    // Initialize Redis connection
    await redisCache.initialize();

    // Services will automatically use Redis if available
    console.log('✅ Cache services initialized');

    // Start cleanup tasks
    startCleanupTasks();

  } catch (error) {
    console.error('❌ Cache services initialization failed:', error);
    // Continue without caching - services will use fallbacks
  }
}

/**
 * Start background cleanup tasks
 */
function startCleanupTasks(): void {
  // Clean up expired sessions every hour
  setInterval(async () => {
    try {
      await sessionService.cleanupExpiredSessions();
    } catch (error) {
      console.error('❌ Session cleanup task failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Clean up expired cache entries every 30 minutes
  setInterval(async () => {
    try {
      await apiCache.cleanupExpired();
    } catch (error) {
      console.error('❌ Cache cleanup task failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * Get comprehensive cache statistics
 */
export async function getCacheStats(): Promise<any> {
  try {
    const [
      redisStats,
      sessionStats,
      apiCacheMetrics
    ] = await Promise.all([
      redisCache.getStats(),
      sessionService.getSessionStats(),
      apiCache.getMetrics()
    ]);

    return {
      redis: redisStats,
      sessions: sessionStats,
      apiCache: apiCacheMetrics,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Get cache stats failed:', error);
    return null;
  }
}

/**
 * Health check for cache services
 */
export async function cacheHealthCheck(): Promise<{
  healthy: boolean;
  services: {
    redis: boolean;
    sessions: boolean;
    apiCache: boolean;
  };
  details?: any;
}> {
  try {
    const redisHealthy = redisCache.isAvailable();
    
    // Test session service
    const testSessionData = {
      userId: 'health-check',
      username: 'health-check',
      role: 'test',
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    const sessionTest = await sessionService.createSession(
      `health-check-${Date.now()}`, 
      testSessionData, 
      { ttl: 60 }
    );

    // Test API cache
    const apiCacheTest = await apiCache.set('health-check', { test: true }, 60);

    const services = {
      redis: redisHealthy,
      sessions: sessionTest,
      apiCache: apiCacheTest
    };

    const healthy = Object.values(services).every(Boolean);

    return {
      healthy,
      services,
      details: {
        redisConnected: redisHealthy,
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('❌ Cache health check failed:', error);
    return {
      healthy: false,
      services: {
        redis: false,
        sessions: false,
        apiCache: false
      },
      details: { error: error.message }
    };
  }
}

/**
 * Gracefully shutdown cache services
 */
export async function shutdownCacheServices(): Promise<void> {
  try {
    console.log('🔄 Shutting down cache services...');
    
    await redisCache.disconnect();
    
    console.log('✅ Cache services shutdown complete');
  } catch (error) {
    console.error('❌ Cache services shutdown failed:', error);
  }
}