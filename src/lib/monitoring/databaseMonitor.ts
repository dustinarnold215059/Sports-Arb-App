import { PrismaClient } from '@prisma/client';
import { dbPool } from '@/lib/database/connectionPool';
import { prisma } from '@/lib/database';
import { EnvManager } from '@/lib/security/env';

export interface DatabaseMetrics {
  connectionPool: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
    averageQueryTime: number;
    totalQueries: number;
    errors: number;
  };
  database: {
    tableStats: Record<string, {
      count: number;
      size?: string;
    }>;
    queryPerformance: {
      slowQueries: number;
      averageResponseTime: number;
      totalQueries: number;
    };
    storage: {
      totalSize?: string;
      availableSpace?: string;
      usage?: number;
    };
  };
  health: {
    isHealthy: boolean;
    lastCheck: Date;
    uptime: number;
    issues: string[];
  };
}

export interface AlertConfig {
  slowQueryThreshold: number; // milliseconds
  connectionUsageThreshold: number; // percentage
  errorRateThreshold: number; // percentage
  diskUsageThreshold: number; // percentage
}

/**
 * Database monitoring service
 * Tracks performance, health, and alerts
 */
class DatabaseMonitor {
  private metrics: DatabaseMetrics | null = null;
  private alerts: AlertConfig;
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private queryTimes: number[] = [];
  private slowQueries = 0;
  private totalQueries = 0;

