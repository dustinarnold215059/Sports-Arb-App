import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/middleware/auth';
import { getSystemHealth, getPerformanceReport, getBackupReport } from '@/lib/monitoring';
import { getDatabaseStats } from '@/lib/database';
import { getCacheStats } from '@/lib/cache';
import { logRequest } from '@/lib/middleware/logging';

/**
 * Admin Dashboard Data API
 * GET /api/admin/dashboard
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Require admin access
    const authResult = await requireAdmin(req);
    if (!authResult.authenticated) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Admin access required'
      });
    }

    // Gather dashboard data
    const [
      systemHealth,
      performanceReport,
      backupReport,
      databaseStats,
      cacheStats
    ] = await Promise.all([
      getSystemHealth(),
      getPerformanceReport(),
      getBackupReport(),
      getDatabaseStats(),
      getCacheStats()
    ]);

    // Calculate uptime
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);

    // Get system overview
    const systemOverview = {
      status: systemHealth.status,
      uptime: uptimeFormatted,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Get service statuses
    const services = {
      database: {
        status: systemHealth.services.database.healthy ? 'healthy' : 'unhealthy',
        responseTime: databaseStats?.health?.details?.responseTime || 0,
        connections: databaseStats?.pool?.totalConnections || 0,
        queries: databaseStats?.pool?.totalQueries || 0
      },
      cache: {
        status: systemHealth.services.cache.healthy ? 'healthy' : 'unhealthy',
        hitRatio: cacheStats?.apiCache?.hitRatio || 0,
        keys: cacheStats?.redis?.keys || 0,
        memory: cacheStats?.redis?.memory || 0
      },
      backup: {
        status: 'healthy', // Backup service doesn't have health status
        totalBackups: backupReport?.summary?.totalBackups || 0,
        lastBackup: backupReport?.summary?.lastBackup || null,
        totalSize: backupReport?.summary?.totalSize || '0B'
      }
    };

    // Get recent metrics
    const metrics = {
      performance: {
        averageResponseTime: performanceReport?.database?.metrics?.averageQueryTime || 0,
        slowQueries: performanceReport?.database?.metrics?.slowQueries || 0,
        errorRate: calculateErrorRate(databaseStats?.pool),
        throughput: calculateThroughput(databaseStats?.pool)
      },
      alerts: systemHealth.services.database.issues || [],
      recommendations: performanceReport?.recommendations || []
    };

    // Return dashboard data
    res.status(200).json({
      success: true,
      dashboard: {
        overview: systemOverview,
        services,
        metrics,
        health: {
          overall: systemHealth.status,
          issues: systemHealth.services.database.issues || [],
          lastCheck: systemHealth.timestamp
        },
        performance: performanceReport?.database?.performance || {},
        backup: {
          summary: backupReport?.summary || {},
          recent: backupReport?.history?.slice(0, 5) || []
        }
      }
    });

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
}

/**
 * Format uptime in human readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Calculate error rate percentage
 */
function calculateErrorRate(poolStats: any): number {
  if (!poolStats || poolStats.totalQueries === 0) return 0;
  return ((poolStats.errors || 0) / poolStats.totalQueries) * 100;
}

/**
 * Calculate throughput (queries per minute)
 */
function calculateThroughput(poolStats: any): number {
  if (!poolStats) return 0;
  // This is a simplified calculation - in production you'd track this over time
  return poolStats.totalQueries || 0;
}