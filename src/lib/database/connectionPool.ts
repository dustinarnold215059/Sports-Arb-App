import { PrismaClient } from '@prisma/client';
import { EnvManager } from '@/lib/security/env';

export interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalQueries: number;
  averageQueryTime: number;
  errors: number;
}

/**
 * Database connection pool manager using Prisma Client
 * Optimizes database connections for better performance
 */
class DatabaseConnectionPool {
  private clients: PrismaClient[] = [];
  private activeClients = new Set<PrismaClient>();
  private availableClients: PrismaClient[] = [];
  private pendingRequests: Array<{
    resolve: (client: PrismaClient) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private config: PoolConfig;
  private stats = {
    totalQueries: 0,
    totalQueryTime: 0,
    errors: 0
  };
  
  private initialized = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.config = {
      maxConnections: EnvManager.isDevelopment() ? 5 : 20,
      minConnections: EnvManager.isDevelopment() ? 1 : 5,
      acquireTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 60000 // 1 minute
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing database connection pool...');
      
      // Create minimum number of connections
      for (let i = 0; i < this.config.minConnections; i++) {
        const client = await this.createClient();
        this.clients.push(client);
        this.availableClients.push(client);
      }

      // Start cleanup process
      this.startCleanupProcess();

      this.initialized = true;
      console.log(`✅ Connection pool initialized with ${this.config.minConnections} connections`);

    } catch (error) {
      console.error('❌ Connection pool initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get a database client from the pool
   */
  async acquire(): Promise<PrismaClient> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      // Try to get an available client immediately
      const client = this.getAvailableClient();
      if (client) {
        this.activeClients.add(client);
        resolve(client);
        return;
      }

      // Check if we can create a new client
      if (this.clients.length < this.config.maxConnections) {
        this.createClient()
          .then(newClient => {
            this.clients.push(newClient);
            this.activeClients.add(newClient);
            resolve(newClient);
          })
          .catch(reject);
        return;
      }

      // Add to pending queue
      const timeout = setTimeout(() => {
        const index = this.pendingRequests.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
          reject(new Error('Connection acquire timeout'));
        }
      }, this.config.acquireTimeoutMillis);

      this.pendingRequests.push({
        resolve: (client: PrismaClient) => {
          clearTimeout(timeout);
          resolve(client);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: Date.now()
      });
    });
  }

  /**
   * Release a client back to the pool
   */
  release(client: PrismaClient): void {
    this.activeClients.delete(client);

    // Check if there are pending requests
    const pendingRequest = this.pendingRequests.shift();
    if (pendingRequest) {
      this.activeClients.add(client);
      pendingRequest.resolve(client);
      return;
    }

    // Return to available pool
    this.availableClients.push(client);
  }

  /**
   * Execute a query with automatic connection management
   */
  async withConnection<T>(
    operation: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let client: PrismaClient | null = null;

    try {
      client = await this.acquire();
      const result = await operation(client);
      
      // Update stats
      this.stats.totalQueries++;
      this.stats.totalQueryTime += Date.now() - startTime;
      
      return result;

    } catch (error) {
      this.stats.errors++;
      console.error('❌ Database operation failed:', error);
      throw error;
    } finally {
      if (client) {
        this.release(client);
      }
    }
  }

