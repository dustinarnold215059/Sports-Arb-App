/**
 * Production Health Check Endpoint
 * Comprehensive system health monitoring for production deployment
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/database';
import { redisCache } from '@/lib/cache/redisClient';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    api: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthCheckResult | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Initialize health check result
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'unhealthy' },
        redis: { status: 'unhealthy' },
        api: { status: 'healthy', responseTime: 0 }
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Check Database Connection
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;
      
      healthCheck.services.database = {
        status: 'healthy',
        responseTime: dbResponseTime
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
      healthCheck.status = 'degraded';
    }

    // Check Redis Connection
    try {
      const redisStart = Date.now();
      await redisCache.set('health_check', 'ok', { ttl: 10 });
      await redisCache.get('health_check');
      const redisResponseTime = Date.now() - redisStart;
      
      healthCheck.services.redis = {
        status: 'healthy',
        responseTime: redisResponseTime
      };
    } catch (error) {
      healthCheck.services.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
      // Redis failure is not critical, keep status as is
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }

    // Set API response time
    healthCheck.services.api.responseTime = Date.now() - startTime;

    // Determine overall status
    const criticalServicesDown = !healthCheck.services.database.status.includes('healthy');
    
    if (criticalServicesDown) {
      healthCheck.status = 'unhealthy';
    } else if (healthCheck.status === 'healthy' && 
               !healthCheck.services.redis.status.includes('healthy')) {
      healthCheck.status = 'degraded';
    }

    // Set response status code based on health
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthCheck);

  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'unhealthy', error: 'Health check failed' },
        redis: { status: 'unhealthy', error: 'Health check failed' },
        api: { status: 'unhealthy', responseTime: Date.now() - startTime }
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    } as HealthCheckResult);
  }
}