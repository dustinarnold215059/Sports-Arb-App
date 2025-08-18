/**
 * System Health Test Endpoint
 * Comprehensive testing of critical system components and edge cases
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/database';
import { redisCache } from '@/lib/cache/redisClient';
import { arbitrageWorkerManager } from '@/lib/workers/arbitrageWorkerManager';
import { rateLimiter } from '@/lib/middleware/rateLimiter';

interface SystemHealthTest {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  duration: number;
  details?: any;
  error?: string;
}

interface SystemHealthReport {
  overall: 'pass' | 'fail' | 'warning';
  timestamp: string;
  totalDuration: number;
  tests: SystemHealthTest[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const tests: SystemHealthTest[] = [];

  try {
    // Test 1: Database Connection & Query Performance
    await runTest(tests, 'Database Connection', async () => {
      await prisma.$queryRaw`SELECT 1 as test`;
      await prisma.user.count();
      return { queryCount: 2 };
    });

    // Test 2: Database Transaction Rollback
    await runTest(tests, 'Database Transaction Rollback', async () => {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email: 'test-rollback@example.com',
              username: 'test-rollback',
              password: 'test123'
            }
          });
          throw new Error('Intentional rollback');
        });
      } catch (error) {
        // Check that user was not created (transaction rolled back)
        const user = await prisma.user.findUnique({
          where: { email: 'test-rollback@example.com' }
        });
        if (user) {
          throw new Error('Transaction rollback failed - user was created');
        }
        return { rollbackSuccessful: true };
      }
      throw new Error('Transaction should have been rolled back');
    });

    // Test 3: Redis Cache Operations
    await runTest(tests, 'Redis Cache Operations', async () => {
      const testKey = `test-${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };
      
      await redisCache.set(testKey, testValue, { ttl: 10 });
      const retrieved = await redisCache.get(testKey);
      
      if (JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
        throw new Error('Cache value mismatch');
      }
      
      await redisCache.delete(testKey);
      const afterDelete = await redisCache.get(testKey);
      
      if (afterDelete !== null) {
        throw new Error('Cache delete failed');
      }
      
      return { cacheOperations: 3 };
    });

    // Test 4: Rate Limiter Functionality
    await runTest(tests, 'Rate Limiter', async () => {
      const mockReq = {
        headers: { 'x-forwarded-for': '192.168.1.100' },
        url: '/api/test-rate-limit',
        method: 'GET'
      } as any;

      // Test rate limiter allows requests
      const result1 = await rateLimiter.checkLimit(mockReq, 'test', { requests: 2, window: 60000 });
      if (!result1.allowed) {
        throw new Error('Rate limiter should allow first request');
      }

      // Test rate limiter blocks excessive requests
      await rateLimiter.checkLimit(mockReq, 'test', { requests: 2, window: 60000 });
      const result3 = await rateLimiter.checkLimit(mockReq, 'test', { requests: 2, window: 60000 });
      
      if (result3.allowed) {
        throw new Error('Rate limiter should block excessive requests');
      }
      
      return { rateLimitTest: 'passed' };
    });

    // Test 5: Arbitrage Worker Manager
    await runTest(tests, 'Arbitrage Worker Manager', async () => {
      const testData = {
        game: 'Test Game',
        outcomes: {
          'BookmakerA': { TeamA: 150, TeamB: -180 },
          'BookmakerB': { TeamA: 140, TeamB: -160 }
        }
      };

      const result = await arbitrageWorkerManager.calculateArbitrage(testData);
      
      if (!result || typeof result.calculationTime !== 'number') {
        throw new Error('Worker calculation failed');
      }
      
      const status = arbitrageWorkerManager.getStatus();
      
      return { 
        calculationTime: result.calculationTime,
        workerStatus: status 
      };
    });

    // Test 6: Large Data Processing (Memory Test)
    await runTest(tests, 'Memory Handling', async () => {
      const largeArray = Array(10000).fill(null).map((_, i) => ({
        id: i,
        data: `test-data-${i}`,
        timestamp: Date.now()
      }));
      
      const memoryBefore = process.memoryUsage();
      
      // Process large array
      const processed = largeArray.map(item => ({
        ...item,
        processed: true
      }));
      
      const memoryAfter = process.memoryUsage();
      
      // Clear reference
      largeArray.length = 0;
      processed.length = 0;
      
      return {
        memoryBefore: memoryBefore.heapUsed,
        memoryAfter: memoryAfter.heapUsed,
        memoryDiff: memoryAfter.heapUsed - memoryBefore.heapUsed
      };
    });

    // Test 7: Error Handling for Invalid Database Operations
    await runTest(tests, 'Error Handling - Invalid Operations', async () => {
      try {
        // Try to create user with duplicate email (should fail)
        await prisma.user.create({
          data: {
            email: 'duplicate@example.com',
            username: 'duplicate1',
            password: 'test123'
          }
        });
        
        // This should fail due to unique constraint
        await prisma.user.create({
          data: {
            email: 'duplicate@example.com', // Same email
            username: 'duplicate2',
            password: 'test123'
          }
        });
        
        throw new Error('Duplicate email should have been rejected');
      } catch (error) {
        // Clean up test data
        await prisma.user.deleteMany({
          where: { email: 'duplicate@example.com' }
        });
        
        if (error.message.includes('Unique constraint')) {
          return { errorHandling: 'correct' };
        }
        throw error;
      }
    });

    // Test 8: API Response Time Under Load
    await runTest(tests, 'API Response Time', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        return prisma.user.count();
      });
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      if (averageTime > 1000) { // More than 1 second average
        throw new Error(`High response time: ${averageTime}ms average`);
      }
      
      return {
        concurrentRequests,
        totalTime,
        averageTime
      };
    });

    // Generate summary
    const summary = {
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length,
      warnings: tests.filter(t => t.status === 'warning').length,
      total: tests.length
    };

    const overall = summary.failed > 0 ? 'fail' : 
                   summary.warnings > 0 ? 'warning' : 'pass';

    const report: SystemHealthReport = {
      overall,
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - startTime,
      tests,
      summary
    };

    const statusCode = overall === 'fail' ? 500 : 200;
    res.status(statusCode).json(report);

  } catch (error) {
    console.error('System health test failed:', error);
    
    res.status(500).json({
      overall: 'fail',
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - startTime,
      tests,
      summary: { passed: 0, failed: 1, warnings: 0, total: 1 },
      error: error.message
    });
  }
}

async function runTest(
  tests: SystemHealthTest[], 
  name: string, 
  testFn: () => Promise<any>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    tests.push({
      component: name,
      status: duration > 5000 ? 'warning' : 'pass', // Warn if test takes > 5s
      duration,
      details: result
    });
    
    console.log(`✅ ${name} - ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    tests.push({
      component: name,
      status: 'fail',
      duration,
      error: error.message
    });
    
    console.error(`❌ ${name} - ${error.message} (${duration}ms)`);
  }
}