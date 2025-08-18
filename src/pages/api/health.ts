import { NextApiRequest, NextApiResponse } from 'next';
import { getSystemHealth } from '@/lib/monitoring';

/**
 * Health Check API Endpoint
 * GET /api/health
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const health = await getSystemHealth();
    
    const healthStatus = {
      status: health.status,
      timestamp: health.timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: health.services.database.healthy,
        cache: health.services.cache.healthy,
        backup: health.services.backup.healthy
      }
    };

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...healthStatus
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      success: false,
      status: 'error',
      timestamp: new Date(),
      error: 'Health check failed'
    });
  }
}