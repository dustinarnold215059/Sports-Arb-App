/**
 * Request Deduplication and Performance Optimization System
 * Prevents duplicate API calls and optimizes data fetching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  requestPromise?: Promise<T>;
}

interface RequestOptions {
  cacheKey?: string;
  ttl?: number; // Time to live in milliseconds
  deduplicationWindow?: number; // Milliseconds to deduplicate requests
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class RequestDeduplicationManager {
  private static instance: RequestDeduplicationManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly defaultDeduplicationWindow = 30 * 1000; // 30 seconds
  private readonly maxCacheSize = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): RequestDeduplicationManager {
    if (!RequestDeduplicationManager.instance) {
      RequestDeduplicationManager.instance = new RequestDeduplicationManager();
    }
    return RequestDeduplicationManager.instance;
  }

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });

    // Enforce max cache size
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      
      const entriesToRemove = sortedEntries.slice(0, this.cache.size - this.maxCacheSize);
      entriesToRemove.forEach(([key]) => {
        this.cache.delete(key);
        this.pendingRequests.delete(key);
      });
    }

    console.log(`🧹 Cache cleanup: ${keysToDelete.length} expired entries removed, ${this.cache.size} entries remaining`);
  }

  private generateCacheKey(url: string, options?: any): string {
    const optionsString = options ? JSON.stringify(options) : '';
    return `${url}:${optionsString}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async deduplicatedFetch<T>(
    url: string, 
    fetchOptions?: RequestInit,
    requestOptions?: RequestOptions
  ): Promise<T> {
    const {
      cacheKey,
      ttl = this.defaultTTL,
      deduplicationWindow = this.defaultDeduplicationWindow,
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000
    } = requestOptions || {};

    const key = cacheKey || this.generateCacheKey(url, fetchOptions);
    const now = Date.now();

    // Check cache first
    const cachedEntry = this.cache.get(key);
    if (cachedEntry && now < cachedEntry.expiry) {
      console.log(`📦 Cache hit for: ${key.substring(0, 100)}...`);
      return cachedEntry.data;
    }

    // Check for pending request (deduplication)
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      console.log(`🔄 Deduplicating request: ${key.substring(0, 100)}...`);
      return pendingRequest;
    }

    // Create new request with retry logic
    const requestPromise = this.executeWithRetry(
      url,
      fetchOptions,
      { maxRetries, retryDelay, timeout }
    );

    // Store the pending request for deduplication
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the successful result
      this.cache.set(key, {
        data: result,
        timestamp: now,
        expiry: now + ttl
      });

      // Update success metrics
      this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
      this.errorCounts.delete(key); // Reset error count on success

      console.log(`✅ Request completed and cached: ${key.substring(0, 100)}...`);
      return result;

    } catch (error) {
      // Update error metrics
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
      
      // If we have a stale cache entry, return it as fallback
      if (cachedEntry) {
        console.log(`🚨 Using stale cache due to error: ${key.substring(0, 100)}...`);
        return cachedEntry.data;
      }
      
      throw error;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  private async executeWithRetry<T>(
    url: string,
    fetchOptions?: RequestInit,
    retryOptions?: { maxRetries: number; retryDelay: number; timeout: number }
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = retryOptions || {};
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Attempt ${attempt}/${maxRetries}: ${url.substring(0, 100)}...`);
        
        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
          }
          
          // Don't retry client errors (4xx)
          if (error.message.includes('HTTP 4')) {
            throw error;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  // Batch request optimization
  async batchRequests<T>(
    requests: Array<{
      url: string;
      options?: RequestInit;
      requestOptions?: RequestOptions;
    }>,
    concurrency: number = 5
  ): Promise<Array<{ result?: T; error?: Error; url: string }>> {
    const results: Array<{ result?: T; error?: Error; url: string }> = [];
    
    // Process requests in batches to control concurrency
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (request) => {
        try {
          const result = await this.deduplicatedFetch<T>(
            request.url,
            request.options,
            request.requestOptions
          );
          return { result, url: request.url };
        } catch (error) {
          return { error: error as Error, url: request.url };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful to APIs
      if (i + concurrency < requests.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  // Preemptive cache warming
  async warmCache(
    urls: string[],
    options?: RequestInit,
    requestOptions?: RequestOptions
  ): Promise<void> {
    console.log(`🔥 Warming cache for ${urls.length} URLs...`);
    
    const requests = urls.map(url => ({ url, options, requestOptions }));
    
    // Warm cache with lower concurrency to avoid overwhelming APIs
    await this.batchRequests(requests, 3);
    
    console.log(`✅ Cache warming completed`);
  }

  // Cache management methods
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.pendingRequests.clear();
      console.log('🗑️ All cache cleared');
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });

    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
  }

  getCacheStats(): {
    size: number;
    hitRate: number;
    errorRate: number;
    topKeys: Array<{ key: string; requests: number; errors: number }>;
  } {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const topKeys = Array.from(this.requestCounts.entries())
      .map(([key, requests]) => ({
        key: key.substring(0, 50) + '...',
        requests,
        errors: this.errorCounts.get(key) || 0
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? ((this.cache.size / totalRequests) * 100) : 0,
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100) : 0,
      topKeys
    };
  }

  // Memory pressure handling
  handleMemoryPressure(): void {
    const targetSize = Math.floor(this.maxCacheSize * 0.5);
    
    if (this.cache.size <= targetSize) return;

    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toRemove = entries.slice(0, this.cache.size - targetSize);
    toRemove.forEach(([key]) => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });

    console.log(`🧠 Memory pressure: Removed ${toRemove.length} cache entries`);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    this.pendingRequests.clear();
    this.requestCounts.clear();
    this.errorCounts.clear();
  }
}

// Specialized API request wrapper for sports betting data
export class OptimizedOddsAPI {
  private deduplicationManager: RequestDeduplicationManager;
  private rateLimiter: Map<string, number[]> = new Map();
  private readonly maxRequestsPerMinute = 10; // Conservative rate limiting

  constructor() {
    this.deduplicationManager = RequestDeduplicationManager.getInstance();
  }

  private checkRateLimit(apiKey: string): boolean {
    const now = Date.now();
    const requests = this.rateLimiter.get(apiKey) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(timestamp => now - timestamp < 60000);
    this.rateLimiter.set(apiKey, recentRequests);
    
    return recentRequests.length < this.maxRequestsPerMinute;
  }

  private recordRequest(apiKey: string): void {
    const requests = this.rateLimiter.get(apiKey) || [];
    requests.push(Date.now());
    this.rateLimiter.set(apiKey, requests);
  }

  async fetchOddsOptimized(
    sport: string,
    apiKey: string,
    options?: {
      regions?: string;
      markets?: string;
      bookmakers?: string;
      cacheTTL?: number;
    }
  ): Promise<any> {
    // Rate limiting check
    if (!this.checkRateLimit(apiKey)) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const {
      regions = 'us',
      markets = 'h2h,spreads,totals',
      bookmakers = 'draftkings,betmgm,fanduel,caesars',
      cacheTTL = 2 * 60 * 1000 // 2 minutes for odds data
    } = options || {};

    const url = new URL('https://api.the-odds-api.com/v4/sports/' + sport + '/odds/');
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', regions);
    url.searchParams.append('markets', markets);
    url.searchParams.append('bookmakers', bookmakers);
    url.searchParams.append('oddsFormat', 'american');

    try {
      this.recordRequest(apiKey);
      
      const result = await this.deduplicationManager.deduplicatedFetch(
        url.toString(),
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Sports-Betting-Arbitrage/1.0'
          }
        },
        {
          cacheKey: `odds:${sport}:${regions}:${markets}:${bookmakers}`,
          ttl: cacheTTL,
          deduplicationWindow: 30000, // 30 seconds
          maxRetries: 2,
          retryDelay: 2000,
          timeout: 15000
        }
      );

      return result;
    } catch (error) {
      console.error(`Failed to fetch odds for ${sport}:`, error);
      throw error;
    }
  }

  async fetchMultipleSports(
    sports: string[],
    apiKey: string,
    options?: any
  ): Promise<Array<{ sport: string; data?: any; error?: Error }>> {
    const requests = sports.map(sport => ({
      url: '', // Will be built in fetchOddsOptimized
      sport,
      apiKey,
      options
    }));

    const results: Array<{ sport: string; data?: any; error?: Error }> = [];

    // Process with controlled concurrency to respect rate limits
    for (const request of requests) {
      try {
        const data = await this.fetchOddsOptimized(request.sport, request.apiKey, request.options);
        results.push({ sport: request.sport, data });
      } catch (error) {
        results.push({ sport: request.sport, error: error as Error });
      }

      // Rate limiting delay between requests
      await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds between requests
    }

    return results;
  }

  getCacheStats() {
    return this.deduplicationManager.getCacheStats();
  }

  invalidateOddsCache(sport?: string) {
    const pattern = sport ? `odds:${sport}` : 'odds:';
    this.deduplicationManager.invalidateCache(pattern);
  }
}

// Export singleton instances
export const requestDeduplicationManager = RequestDeduplicationManager.getInstance();
export const optimizedOddsAPI = new OptimizedOddsAPI();

// Utility functions
export function createCacheKey(base: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {} as Record<string, any>);
  
  return `${base}:${JSON.stringify(sortedParams)}`;
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    
    // Keep only the last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    this.metrics.set(name, values);
  }

  getMetricStats(name: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }
    
    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    requestDeduplicationManager.destroy();
  });

  // Handle memory pressure
  if ('memory' in performance) {
    setInterval(() => {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
        requestDeduplicationManager.handleMemoryPressure();
      }
    }, 30000);
  }
}