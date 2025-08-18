import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/middleware/auth';
import { createEmergencyBackup, checkSystemAlerts } from '@/lib/monitoring';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { prisma } from '@/lib/database';

/**
 * Admin System Management API
 * POST /api/admin/system/backup - Create emergency backup
 * GET /api/admin/system/alerts - Get system alerts
 * POST /api/admin/system/clear-cache - Clear application cache
 * GET /api/admin/system/logs - Get system logs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);
  
  try {
    // Require admin access
    const authResult = await requireAdmin(req);
    if (!authResult.authenticated) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Admin access required'
      });
    }

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        return handleGetOperations(req, res, authResult.user!, action as string);
      case 'POST':
        return handlePostOperations(req, res, authResult.user!, action as string);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Admin system API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Handle GET operations
 */
async function handleGetOperations(req: NextApiRequest, res: NextApiResponse, adminUser: any, action: string) {
  switch (action) {
    case 'alerts':
      return handleGetAlerts(req, res, adminUser);
    case 'logs':
      return handleGetLogs(req, res, adminUser);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
  }
}

/**
 * Handle POST operations
 */
async function handlePostOperations(req: NextApiRequest, res: NextApiResponse, adminUser: any, action: string) {
  switch (action) {
    case 'backup':
      return handleCreateBackup(req, res, adminUser);
    case 'clear-cache':
      return handleClearCache(req, res, adminUser);
    case 'clear-rate-limit':
      return handleClearRateLimit(req, res, adminUser);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
  }
}

/**
 * Get system alerts
 */
async function handleGetAlerts(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const alerts = await checkSystemAlerts();
    
    res.status(200).json({
      success: true,
      alerts: alerts.alerts,
      alertCount: alerts.alertCount,
      lastCheck: alerts.lastCheck
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
}

/**
 * Get system logs
 */
async function handleGetLogs(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { page = '1', limit = '50', type = 'all' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    let where: any = {};
    if (type !== 'all') {
      if (type === 'security') {
        where.action = { startsWith: 'SECURITY:' };
      } else if (type === 'error') {
        where.action = { startsWith: 'ERROR:' };
      } else if (type === 'api') {
        where.action = { startsWith: 'GET ' };
      }
    }

    const [logs, totalLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          action: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          timestamp: true
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    const totalPages = Math.ceil(totalLogs / limitNum);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalLogs,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
}

/**
 * Create emergency backup
 */
async function handleCreateBackup(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    console.log(`Admin ${adminUser.username} initiated emergency backup`);
    
    const backupResult = await createEmergencyBackup();
    
    // Log security event
    logSecurityEvent({
      type: 'suspicious_activity',
      description: `Admin ${adminUser.username} created emergency backup`,
      req,
      userId: adminUser.userId,
      severity: 'medium',
      metadata: {
        backupResult
      }
    });

    if (backupResult.success) {
      res.status(200).json({
        success: true,
        message: 'Emergency backup created successfully',
        backup: {
          id: backupResult.backupId,
          fileName: backupResult.fileName,
          size: backupResult.size,
          duration: backupResult.duration,
          timestamp: backupResult.timestamp
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Backup creation failed',
        details: backupResult.error
      });
    }

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
}

/**
 * Clear application cache
 */
async function handleClearCache(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { cacheType = 'all' } = req.body;
    
    // Import cache services dynamically to avoid circular dependencies
    const { redisCache } = await import('@/lib/cache/redisClient');
    
    let clearedKeys = 0;
    
    if (cacheType === 'all' || cacheType === 'api') {
      // Clear API cache
      const apiKeys = await redisCache.keys('api_cache:*');
      if (apiKeys.length > 0) {
        await redisCache.del(...apiKeys);
        clearedKeys += apiKeys.length;
      }
    }
    
    if (cacheType === 'all' || cacheType === 'sessions') {
      // Clear expired sessions only (don't clear active sessions)
      const sessionKeys = await redisCache.keys('session:*');
      for (const key of sessionKeys) {
        const ttl = await redisCache.ttl(key);
        if (ttl <= 0) {
          await redisCache.del(key);
          clearedKeys++;
        }
      }
    }

    // Log security event
    logSecurityEvent({
      type: 'suspicious_activity',
      description: `Admin ${adminUser.username} cleared ${cacheType} cache`,
      req,
      userId: adminUser.userId,
      severity: 'low',
      metadata: {
        cacheType,
        clearedKeys
      }
    });

    res.status(200).json({
      success: true,
      message: `Cache cleared successfully`,
      details: {
        cacheType,
        clearedKeys
      }
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
}

/**
 * Clear rate limit for specific IP/user
 */
async function handleClearRateLimit(req: NextApiRequest, res: NextApiResponse, adminUser: any) {
  try {
    const { targetIp, targetUserId } = req.body;
    
    if (!targetIp && !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target IP or User ID is required'
      });
    }

    // Create a mock request to clear rate limit
    const mockReq = {
      socket: { remoteAddress: targetIp },
      cookies: { session: targetUserId },
      headers: {}
    } as any;

    const cleared = await rateLimiter.clearLimit(mockReq);

    // Log security event
    logSecurityEvent({
      type: 'suspicious_activity',
      description: `Admin ${adminUser.username} cleared rate limit`,
      req,
      userId: adminUser.userId,
      severity: 'medium',
      metadata: {
        targetIp,
        targetUserId,
        cleared
      }
    });

    res.status(200).json({
      success: true,
      message: 'Rate limit cleared successfully',
      cleared
    });

  } catch (error) {
    console.error('Clear rate limit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear rate limit'
    });
  }
}