  constructor() {
    this.alerts = {
      slowQueryThreshold: 1000, // 1 second
      connectionUsageThreshold: 80, // 80%
      errorRateThreshold: 5, // 5%
      diskUsageThreshold: 85 // 85%
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoring) return;

    console.log('📊 Starting database monitoring...');
    this.monitoring = true;

    // Initial metrics collection
    this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log(`✅ Database monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return;

    console.log('📊 Stopping database monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.monitoring = false;
    console.log('✅ Database monitoring stopped');
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics | null {
    return this.metrics;
  }

  /**
   * Record query execution time
   */
  recordQueryTime(executionTime: number): void {
    this.totalQueries++;
    this.queryTimes.push(executionTime);

    // Keep only last 100 query times
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }

    // Count slow queries
    if (executionTime > this.alerts.slowQueryThreshold) {
      this.slowQueries++;
      console.warn(`⚠️ Slow query detected: ${executionTime}ms`);
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    details: any;
    issues: string[];
  }> {
    const issues: string[] = [];
    let isHealthy = true;

    try {
      // Test basic connectivity
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      if (responseTime > this.alerts.slowQueryThreshold) {
        issues.push(`Slow database response: ${responseTime}ms`);
        isHealthy = false;
      }

      // Check connection pool health
      const poolHealth = await dbPool.healthCheck();
      if (!poolHealth.healthy) {
        issues.push('Connection pool is unhealthy');
        isHealthy = false;
      }

      // Check error rates
      const poolStats = dbPool.getStats();
      if (poolStats.totalQueries > 0) {
        const errorRate = (poolStats.errors / poolStats.totalQueries) * 100;
        if (errorRate > this.alerts.errorRateThreshold) {
          issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
          isHealthy = false;
        }
      }

      // Check connection usage
      if (poolStats.totalConnections > 0) {
        const usage = (poolStats.activeConnections / poolStats.totalConnections) * 100;
        if (usage > this.alerts.connectionUsageThreshold) {
          issues.push(`High connection usage: ${usage.toFixed(2)}%`);
        }
      }

      return {
        isHealthy,
        details: {
          responseTime,
          poolHealth,
          poolStats,
          timestamp: new Date()
        },
        issues
      };

    } catch (error) {
      issues.push(`Database connectivity error: ${error.message}`);
      return {
        isHealthy: false,
        details: { error: error.message },
        issues
      };
    }
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(): Promise<any> {
    try {
      const poolStats = dbPool.getStats();
      const averageQueryTime = this.queryTimes.length > 0 
        ? this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length
        : 0;

      const insights = {
        connectionPool: {
          efficiency: poolStats.totalConnections > 0 
            ? (poolStats.activeConnections / poolStats.totalConnections) * 100 
            : 0,
          utilization: poolStats.activeConnections,
          pendingRequests: poolStats.pendingRequests,
          recommendation: this.getPoolRecommendation(poolStats)
        },
        queries: {
          averageTime: Math.round(averageQueryTime * 100) / 100,
          slowQueryPercentage: this.totalQueries > 0 
            ? (this.slowQueries / this.totalQueries) * 100 
            : 0,
          totalExecuted: this.totalQueries,
          recommendation: this.getQueryRecommendation(averageQueryTime)
        },
        alerts: this.generateAlerts(),
        timestamp: new Date()
      };

      return insights;

    } catch (error) {
      console.error('❌ Failed to get performance insights:', error);
      return null;
    }
  }

  /**
   * Generate backup report
   */
  async generateBackupReport(): Promise<any> {
    try {
      const tableStats = await this.getTableStatistics();
      const totalRecords = Object.values(tableStats).reduce((sum, stats) => sum + stats.count, 0);

      return {
        summary: {
          totalTables: Object.keys(tableStats).length,
          totalRecords,
          estimatedSize: this.calculateEstimatedSize(tableStats),
          lastBackup: null, // Would track actual backup times
          nextScheduledBackup: null
        },
        tables: tableStats,
        recommendations: this.getBackupRecommendations(tableStats),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Failed to generate backup report:', error);
      return null;
    }
  }

  /**
   * Store metrics in database for historical tracking
   */
  async storeMetrics(): Promise<void> {
    try {
      if (!this.metrics) return;

      const metricsData = {
        connectionPool: this.metrics.connectionPool,
        queryPerformance: this.metrics.database.queryPerformance,
        health: this.metrics.health
      };

      await prisma.systemMetrics.create({
        data: {
          metricName: 'database_health',
          metricValue: this.metrics.health.isHealthy ? 1 : 0,
          metadata: metricsData,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Failed to store metrics:', error);
    }
  }

  /**
   * Private helper: Collect comprehensive metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const poolStats = dbPool.getStats();
      const healthCheck = await this.healthCheck();
      const tableStats = await this.getTableStatistics();

      const averageQueryTime = this.queryTimes.length > 0 
        ? this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length
        : 0;

      this.metrics = {
        connectionPool: poolStats,
        database: {
          tableStats,
          queryPerformance: {
            slowQueries: this.slowQueries,
            averageResponseTime: Math.round(averageQueryTime * 100) / 100,
            totalQueries: this.totalQueries
          },
          storage: {
            totalSize: 'unknown', // SQLite doesn't provide this easily
            availableSpace: 'unknown',
            usage: 0
          }
        },
        health: {
          isHealthy: healthCheck.isHealthy,
          lastCheck: new Date(),
          uptime: Date.now() - this.startTime,
          issues: healthCheck.issues
        }
      };

      // Store metrics for historical tracking
      await this.storeMetrics();

      // Check for alerts
      this.checkAlerts();

    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

  /**
   * Private helper: Get table statistics
   */
  private async getTableStatistics(): Promise<Record<string, { count: number; size?: string }>> {
    try {
      const stats: Record<string, { count: number; size?: string }> = {};

      // Get counts for main tables
      const tables = ['users', 'bets', 'portfolios', 'user_sessions', 'api_cache', 'system_metrics'];

      for (const table of tables) {
        try {
          const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
          const count = Array.isArray(result) && result[0] ? (result[0] as any).count : 0;
          stats[table] = { count: Number(count) };
        } catch (error) {
          console.warn(`⚠️ Failed to get stats for table ${table}:`, error);
          stats[table] = { count: 0 };
        }
      }

      return stats;

    } catch (error) {
      console.error('❌ Failed to get table statistics:', error);
      return {};
    }
  }

  /**
   * Private helper: Generate alerts based on current metrics
   */
  private generateAlerts(): string[] {
    const alerts: string[] = [];

    if (!this.metrics) return alerts;

    // Connection pool alerts
    const poolStats = this.metrics.connectionPool;
    if (poolStats.totalConnections > 0) {
      const usage = (poolStats.activeConnections / poolStats.totalConnections) * 100;
      if (usage > this.alerts.connectionUsageThreshold) {
        alerts.push(`High connection pool usage: ${usage.toFixed(1)}%`);
      }
    }

    // Query performance alerts
    const queryStats = this.metrics.database.queryPerformance;
    if (queryStats.totalQueries > 0) {
      const slowQueryRate = (queryStats.slowQueries / queryStats.totalQueries) * 100;
      if (slowQueryRate > 10) {
        alerts.push(`High slow query rate: ${slowQueryRate.toFixed(1)}%`);
      }
    }

    if (queryStats.averageResponseTime > this.alerts.slowQueryThreshold) {
      alerts.push(`High average query time: ${queryStats.averageResponseTime}ms`);
    }

    // Health alerts
    if (!this.metrics.health.isHealthy) {
      alerts.push('Database health check failed');
    }

    return alerts;
  }

  /**
   * Private helper: Check and log alerts
   */
  private checkAlerts(): void {
    const alerts = this.generateAlerts();
    
    if (alerts.length > 0) {
      console.warn('⚠️ Database monitoring alerts:');
      alerts.forEach(alert => console.warn(`  - ${alert}`));
    }
  }

  /**
   * Private helper: Get pool recommendations
   */
  private getPoolRecommendation(stats: any): string {
    if (stats.totalConnections === 0) {
      return 'Initialize connection pool';
    }

    const usage = (stats.activeConnections / stats.totalConnections) * 100;
    
    if (usage > 90) {
      return 'Consider increasing pool size';
    } else if (usage < 20 && stats.totalConnections > 5) {
      return 'Consider reducing pool size';
    } else if (stats.pendingRequests > 5) {
      return 'Pool may be undersized for current load';
    }

    return 'Pool configuration looks optimal';
  }

  /**
   * Private helper: Get query recommendations
   */
  private getQueryRecommendation(avgTime: number): string {
    if (avgTime > 1000) {
      return 'Optimize slow queries - consider adding indexes';
    } else if (avgTime > 500) {
      return 'Monitor query performance - some optimization may be needed';
    } else {
      return 'Query performance is good';
    }
  }

  /**
   * Private helper: Get backup recommendations
   */
  private getBackupRecommendations(tableStats: Record<string, { count: number }>): string[] {
    const recommendations: string[] = [];
    
    const totalRecords = Object.values(tableStats).reduce((sum, stats) => sum + stats.count, 0);
    
    if (totalRecords > 100000) {
      recommendations.push('Consider implementing incremental backups');
    }
    
    if (tableStats.users?.count > 1000) {
      recommendations.push('Implement regular user data backups');
    }
    
    if (tableStats.bets?.count > 10000) {
      recommendations.push('Archive old bet data to reduce backup size');
    }

    if (recommendations.length === 0) {
      recommendations.push('Current backup strategy is appropriate');
    }

    return recommendations;
  }

  /**
   * Private helper: Calculate estimated backup size
   */
  private calculateEstimatedSize(tableStats: Record<string, { count: number }>): string {
    const totalRecords = Object.values(tableStats).reduce((sum, stats) => sum + stats.count, 0);
    // Rough estimate: 1KB per record average
    const estimatedBytes = totalRecords * 1024;
    
    if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)}KB`;
    } else if (estimatedBytes < 1024 * 1024 * 1024) {
      return `${Math.round(estimatedBytes / (1024 * 1024))}MB`;
    } else {
      return `${Math.round(estimatedBytes / (1024 * 1024 * 1024))}GB`;
    }
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor();
export default databaseMonitor;