  /**
   * Execute a transaction with automatic connection management
   */
  async withTransaction<T>(
    operation: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = await this.acquire();

    try {
      const result = await client.$transaction(async (tx) => {
        return await operation(tx as PrismaClient);
      });

      this.stats.totalQueries++;
      return result;

    } catch (error) {
      this.stats.errors++;
      console.error('❌ Database transaction failed:', error);
      throw error;
    } finally {
      this.release(client);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const averageQueryTime = this.stats.totalQueries > 0 
      ? this.stats.totalQueryTime / this.stats.totalQueries 
      : 0;

    return {
      totalConnections: this.clients.length,
      activeConnections: this.activeClients.size,
      idleConnections: this.availableClients.length,
      pendingRequests: this.pendingRequests.length,
      totalQueries: this.stats.totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      errors: this.stats.errors
    };
  }

  /**
   * Health check for the pool
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    stats: PoolStats;
    details?: any;
  }> {
    try {
      const stats = this.getStats();
      
      // Test a simple query
      await this.withConnection(async (client) => {
        await client.$queryRaw`SELECT 1`;
      });

      const healthy = stats.totalConnections > 0 && stats.errors < stats.totalQueries * 0.1;

      return {
        healthy,
        stats,
        details: {
          poolSize: this.clients.length,
          maxConnections: this.config.maxConnections,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        healthy: false,
        stats: this.getStats(),
        details: { error: error.message }
      };
    }
  }

  /**
   * Resize the pool
   */
  async resize(minConnections: number, maxConnections: number): Promise<void> {
    console.log(`🔧 Resizing connection pool: ${minConnections}-${maxConnections}`);
    
    this.config.minConnections = minConnections;
    this.config.maxConnections = maxConnections;

    // Add connections if needed
    while (this.clients.length < minConnections) {
      const client = await this.createClient();
      this.clients.push(client);
      this.availableClients.push(client);
    }

    // Remove excess connections if needed
    while (this.clients.length > maxConnections && this.availableClients.length > 0) {
      const client = this.availableClients.pop();
      if (client) {
        await this.destroyClient(client);
        const index = this.clients.indexOf(client);
        if (index !== -1) {
          this.clients.splice(index, 1);
        }
      }
    }

    console.log(`✅ Pool resized to ${this.clients.length} connections`);
  }

  /**
   * Close all connections and shutdown the pool
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down connection pool...');

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Reject pending requests
      for (const request of this.pendingRequests) {
        request.reject(new Error('Pool is shutting down'));
      }
      this.pendingRequests.length = 0;

      // Close all connections
      for (const client of this.clients) {
        await this.destroyClient(client);
      }

      this.clients.length = 0;
      this.availableClients.length = 0;
      this.activeClients.clear();
      this.initialized = false;

      console.log('✅ Connection pool shutdown complete');

    } catch (error) {
      console.error('❌ Connection pool shutdown failed:', error);
    }
  }

  /**
   * Private helper: Get an available client
   */
  private getAvailableClient(): PrismaClient | null {
    return this.availableClients.pop() || null;
  }

  /**
   * Private helper: Create a new client
   */
  private async createClient(): Promise<PrismaClient> {
    const client = new PrismaClient({
      datasourceUrl: EnvManager.getDatabaseURL(),
      log: EnvManager.isDevelopment() ? ['error'] : ['error'],
      errorFormat: 'minimal'
    });

    await client.$connect();
    return client;
  }

  /**
   * Private helper: Destroy a client
   */
  private async destroyClient(client: PrismaClient): Promise<void> {
    try {
      await client.$disconnect();
    } catch (error) {
      console.warn('⚠️ Error disconnecting client:', error);
    }
  }

  /**
   * Private helper: Start cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.reapIntervalMillis);
  }

  /**
   * Private helper: Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    
    // Don't cleanup if we're at minimum connections
    if (this.clients.length <= this.config.minConnections) {
      return;
    }

    // Remove idle connections that exceed the minimum
    const excessConnections = this.clients.length - this.config.minConnections;
    const connectionsToRemove = Math.min(excessConnections, this.availableClients.length);

    for (let i = 0; i < connectionsToRemove; i++) {
      const client = this.availableClients.pop();
      if (client) {
        this.destroyClient(client);
        const index = this.clients.indexOf(client);
        if (index !== -1) {
          this.clients.splice(index, 1);
        }
      }
    }

    if (connectionsToRemove > 0) {
      console.log(`🧹 Cleaned up ${connectionsToRemove} idle connections`);
    }
  }
}

// Export singleton instance
export const dbPool = new DatabaseConnectionPool();
export default dbPool;