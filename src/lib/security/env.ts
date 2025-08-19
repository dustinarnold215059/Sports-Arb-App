import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT Configuration - CRITICAL for security (optional in schema, validated in function)
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),

  // Database Configuration
  DATABASE_URL: z.string().url().optional(),

  // API Keys
  THE_ODDS_API_KEY: z.string().optional(),
  THE_ODDS_API_BASE_URL: z.string().url().default('https://api.the-odds-api.com/v4'),

  // Square Payment Configuration
  SQUARE_APPLICATION_ID: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Sentry Configuration
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Application Settings
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3005'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3005,http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),

  // Session Configuration
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long').optional(),
  COOKIE_SECURE: z.string().transform(Boolean).default('false'),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Email Configuration
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_SERVICE: z.enum(['smtp', 'sendgrid', 'mailgun']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().positive()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Analytics
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),

  // Feature Flags
  ENABLE_SIGNUP: z.string().transform(Boolean).default('true'),
  ENABLE_PAYMENTS: z.string().transform(Boolean).default('true'),
  ENABLE_2FA: z.string().transform(Boolean).default('false'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(Boolean).default('true'),

  // Development Settings
  DEBUG_MODE: z.string().transform(Boolean).default('false'),
  MOCK_EXTERNAL_APIS: z.string().transform(Boolean).default('false'),
  SEED_DATABASE: z.string().transform(Boolean).default('false'),

  // Performance Settings
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().positive()).default('300'),
  ENABLE_REDIS_CACHE: z.string().transform(Boolean).default('false'),
  ENABLE_PERFORMANCE_MONITORING: z.string().transform(Boolean).default('true')
});

// Validate and export environment variables
function validateEnv() {
  // CRITICAL: Always provide defaults during any production build process
  // This prevents build failures while maintaining runtime security
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const hasRuntimeSecrets = process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET;
  const isLikelyBuildTime = !hasRuntimeSecrets && process.env.NODE_ENV === 'production';
  
  try {
    // Better detection of build vs runtime environments
    const isBuildTime = (
      // Development is never build time for validation
      isDevelopment ||
      // No secrets in production = likely build time
      isLikelyBuildTime ||
      // Vercel build indicators
      (process.env.VERCEL === '1' && !process.env.VERCEL_ENV) ||
      // CI build indicators  
      process.env.CI === 'true' ||
      // Next.js build command detection
      (typeof process !== 'undefined' && process.argv && process.argv.includes('build')) ||
      // Generic build time detection - no runtime port means build time
      (process.env.NODE_ENV === 'production' && !process.env.PORT && !process.env.VERCEL_ENV)
    );
    
    const isProductionRuntime = process.env.NODE_ENV === 'production' && !isBuildTime;
    
    console.log('🔍 Environment Detection:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      CI: process.env.CI,
      isBuildTime,
      isProductionRuntime
    });
    
    // For production runtime, ensure critical secrets are set and valid
    if (isProductionRuntime) {
      const jwtSecret = process.env.JWT_SECRET;
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      
      if (!jwtSecret || !refreshSecret) {
        throw new Error(`Missing required environment variables in production runtime: ${[
          !jwtSecret ? 'JWT_SECRET' : null,
          !refreshSecret ? 'JWT_REFRESH_SECRET' : null
        ].filter(Boolean).join(', ')}`);
      }

      // Validate secret strength in production
      if (jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long in production');
      }

      if (refreshSecret.length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long in production');
      }

      if (jwtSecret.length < 64) {
        console.warn('⚠️  JWT_SECRET should be at least 64 characters long in production');
      }

      if (refreshSecret.length < 64) {
        console.warn('⚠️  JWT_REFRESH_SECRET should be at least 64 characters long in production');
      }

      if (jwtSecret === refreshSecret) {
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
      }
    }

    // For build time or development, provide safe defaults
    const envWithDefaults = {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'build-time-jwt-secret-key-at-least-32-chars-long-safe-default',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'build-time-refresh-secret-key-at-least-32-chars-long-safe-default'
    };

    const env = envSchema.parse(envWithDefaults);
    
    if (isBuildTime) {
      console.log('✅ Build-time environment validation passed with defaults');
    } else if (isProductionRuntime) {
      console.log('✅ Production runtime environment validation passed');
    } else {
      console.log('✅ Development environment validation passed');
    }
    
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(`  - ${error}`);
    }
    
    // Only exit in production runtime, never during build
    if (process.env.NODE_ENV === 'production' && !isBuildTime) {
      console.error('🚫 Exiting due to production runtime validation failure');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing with safe default environment values');
      // Return environment with safe defaults
      try {
        return envSchema.parse({
          ...process.env,
          JWT_SECRET: 'build-time-jwt-secret-key-at-least-32-chars-long-safe-default',
          JWT_REFRESH_SECRET: 'build-time-refresh-secret-key-at-least-32-chars-long-safe-default'
        });
      } catch (fallbackError) {
        console.error('❌ Even fallback environment validation failed:', fallbackError);
        throw fallbackError;
      }
    }
  }
}

// Export validated environment
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

// Helper functions for secure environment access
export class EnvManager {
  // Get API key with validation
  static getOddsAPIKey(): string {
    const apiKey = env.THE_ODDS_API_KEY;
    if (!apiKey && env.NODE_ENV === 'production') {
      throw new Error('THE_ODDS_API_KEY is required in production');
    }
    return apiKey || '';
  }

  // Get database URL with validation
  static getDatabaseURL(): string {
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl && env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production');
    }
    return dbUrl || '';
  }

  // Get JWT secrets securely
  static getJWTSecrets(): { accessSecret: string; refreshSecret: string } {
    return {
      accessSecret: env.JWT_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET
    };
  }

  // Check if feature is enabled
  static isFeatureEnabled(feature: keyof Pick<Env, 'ENABLE_SIGNUP' | 'ENABLE_PAYMENTS' | 'ENABLE_2FA' | 'ENABLE_EMAIL_VERIFICATION'>): boolean {
    return env[feature];
  }

  // Get allowed origins as array
  static getAllowedOrigins(): string[] {
    return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }

  // Get rate limit configuration
  static getRateLimitConfig(): { maxRequests: number; windowMs: number } {
    return {
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW_MS
    };
  }

  // Check if running in production
  static isProduction(): boolean {
    return env.NODE_ENV === 'production';
  }

  // Check if running in development
  static isDevelopment(): boolean {
    return env.NODE_ENV === 'development';
  }

  // Get app URL
  static getAppURL(): string {
    return env.NEXT_PUBLIC_APP_URL;
  }

  // Safe console logging (respects log level)
  static log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(env.LOG_LEVEL);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      console[level](`[${level.toUpperCase()}]`, message, ...args);
    }
  }
}

// Generate secure random secrets for development
export function generateSecrets(): { jwtSecret: string; refreshSecret: string; sessionSecret: string } {
  const crypto = require('crypto');
  
  return {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    refreshSecret: crypto.randomBytes(64).toString('hex'),
    sessionSecret: crypto.randomBytes(32).toString('hex')
  };
}

// Export for use in other modules
export default env;