import { createClient, RedisClientType } from 'redis';
import { EnvManager } from '@/lib/security/env';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: string;
  uptime: number;
}

class RedisCache {
  private client: RedisClientType | null = null;
  private connected = false;
  private connectionAttempts = 0;
  private maxRetries = 3;

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    try {
      if (this.connected) return;

      // Check if Redis is enabled
      if (!EnvManager.isFeatureEnabled('ENABLE_REDIS_CACHE')) {
        console.log('🔄 Redis caching is disabled, using in-memory fallback');
        return;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      // Error handling
      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Connecting to Redis...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connection established');
        this.connected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis connection closed');
        this.connected = false;
      });

      // Attempt connection
      await this.client.connect();

    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Redis initialization failed (attempt ${this.connectionAttempts}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying Redis connection in 5 seconds...`);
        setTimeout(() => this.initialize(), 5000);
      } else {
        console.warn('⚠️ Redis unavailable, falling back to in-memory cache');
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackSet(key, value, options);
      }

      const serializedValue = JSON.stringify(value);
      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      
      if (options.ttl) {
        await this.client!.setEx(cacheKey, options.ttl, serializedValue);
      } else {
        await this.client!.set(cacheKey, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('❌ Redis set error:', error);
      return this.fallbackSet(key, value, options);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackGet<T>(key, options);
      }

      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      const value = await this.client!.get(cacheKey);
      
      if (value === null) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('❌ Redis get error:', error);
      return this.fallbackGet<T>(key, options);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackDelete(key, options);
      }

      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      await this.client!.del(cacheKey);
      return true;
    } catch (error) {
      console.error('❌ Redis delete error:', error);
      return this.fallbackDelete(key, options);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackExists(key, options);
      }

      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      const result = await this.client!.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis exists error:', error);
      return this.fallbackExists(key, options);
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackExpire(key, seconds, options);
      }

      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      const result = await this.client!.expire(cacheKey, seconds);
      return result;
    } catch (error) {
      console.error('❌ Redis expire error:', error);
      return this.fallbackExpire(key, seconds, options);
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackMget<T>(keys, options);
      }

      const cacheKeys = keys.map(key => 
        options.prefix ? `${options.prefix}:${key}` : key
      );
      
      const values = await this.client!.mGet(cacheKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('❌ Redis mget error:', error);
      return this.fallbackMget<T>(keys, options);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats | null> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackStats();
      }

      const info = await this.client!.info('memory');
      const dbSize = await this.client!.dbSize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        hits: 0, // Would need to track separately
        misses: 0, // Would need to track separately
        keys: dbSize,
        memory,
        uptime: 0 // Would need to track separately
      };
    } catch (error) {
      console.error('❌ Redis stats error:', error);
      return this.fallbackStats();
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return this.fallbackClear();
      }

      await this.client!.flushDb();
      return true;
    } catch (error) {
      console.error('❌ Redis clear error:', error);
      return this.fallbackClear();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      this.stopCleanupTimer();
      
      if (this.client && this.connected) {
        await this.client.disconnect();
        console.log('✅ Redis disconnected');
      }
    } catch (error) {
      console.error('❌ Redis disconnect error:', error);
    }
  }

  // Fallback methods for when Redis is unavailable
  private fallbackCache = new Map<string, { value: any; expires?: number; lastAccess: number }>();
  private readonly MAX_FALLBACK_ENTRIES = 1000; // Prevent memory leaks
  private readonly FALLBACK_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer?: NodeJS.Timeout;
  private fallbackStats = { hits: 0, misses: 0, evictions: 0 };

  private fallbackSet(key: string, value: any, options: CacheOptions = {}): boolean {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    const expires = options.ttl ? Date.now() + (options.ttl * 1000) : undefined;
    const now = Date.now();
    
    // Check if we need to evict entries
    if (this.fallbackCache.size >= this.MAX_FALLBACK_ENTRIES) {
      this.evictLRUEntries();
    }
    
    this.fallbackCache.set(cacheKey, { value, expires, lastAccess: now });
    this.startCleanupTimer();
    return true;
  }

  private fallbackGet<T>(key: string, options: CacheOptions = {}): T | null {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    const cached = this.fallbackCache.get(cacheKey);
    
    if (!cached) {
      this.fallbackStats.misses++;
      return null;
    }
    
    if (cached.expires && Date.now() > cached.expires) {
      this.fallbackCache.delete(cacheKey);
      this.fallbackStats.misses++;
      return null;
    }
    
    // Update last access time for LRU
    cached.lastAccess = Date.now();
    this.fallbackCache.set(cacheKey, cached);
    this.fallbackStats.hits++;
    
    return cached.value as T;
  }

  private fallbackDelete(key: string, options: CacheOptions = {}): boolean {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    return this.fallbackCache.delete(cacheKey);
  }

  private fallbackExists(key: string, options: CacheOptions = {}): boolean {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    const cached = this.fallbackCache.get(cacheKey);
    
    if (!cached) return false;
    
    if (cached.expires && Date.now() > cached.expires) {
      this.fallbackCache.delete(cacheKey);
      return false;
    }
    
    // Update last access time
    cached.lastAccess = Date.now();
    this.fallbackCache.set(cacheKey, cached);
    
    return true;
  }

  private fallbackExpire(key: string, seconds: number, options: CacheOptions = {}): boolean {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
    const cached = this.fallbackCache.get(cacheKey);
    
    if (!cached) return false;
    
    cached.expires = Date.now() + (seconds * 1000);
    cached.lastAccess = Date.now();
    this.fallbackCache.set(cacheKey, cached);
    return true;
  }

  private fallbackMget<T>(keys: string[], options: CacheOptions = {}): (T | null)[] {
    return keys.map(key => this.fallbackGet<T>(key, options));
  }

  private fallbackStats(): CacheStats {
    return {
      hits: this.fallbackStats.hits,
      misses: this.fallbackStats.misses,
      keys: this.fallbackCache.size,
      memory: `in-memory (~${Math.round(this.fallbackCache.size * 0.5)}KB)`,
      uptime: 0
    };
  }

  private fallbackClear(): boolean {
    this.fallbackCache.clear();
    this.fallbackStats = { hits: 0, misses: 0, evictions: 0 };
    this.stopCleanupTimer();
    return true;
  }
  
  /**
   * Evict least recently used entries when cache is full
   */
  private evictLRUEntries(): void {
    if (this.fallbackCache.size <= this.MAX_FALLBACK_ENTRIES * 0.8) return;
    
    // Convert to array and sort by lastAccess
    const entries = Array.from(this.fallbackCache.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(this.MAX_FALLBACK_ENTRIES * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.fallbackCache.delete(entries[i][0]);
      this.fallbackStats.evictions++;
    }
    
    console.log(`🧹 Evicted ${toRemove} LRU entries from fallback cache`);
  }
  
  /**
   * Clean up expired entries from fallback cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.fallbackCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired entries from fallback cache`);
    }
  }
  
  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
      
      // Also check for memory pressure
      if (this.fallbackCache.size > this.MAX_FALLBACK_ENTRIES * 0.9) {
        this.evictLRUEntries();
      }
    }, this.FALLBACK_CLEANUP_INTERVAL);
  }
  
  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();
export default redisCache;