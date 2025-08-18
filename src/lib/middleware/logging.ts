import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/database';

export interface LogEntry {
  timestamp: Date;
  method: string;
  url: string;
  userAgent: string;
  ipAddress: string;
  sessionId?: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  requestBody?: any;
  queryParams?: any;
}

/**
 * Request logging middleware
 */
export async function logRequest(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const startTime = Date.now();
  
  // Extract request information
  const logEntry: LogEntry = {
    timestamp: new Date(),
    method: req.method || 'UNKNOWN',
    url: req.url || '',
    userAgent: req.headers['user-agent'] || 'unknown',
    ipAddress: getClientIP(req),
    sessionId: req.cookies.session,
    queryParams: req.query
  };

  // Log sensitive endpoints differently
  const sensitiveEndpoints = ['/api/auth/login', '/api/auth/register'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.url?.startsWith(endpoint));
  
  if (!isSensitive && req.method === 'POST') {
    logEntry.requestBody = req.body;
  }

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = Date.now() - startTime;
    
    // Log the request
    logRequestToStorage(logEntry);
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  console.log(`📝 ${logEntry.method} ${logEntry.url} - ${logEntry.ipAddress}`);
}

/**
 * Log error with context
 */
export function logError(error: Error, context: {
  req?: NextApiRequest;
  userId?: string;
  operation?: string;
  metadata?: any;
}): void {
  const errorLog = {
    timestamp: new Date(),
    error: error.message,
    stack: error.stack,
    operation: context.operation,
    userId: context.userId,
    metadata: context.metadata,
    url: context.req?.url,
    method: context.req?.method,
    ipAddress: context.req ? getClientIP(context.req) : undefined
  };

  console.error('❌ Error:', errorLog);
  
  // Store error in database for monitoring
  storeErrorLog(errorLog);
}

/**
 * Log security event
 */
export function logSecurityEvent(event: {
  type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access';
  description: string;
  req: NextApiRequest;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}): void {
  const securityLog = {
    timestamp: new Date(),
    type: event.type,
    description: event.description,
    severity: event.severity,
    userId: event.userId,
    ipAddress: getClientIP(event.req),
    userAgent: event.req.headers['user-agent'] || 'unknown',
    url: event.req.url,
    method: event.req.method,
    metadata: event.metadata
  };

  console.warn(`🚨 Security Event [${event.severity.toUpperCase()}]:`, securityLog);
  
  // Store security event for analysis
  storeSecurityLog(securityLog);
}

/**
 * Performance monitoring
 */
export function logPerformance(operation: string, duration: number, metadata?: any): void {
  const performanceLog = {
    timestamp: new Date(),
    operation,
    duration,
    metadata
  };

  if (duration > 1000) {
    console.warn(`⚠️ Slow operation: ${operation} took ${duration}ms`);
  } else {
    console.log(`⏱️ ${operation}: ${duration}ms`);
  }

  // Store performance metrics
  storePerformanceLog(performanceLog);
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextApiRequest): string {
  // Try various headers for real IP (Vercel, Cloudflare, etc.)
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'] as string;
  
  return cfConnectingIp || 
         realIp || 
         vercelForwardedFor ||
         forwarded?.split(',')[0] || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * Store request log in database
 */
async function logRequestToStorage(logEntry: LogEntry): Promise<void> {
  try {
    // Only log API requests to avoid spam
    if (!logEntry.url.startsWith('/api/')) return;

    await prisma.auditLog.create({
      data: {
        action: `${logEntry.method} ${logEntry.url}`,
        userId: logEntry.userId || null,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        metadata: {
          statusCode: logEntry.statusCode,
          responseTime: logEntry.responseTime,
          queryParams: logEntry.queryParams,
          ...(logEntry.requestBody && { requestBody: logEntry.requestBody })
        },
        timestamp: logEntry.timestamp
      }
    });
  } catch (error) {
    console.error('Failed to store request log:', error);
  }
}

/**
 * Store error log in database
 */
async function storeErrorLog(errorLog: any): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: `ERROR: ${errorLog.operation || 'Unknown'}`,
        userId: errorLog.userId || null,
        ipAddress: errorLog.ipAddress || 'unknown',
        userAgent: 'system',
        metadata: {
          error: errorLog.error,
          stack: errorLog.stack,
          metadata: errorLog.metadata,
          url: errorLog.url,
          method: errorLog.method
        },
        timestamp: errorLog.timestamp
      }
    });
  } catch (error) {
    console.error('Failed to store error log:', error);
  }
}

/**
 * Store security log in database
 */
async function storeSecurityLog(securityLog: any): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: `SECURITY: ${securityLog.type}`,
        userId: securityLog.userId || null,
        ipAddress: securityLog.ipAddress,
        userAgent: securityLog.userAgent,
        metadata: {
          type: securityLog.type,
          description: securityLog.description,
          severity: securityLog.severity,
          metadata: securityLog.metadata,
          url: securityLog.url,
          method: securityLog.method
        },
        timestamp: securityLog.timestamp
      }
    });
  } catch (error) {
    console.error('Failed to store security log:', error);
  }
}

/**
 * Store performance log in database
 */
async function storePerformanceLog(performanceLog: any): Promise<void> {
  try {
    // Only store slow operations to avoid database spam
    if (performanceLog.duration < 1000) return;

    await prisma.systemMetrics.create({
      data: {
        metricName: 'performance',
        metricValue: performanceLog.duration,
        metadata: {
          operation: performanceLog.operation,
          metadata: performanceLog.metadata
        },
        timestamp: performanceLog.timestamp
      }
    });
  } catch (error) {
    console.error('Failed to store performance log:', error);
  }
}

/**
 * Create request logger for specific endpoints
 */
export function createEndpointLogger(endpointName: string) {
  return {
    info: (message: string, metadata?: any) => {
      console.log(`📝 [${endpointName}] ${message}`, metadata || '');
    },
    warn: (message: string, metadata?: any) => {
      console.warn(`⚠️ [${endpointName}] ${message}`, metadata || '');
    },
    error: (message: string, error?: Error, metadata?: any) => {
      console.error(`❌ [${endpointName}] ${message}`, error || '', metadata || '');
    }
  };
}