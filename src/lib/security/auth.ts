import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Validation schemas
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Invalid email format');
export const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters');

// Password hashing
export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    try {
      // Validate password strength
      passwordSchema.parse(password);
      
      // Generate salt and hash
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      return hashedPassword;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Password validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw new Error('Failed to hash password');
    }
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Ensure at least one character from each required set
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*()_+-='[Math.floor(Math.random() * 13)]; // Special
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// JWT Authentication
export class JWTService {
  // Safe static secrets that work for both build and runtime
  private static getJWTSecret(): string {
    if (process.env.JWT_SECRET) {
      return process.env.JWT_SECRET;
    }
    
    // Build-time/development fallback
    if (process.env.NODE_ENV !== 'production') {
      return 'dev-secret-key-change-in-production-at-least-32-chars';
    }
    
    // Build-time detection for production (no runtime secrets available)
    const isBuildTime = !process.env.VERCEL_ENV && !process.env.PORT;
    if (isBuildTime) {
      return 'build-time-jwt-secret-safe-default-at-least-32-chars';
    }
    
    // This should only happen in actual production runtime
    throw new Error('JWT_SECRET environment variable is required in production runtime');
  }
  
  private static getJWTRefreshSecret(): string {
    if (process.env.JWT_REFRESH_SECRET) {
      return process.env.JWT_REFRESH_SECRET;
    }
    
    // Build-time/development fallback
    if (process.env.NODE_ENV !== 'production') {
      return 'dev-refresh-secret-key-change-in-production-at-least-32-chars';
    }
    
    // Build-time detection for production (no runtime secrets available)
    const isBuildTime = !process.env.VERCEL_ENV && !process.env.PORT;
    if (isBuildTime) {
      return 'build-time-refresh-secret-safe-default-at-least-32-chars';
    }
    
    // This should only happen in actual production runtime
    throw new Error('JWT_REFRESH_SECRET environment variable is required in production runtime');
  }

  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static generateAccessToken(payload: { userId: string; username: string; role: string }): string {
    return jwt.sign(payload, this.getJWTSecret(), { 
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'sports-arb',
      audience: 'sports-arb-users'
    });
  }

  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.getJWTRefreshSecret(), { 
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'sports-arb',
      audience: 'sports-arb-users'
    });
  }

  static verifyAccessToken(token: string): { userId: string; username: string; role: string } | null {
    try {
      const decoded = jwt.verify(token, this.getJWTSecret(), {
        issuer: 'sports-arb',
        audience: 'sports-arb-users'
      }) as any;
      
      return {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.getJWTRefreshSecret(), {
        issuer: 'sports-arb',
        audience: 'sports-arb-users'
      }) as any;
      
      return { userId: decoded.userId };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  static getTokenExpiry(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  }
}

// Rate limiting store (in-memory for now, should use Redis in production)
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      const newEntry = { count: 1, resetTime };
      this.store.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Rate limiting
export class RateLimitService {
  private static store = new RateLimitStore();

  static checkRateLimit(
    identifier: string, 
    maxRequests: number, 
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const result = this.store.increment(identifier, windowMs);
    
    return {
      allowed: result.count <= maxRequests,
      remaining: Math.max(0, maxRequests - result.count),
      resetTime: result.resetTime
    };
  }

  static resetRateLimit(identifier: string): void {
    this.store.reset(identifier);
  }
}

// Input sanitization
export class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email.toLowerCase());
    emailSchema.parse(sanitized);
    return sanitized;
  }

  static sanitizeUsername(username: string): string {
    const sanitized = this.sanitizeString(username.toLowerCase());
    usernameSchema.parse(sanitized);
    return sanitized;
  }

  static sanitizeNumericString(input: string): string {
    return input.replace(/[^0-9.-]/g, '');
  }
}

// Security utilities
export class SecurityUtils {
  static generateSecureRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isSecurePassword(password: string): { isValid: boolean; errors: string[] } {
    try {
      passwordSchema.parse(password);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          isValid: false, 
          errors: error.errors.map(e => e.message) 
        };
      }
      return { isValid: false, errors: ['Password validation failed'] };
    }
  }

  static getClientIP(request: Request): string {
    // Try to get real IP from various headers
    const headers = request.headers;
    const xForwardedFor = headers.get('x-forwarded-for');
    const xRealIP = headers.get('x-real-ip');
    const cfConnectingIP = headers.get('cf-connecting-ip');
    
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    
    return xRealIP || cfConnectingIP || 'unknown';
  }
}

export default {
  PasswordService,
  JWTService,
  RateLimitService,
  InputSanitizer,
  SecurityUtils
};