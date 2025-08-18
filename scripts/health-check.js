const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function healthCheck() {
  const results = {
    timestamp: new Date(),
    status: 'healthy',
    checks: {},
    errors: []
  };

  try {
    console.log('🔍 Starting health check...');

    // 1. Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.checks.database = { status: 'healthy', responseTime: 0 };
      console.log('✅ Database: Connected');
    } catch (error) {
      results.checks.database = { status: 'unhealthy', error: error.message };
      results.errors.push('Database connection failed');
      console.error('❌ Database: Failed -', error.message);
    }

    // 2. Redis connectivity check (if Redis URL is provided)
    if (process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        const client = redis.createClient({ url: process.env.REDIS_URL });
        await client.connect();
        await client.ping();
        await client.disconnect();
        results.checks.redis = { status: 'healthy' };
        console.log('✅ Redis: Connected');
      } catch (error) {
        results.checks.redis = { status: 'unhealthy', error: error.message };
        results.errors.push('Redis connection failed');
        console.error('❌ Redis: Failed -', error.message);
      }
    } else {
      results.checks.redis = { status: 'skipped', reason: 'No Redis URL configured' };
      console.log('⚠️ Redis: Skipped (no URL configured)');
    }

    // 3. API endpoint check
    if (process.env.VERCEL_URL || process.env.NEXTAUTH_URL) {
      const baseUrl = process.env.VERCEL_URL || process.env.NEXTAUTH_URL;
      const healthUrl = `${baseUrl}/api/health`;
      
      try {
        const response = await makeHttpRequest(healthUrl);
        if (response.statusCode === 200) {
          results.checks.api = { status: 'healthy', statusCode: response.statusCode };
          console.log('✅ API: Responding');
        } else {
          results.checks.api = { status: 'unhealthy', statusCode: response.statusCode };
          results.errors.push(`API returned status ${response.statusCode}`);
          console.error(`❌ API: Status ${response.statusCode}`);
        }
      } catch (error) {
        results.checks.api = { status: 'unhealthy', error: error.message };
        results.errors.push('API endpoint unreachable');
        console.error('❌ API: Unreachable -', error.message);
      }
    } else {
      results.checks.api = { status: 'skipped', reason: 'No API URL configured' };
      console.log('⚠️ API: Skipped (no URL configured)');
    }

    // 4. Environment variables check
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      results.checks.environment = { status: 'healthy', message: 'All required variables present' };
      console.log('✅ Environment: All required variables present');
    } else {
      results.checks.environment = { 
        status: 'unhealthy', 
        missingVariables: missingVars 
      };
      results.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
      console.error('❌ Environment: Missing variables -', missingVars.join(', '));
    }

    // 5. File system check (write permissions)
    try {
      const fs = require('fs');
      const path = require('path');
      const testFile = path.join(process.cwd(), 'health-check-test.tmp');
      
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      results.checks.filesystem = { status: 'healthy', message: 'Write permissions OK' };
      console.log('✅ Filesystem: Write permissions OK');
    } catch (error) {
      results.checks.filesystem = { status: 'unhealthy', error: error.message };
      results.errors.push('Filesystem write permission failed');
      console.error('❌ Filesystem: Write failed -', error.message);
    }

    // Determine overall status
    const unhealthyChecks = Object.values(results.checks).filter(check => check.status === 'unhealthy');
    results.status = unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy';

    // Summary
    console.log('\n📊 Health Check Summary:');
    console.log(`Overall Status: ${results.status.toUpperCase()}`);
    console.log(`Timestamp: ${results.timestamp}`);
    
    if (results.errors.length > 0) {
      console.log('Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Exit with appropriate code
    process.exit(results.status === 'healthy' ? 0 : 1);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    results.status = 'unhealthy';
    results.errors.push(`Health check system error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Make HTTP request with timeout
 */
function makeHttpRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'Health-Check/1.0'
      }
    };

    const client = parsedUrl.protocol === 'https:' ? https : require('http');
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run health check if called directly
if (require.main === module) {
  healthCheck();
}

module.exports = { healthCheck };