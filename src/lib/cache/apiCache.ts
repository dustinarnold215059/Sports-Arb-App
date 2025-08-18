import { redisCache } from './redisClient';
import { prisma } from '@/lib/database';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRatio: number;
  totalKeys: number;
  memoryUsage: string;
}

/**
 * API caching service for sports odds and other external API data
 * Uses Redis for fast access with database fallback
 */
class ApiCacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly API_PREFIX = 'api_cache';
  private metrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  /**
   * Get cached data or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    this.metrics.totalRequests++;

    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      
      if (cached !== null) {
        this.metrics.hits++;
        console.log(`🎯 Cache hit: ${key}`);
        return cached;
      }

      // Cache miss - fetch fresh data
      this.metrics.misses++;
      console.log(`⚡ Cache miss: ${key} - fetching fresh data`);
      
      const data = await fetchFunction();
      
      // Store in cache
      await this.set(key, data, ttl);
      
      return data;

    } catch (error) {
      console.error('❌ Cache getOrSet failed:', error);
      // If caching fails, still try to fetch the data
      return await fetchFunction();
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: new Date(),
        ttl,
        key
      };

      // Store in Redis
      const redisStored = await redisCache.set(
        key, 
        cacheEntry, 
        { 
          prefix: this.API_PREFIX, 
          ttl 
        }
      );

      // Also store in database for persistence (async, non-blocking)
      this.storeInDatabase(key, data, ttl).catch(error => {
        console.warn('⚠️ Failed to store cache in database:', error);
      });

      return redisStored;

    } catch (error) {
      console.error('❌ Cache set failed:', error);
      return false;
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      const cached = await redisCache.get<CacheEntry<T>>(
        key, 
        { prefix: this.API_PREFIX }
      );

      if (cached) {
        return cached.data;
      }

      // Fallback to database
      const dbCached = await prisma.apiCache.findUnique({
        where: { key }
      });

      if (dbCached && dbCached.expiresAt > new Date()) {
        const cacheEntry: CacheEntry<T> = {
          data: dbCached.data as T,
          timestamp: dbCached.createdAt,
          ttl: Math.floor((dbCached.expiresAt.getTime() - Date.now()) / 1000),
          key
        };

        // Restore to Redis
        await redisCache.set(
          key, 
          cacheEntry, 
          { 
            prefix: this.API_PREFIX, 
            ttl: cacheEntry.ttl 
          }
        );

        return cacheEntry.data;
      }

      return null;

    } catch (error) {
      console.error('❌ Cache get failed:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Remove from Redis
      await redisCache.delete(key, { prefix: this.API_PREFIX });

      // Remove from database
      await prisma.apiCache.deleteMany({
        where: { key }
      });

      return true;

    } catch (error) {
      console.error('❌ Cache delete failed:', error);
      return false;
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<boolean> {
    try {
      // Clear Redis cache
      await redisCache.clear();

      // Clear database cache
      await prisma.apiCache.deleteMany({});

      console.log('🧹 All cache data cleared');
      return true;

    } catch (error) {
      console.error('❌ Cache clear failed:', error);
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      // Database cleanup (Redis handles TTL automatically)
      const result = await prisma.apiCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired cache entries`);
      }

      return result.count;

    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    try {
      const redisStats = await redisCache.getStats();
      const dbStats = await prisma.apiCache.count();

      const hitRatio = this.metrics.totalRequests > 0 
        ? (this.metrics.hits / this.metrics.totalRequests) * 100 
        : 0;

      return {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        totalRequests: this.metrics.totalRequests,
        hitRatio: Math.round(hitRatio * 100) / 100,
        totalKeys: redisStats?.keys || dbStats,
        memoryUsage: redisStats?.memory || 'unknown'
      };

    } catch (error) {
      console.error('❌ Get cache metrics failed:', error);
      return {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        totalRequests: this.metrics.totalRequests,
        hitRatio: 0,
        totalKeys: 0,
        memoryUsage: 'unknown'
      };
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
    console.log('📊 Cache metrics reset');
  }

  /**
   * Get cache keys by pattern
   */
  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      // For Redis, we'd need to implement key scanning
      // For now, get from database
      const entries = await prisma.apiCache.findMany({
        where: {
          key: { contains: pattern === '*' ? '' : pattern },
          expiresAt: { gt: new Date() }
        },
        select: { key: true }
      });

      return entries.map(entry => entry.key);

    } catch (error) {
      console.error('❌ Get cache keys failed:', error);
      return [];
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      return await Promise.all(
        keys.map(key => this.get<T>(key))
      );
    } catch (error) {
      console.error('❌ Batch get failed:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const data = await this.get(key);
      return data !== null;
    } catch (error) {
      console.error('❌ Cache exists check failed:', error);
      return false;
    }
  }

  /**
   * Private helper: Store in database
   */
  private async storeInDatabase<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await prisma.apiCache.upsert({
        where: { key },
        update: {
          data: data as any,
          expiresAt
        },
        create: {
          key,
          data: data as any,
          expiresAt
        }
      });
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Specialized methods for different data types
   */

  // Sports odds caching
  async cacheOdds(sport: string, data: any, ttl: number = 300): Promise<boolean> {
    return this.set(`odds:${sport}`, data, ttl);
  }

  async getOdds(sport: string): Promise<any | null> {
    return this.get(`odds:${sport}`);
  }

  // User-specific data caching
  async cacheUserData(userId: string, dataType: string, data: any, ttl: number = 600): Promise<boolean> {
    return this.set(`user:${userId}:${dataType}`, data, ttl);
  }

  async getUserData<T>(userId: string, dataType: string): Promise<T | null> {
    return this.get<T>(`user:${userId}:${dataType}`);
  }

  // API response caching
  async cacheApiResponse(endpoint: string, params: string, data: any, ttl: number = 300): Promise<boolean> {
    const key = `api:${endpoint}:${Buffer.from(params).toString('base64')}`;
    return this.set(key, data, ttl);
  }

  async getApiResponse<T>(endpoint: string, params: string): Promise<T | null> {
    const key = `api:${endpoint}:${Buffer.from(params).toString('base64')}`;
    return this.get<T>(key);
  }
}

// Export singleton instance
export const apiCache = new ApiCacheService();
export default apiCache;