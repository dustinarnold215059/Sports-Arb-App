import { createClient } from 'redis';

declare global {
  var redis: ReturnType<typeof createClient> | undefined;
}

let client: ReturnType<typeof createClient>;

if (process.env.NODE_ENV === 'production') {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
} else {
  if (!globalThis.redis) {
    globalThis.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }
  client = globalThis.redis;
}

// Connect to Redis
if (!client.isOpen) {
  client.connect().catch((err) => {
    console.error('Redis connection error:', err);
  });
}

export const redis = client;

// Helper functions for caching
export const cacheUtils = {
  async get(key: string) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  async set(key: string, data: any, expirationInSeconds = 3600) {
    try {
      await redis.setEx(key, expirationInSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },

  async del(key: string) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  },

  async exists(key: string) {
    try {
      return await redis.exists(key);
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  // Cache with fallback to database
  async getOrSet<T>(
    key: string, 
    fallbackFn: () => Promise<T>, 
    expirationInSeconds = 3600
  ): Promise<T> {
    try {
      const cached = await this.get(key);
      if (cached) {
        return cached;
      }

      const data = await fallbackFn();
      await this.set(key, data, expirationInSeconds);
      return data;
    } catch (error) {
      console.error('Redis getOrSet error:', error);
      return await fallbackFn();
    }
  }
};

export default redis;