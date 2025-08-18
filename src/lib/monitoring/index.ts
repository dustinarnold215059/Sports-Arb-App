/**
 * Monitoring Services Index
 * Centralized monitoring and backup services
 */

export { databaseMonitor } from './databaseMonitor';
export { backupService } from './backupService';

// Re-export types
export type { DatabaseMetrics, AlertConfig } from './databaseMonitor';
export type { BackupConfig, BackupResult, BackupMetadata } from './backupService';

import { databaseMonitor } from './databaseMonitor';
import { backupService } from './backupService';
import { initializeCacheServices, getCacheStats } from '@/lib/cache';
import { getDatabaseStats } from '@/lib/database';

/**
 * Initialize all monitoring services
 */
export async function initializeMonitoring(): Promise<void> {
  try {
    console.log('📊 Initializing monitoring services...');

    // Initialize backup service
    await backupService.initialize();

    // Start database monitoring
    databaseMonitor.startMonitoring(60000); // Check every minute

    // Initialize cache services if not already done
    await initializeCacheServices();

    console.log('✅ Monitoring services initialized');

  } catch (error) {
    console.error('❌ Monitoring initialization failed:', error);
    // Continue without monitoring - non-critical for app functionality
  }
}

/**
 * Get comprehensive system health status
 */
export async function getSystemHealth(): Promise<any> {
  try {
    const [
      databaseHealth,
      databaseStats,
      cacheStats,
      backupStats
    ] = await Promise.all([
      databaseMonitor.healthCheck(),
      getDatabaseStats(),
      getCacheStats(),
      Promise.resolve(backupService.getBackupStats())
    ]);

    const overallHealth = databaseHealth.isHealthy;

    return {
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: {
        database: {
          healthy: databaseHealth.isHealthy,
          issues: databaseHealth.issues,
          stats: databaseStats
        },
        cache: {
          healthy: cacheStats?.redis?.keys !== undefined,
          stats: cacheStats
        },
        backup: {
          healthy: true, // Backup service doesn't have health concept
          stats: backupStats
        }
      },
      metrics: databaseMonitor.getMetrics(),
      performance: await databaseMonitor.getPerformanceInsights()
    };

  } catch (error) {
    console.error('❌ System health check failed:', error);
    return {
      status: 'error',
      timestamp: new Date(),
      error: error.message
    };
  }
}

/**
 * Get system performance report
 */
export async function getPerformanceReport(): Promise<any> {
  try {
    const [
      dbPerformance,
      dbMetrics,
      cacheMetrics
    ] = await Promise.all([
      databaseMonitor.getPerformanceInsights(),
      databaseMonitor.getMetrics(),
      getCacheStats()
    ]);

    return {
      timestamp: new Date(),
      database: {
        performance: dbPerformance,
        metrics: dbMetrics
      },
      cache: cacheMetrics,
      recommendations: await generateRecommendations(dbPerformance, cacheMetrics)
    };

  } catch (error) {
    console.error('❌ Performance report failed:', error);
    return {
      timestamp: new Date(),
      error: error.message
    };
  }
}

/**
 * Get backup report
 */
export async function getBackupReport(): Promise<any> {
  try {
    const [
      backupStats,
      backupHistory,
      dbBackupReport
    ] = await Promise.all([
      backupService.getBackupStats(),
      backupService.getBackupHistory(),
      databaseMonitor.generateBackupReport()
    ]);

    return {
      timestamp: new Date(),
      summary: backupStats,
      history: backupHistory.slice(0, 10), // Last 10 backups
      recommendations: dbBackupReport?.recommendations || [],
      nextScheduledBackup: null // Would implement with proper scheduling
    };

  } catch (error) {
    console.error('❌ Backup report failed:', error);
    return {
      timestamp: new Date(),
      error: error.message
    };
  }
}

/**
 * Create emergency backup
 */
export async function createEmergencyBackup(): Promise<any> {
  try {
    console.log('🚨 Creating emergency backup...');
    
    const result = await backupService.createBackup({
      compress: true,
      encrypt: false // Would enable with proper key management
    });

    if (result.success) {
      console.log(`✅ Emergency backup created: ${result.fileName}`);
    } else {
      console.error(`❌ Emergency backup failed: ${result.error}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Emergency backup failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Monitor system alerts
 */
export async function checkSystemAlerts(): Promise<any> {
  try {
    const health = await getSystemHealth();
    const alerts: any[] = [];

    // Database alerts
    if (!health.services.database.healthy) {
      alerts.push({
        type: 'database',
        severity: 'critical',
        message: 'Database health check failed',
        issues: health.services.database.issues,
        timestamp: new Date()
      });
    }

    // Performance alerts
    if (health.performance?.alerts?.length > 0) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: 'Performance issues detected',
        issues: health.performance.alerts,
        timestamp: new Date()
      });
    }

    // Cache alerts
    if (!health.services.cache.healthy) {
      alerts.push({
        type: 'cache',
        severity: 'warning',
        message: 'Cache service unavailable',
        timestamp: new Date()
      });
    }

    return {
      alertCount: alerts.length,
      alerts,
      lastCheck: new Date()
    };

  } catch (error) {
    console.error('❌ Alert check failed:', error);
    return {
      alertCount: 1,
      alerts: [{
        type: 'system',
        severity: 'critical',
        message: 'Monitoring system error',
        error: error.message,
        timestamp: new Date()
      }],
      lastCheck: new Date()
    };
  }
}

/**
 * Shutdown monitoring services
 */
export async function shutdownMonitoring(): Promise<void> {
  try {
    console.log('📊 Shutting down monitoring services...');
    
    databaseMonitor.stopMonitoring();
    
    console.log('✅ Monitoring services shutdown complete');
  } catch (error) {
    console.error('❌ Monitoring shutdown failed:', error);
  }
}

/**
 * Private helper: Generate system recommendations
 */
async function generateRecommendations(dbPerformance: any, cacheMetrics: any): Promise<string[]> {
  const recommendations: string[] = [];

  // Database recommendations
  if (dbPerformance?.connectionPool?.efficiency < 50) {
    recommendations.push('Consider optimizing database connection pool configuration');
  }

  if (dbPerformance?.queries?.slowQueryPercentage > 10) {
    recommendations.push('High number of slow queries detected - review and optimize database indexes');
  }

  // Cache recommendations
  if (cacheMetrics?.apiCache?.hitRatio < 80) {
    recommendations.push('API cache hit ratio is low - consider increasing cache TTL or warming cache');
  }

  if (!cacheMetrics?.redis?.keys) {
    recommendations.push('Redis cache is not available - consider setting up Redis for better performance');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('System performance looks good - continue monitoring');
  }

  return recommendations;
}