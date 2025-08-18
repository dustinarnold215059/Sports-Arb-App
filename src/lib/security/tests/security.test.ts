import { PasswordService, JWTService, SecurityUtils, InputSanitizer } from '../auth';
import { secureUserDatabase } from '../secureUserDatabase';

describe('Security Implementation Tests', () => {
  
  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    test('should verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(password, hash);
      const isInvalid = await PasswordService.verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',      // No uppercase, numbers, symbols
        'PASSWORD',      // No lowercase, numbers, symbols
        '12345678',      // No letters, symbols
        'Pass123',       // Too short
        'Password123'    // No symbols
      ];

      for (const weakPassword of weakPasswords) {
        await expect(PasswordService.hashPassword(weakPassword))
          .rejects
          .toThrow();
      }
    });

    test('should generate secure random passwords', () => {
      const password1 = PasswordService.generateSecurePassword();
      const password2 = PasswordService.generateSecurePassword();
      
      expect(password1).not.toBe(password2);
      expect(password1.length).toBe(16);
      
      // Should contain required character types
      expect(password1).toMatch(/[A-Z]/); // Uppercase
      expect(password1).toMatch(/[a-z]/); // Lowercase
      expect(password1).toMatch(/[0-9]/); // Number
      expect(password1).toMatch(/[^A-Za-z0-9]/); // Special character
    });
  });

  describe('JWT Authentication', () => {
    test('should generate and verify access tokens', () => {
      const payload = { userId: '123', username: 'testuser', role: 'user' };
      const token = JWTService.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded).toEqual(payload);
    });

    test('should generate and verify refresh tokens', () => {
      const payload = { userId: '123' };
      const token = JWTService.generateRefreshToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = JWTService.verifyRefreshToken(token);
      expect(decoded).toEqual(payload);
    });

    test('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      
      const accessResult = JWTService.verifyAccessToken(invalidToken);
      const refreshResult = JWTService.verifyRefreshToken(invalidToken);
      
      expect(accessResult).toBeNull();
      expect(refreshResult).toBeNull();
    });

    test('should get token expiry correctly', () => {
      const payload = { userId: '123', username: 'testuser', role: 'user' };
      const token = JWTService.generateAccessToken(payload);
      
      const expiry = JWTService.getTokenExpiry(token);
      
      expect(expiry).toBeGreaterThan(Date.now());
      expect(expiry).toBeLessThan(Date.now() + 16 * 60 * 1000); // Less than 16 minutes
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize strings properly', () => {
      const maliciousInput = '<script>alert("xss")</script>hello@email.com';
      const sanitized = InputSanitizer.sanitizeString(maliciousInput);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('script');
    });

    test('should sanitize emails', () => {
      const validEmail = '  TEST@EMAIL.COM  ';
      const sanitized = InputSanitizer.sanitizeEmail(validEmail);
      
      expect(sanitized).toBe('test@email.com');
    });

    test('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        '@invalid.com',
        'test@',
        'test..test@email.com'
      ];

      for (const email of invalidEmails) {
        expect(() => InputSanitizer.sanitizeEmail(email)).toThrow();
      }
    });

    test('should sanitize usernames', () => {
      const username = '  TestUser123  ';
      const sanitized = InputSanitizer.sanitizeUsername(username);
      
      expect(sanitized).toBe('testuser123');
    });

    test('should sanitize numeric strings', () => {
      const numericInput = 'abc123.45def';
      const sanitized = InputSanitizer.sanitizeNumericString(numericInput);
      
      expect(sanitized).toBe('123.45');
    });
  });

  describe('Security Utils', () => {
    test('should generate secure random strings', () => {
      const str1 = SecurityUtils.generateSecureRandomString(32);
      const str2 = SecurityUtils.generateSecureRandomString(32);
      
      expect(str1).not.toBe(str2);
      expect(str1.length).toBe(32);
      expect(str2.length).toBe(32);
    });

    test('should validate password security', () => {
      const strongPassword = 'StrongPass123!';
      const weakPassword = 'weak';
      
      const strongResult = SecurityUtils.isSecurePassword(strongPassword);
      const weakResult = SecurityUtils.isSecurePassword(weakPassword);
      
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.errors.length).toBe(0);
      
      expect(weakResult.isValid).toBe(false);
      expect(weakResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Secure User Database', () => {
    test('should authenticate users with hashed passwords', async () => {
      await secureUserDatabase.initialize();
      
      // Try to authenticate with the admin user
      const result = await secureUserDatabase.authenticateUser('admin', 'Admin123!');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('admin');
      expect(result.user?.role).toBe('admin');
    });

    test('should reject invalid credentials', async () => {
      await secureUserDatabase.initialize();
      
      const result = await secureUserDatabase.authenticateUser('admin', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.user).toBeUndefined();
    });

    test('should lock accounts after failed attempts', async () => {
      await secureUserDatabase.initialize();
      
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await secureUserDatabase.authenticateUser('admin', 'wrongpassword');
      }
      
      // 6th attempt should be locked
      const result = await secureUserDatabase.authenticateUser('admin', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });

    test('should create new users with hashed passwords', async () => {
      await secureUserDatabase.initialize();
      
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'NewUser123!',
        role: 'basic' as const
      };
      
      const result = await secureUserDatabase.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('newuser');
      expect(result.user?.email).toBe('newuser@test.com');
    });

    test('should reject duplicate usernames/emails', async () => {
      await secureUserDatabase.initialize();
      
      const userData = {
        username: 'admin', // Already exists
        email: 'admin@test.com',
        password: 'NewUser123!',
        role: 'basic' as const
      };
      
      const result = await secureUserDatabase.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });
});

// Integration test for API authentication
describe('API Security Integration', () => {
  test('should protect API routes with rate limiting', async () => {
    // This would be an integration test with actual API calls
    // For now, just test the rate limiting logic
    const { RateLimitService } = require('../auth');
    
    const key = 'test-key';
    const maxRequests = 5;
    const windowMs = 60000; // 1 minute
    
    // Make 5 requests (should be allowed)
    for (let i = 0; i < 5; i++) {
      const result = RateLimitService.checkRateLimit(key, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
    }
    
    // 6th request should be blocked
    const blocked = RateLimitService.checkRateLimit(key, maxRequests, windowMs);
    expect(blocked.allowed).toBe(false);
  });
});

// Helper function to run all security tests
export async function runSecurityTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; error?: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Password Hashing Security',
      test: async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordService.hashPassword(password);
        const isValid = await PasswordService.verifyPassword(password, hash);
        if (!isValid) throw new Error('Password verification failed');
      }
    },
    {
      name: 'JWT Token Security',
      test: async () => {
        const payload = { userId: '123', username: 'test', role: 'user' };
        const token = JWTService.generateAccessToken(payload);
        const decoded = JWTService.verifyAccessToken(token);
        if (!decoded || decoded.userId !== payload.userId) {
          throw new Error('JWT verification failed');
        }
      }
    },
    {
      name: 'Input Sanitization',
      test: async () => {
        const malicious = '<script>alert("xss")</script>';
        const sanitized = InputSanitizer.sanitizeString(malicious);
        if (sanitized.includes('<script>')) {
          throw new Error('XSS sanitization failed');
        }
      }
    },
    {
      name: 'User Authentication',
      test: async () => {
        await secureUserDatabase.initialize();
        const result = await secureUserDatabase.authenticateUser('admin', 'Admin123!');
        if (!result.success) {
          throw new Error('User authentication failed');
        }
      }
    }
  ];

  for (const { name, test } of tests) {
    try {
      await test();
      results.push({ test: name, passed: true });
      passed++;
    } catch (error: any) {
      results.push({ test: name, passed: false, error: error.message });
      failed++;
    }
  }

  return { passed, failed, results };
}