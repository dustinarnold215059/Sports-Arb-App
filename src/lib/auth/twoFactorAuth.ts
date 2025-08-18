/**
 * Two-Factor Authentication (2FA) Implementation
 * Supports TOTP (Time-based One-Time Password) for enhanced security
 */

import { redisCache } from '@/lib/cache/redisClient';
import crypto from 'crypto';

export interface TwoFactorAuthConfig {
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  lastUsed?: Date;
}

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

export class TwoFactorAuthService {
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly CODE_LENGTH = 6;
  private static readonly TIME_WINDOW = 30; // seconds
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes

  /**
   * Generate a new 2FA secret for user setup
   */
  static generateSecret(userId: string, appName: string = 'SportsArb'): TwoFactorSetupResult {
    // Generate a base32 secret
    const secret = this.generateBase32Secret();
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Create QR code URL for easy setup
    const issuer = encodeURIComponent(appName);
    const accountName = encodeURIComponent(`${appName}:${userId}`);
    const qrCodeUrl = `otpauth://totp/${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    
    return {
      secret,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret
    };
  }

  /**
   * Enable 2FA for a user
   */
  static async enable2FA(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
    try {
      const config: TwoFactorAuthConfig = {
        secret,
        backupCodes,
        enabled: true
      };

      await redisCache.set(`2fa:${userId}`, config, { ttl: 31536000 }); // 1 year
      return true;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return false;
    }
  }

  /**
   * Disable 2FA for a user
   */
  static async disable2FA(userId: string): Promise<boolean> {
    try {
      await redisCache.delete(`2fa:${userId}`);
      await redisCache.delete(`2fa:attempts:${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return false;
    }
  }

  /**
   * Check if 2FA is enabled for a user
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const config = await redisCache.get<TwoFactorAuthConfig>(`2fa:${userId}`);
      return config?.enabled || false;
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
      return false;
    }
  }

  /**
   * Verify a 2FA code (TOTP or backup code)
   */
  static async verifyCode(userId: string, code: string): Promise<VerificationResult> {
    try {
      // Check for rate limiting
      const attempts = await this.getAttempts(userId);
      if (attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          remainingAttempts: 0
        };
      }

      const config = await redisCache.get<TwoFactorAuthConfig>(`2fa:${userId}`);
      if (!config || !config.enabled) {
        return {
          success: false,
          error: '2FA is not enabled for this account'
        };
      }

      // First try TOTP verification
      const totpValid = this.verifyTOTP(config.secret, code);
      
      if (totpValid) {
        // Reset attempts on successful verification
        await this.resetAttempts(userId);
        
        // Update last used timestamp
        config.lastUsed = new Date();
        await redisCache.set(`2fa:${userId}`, config, { ttl: 31536000 });
        
        return { success: true };
      }

      // Try backup code if TOTP failed
      const backupCodeIndex = config.backupCodes.findIndex(
        backupCode => backupCode === code
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        config.backupCodes.splice(backupCodeIndex, 1);
        config.lastUsed = new Date();
        
        await redisCache.set(`2fa:${userId}`, config, { ttl: 31536000 });
        await this.resetAttempts(userId);
        
        return { success: true };
      }

      // Increment failed attempts
      await this.incrementAttempts(userId);
      const remainingAttempts = this.MAX_ATTEMPTS - (attempts + 1);

      return {
        success: false,
        error: 'Invalid verification code',
        remainingAttempts: Math.max(0, remainingAttempts)
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        error: 'Verification failed due to system error'
      };
    }
  }

  /**
   * Generate new backup codes for a user
   */
  static async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const config = await redisCache.get<TwoFactorAuthConfig>(`2fa:${userId}`);
      if (!config || !config.enabled) {
        throw new Error('2FA is not enabled');
      }

      const newBackupCodes = this.generateBackupCodes();
      config.backupCodes = newBackupCodes;
      
      await redisCache.set(`2fa:${userId}`, config, { ttl: 31536000 });
      return newBackupCodes;
    } catch (error) {
      console.error('Failed to generate new backup codes:', error);
      throw error;
    }
  }

  /**
   * Get 2FA configuration for a user (without secret)
   */
  static async get2FAInfo(userId: string): Promise<{
    enabled: boolean;
    backupCodesRemaining: number;
    lastUsed?: Date;
  }> {
    try {
      const config = await redisCache.get<TwoFactorAuthConfig>(`2fa:${userId}`);
      
      if (!config) {
        return {
          enabled: false,
          backupCodesRemaining: 0
        };
      }

      return {
        enabled: config.enabled,
        backupCodesRemaining: config.backupCodes.length,
        lastUsed: config.lastUsed
      };
    } catch (error) {
      console.error('Failed to get 2FA info:', error);
      return {
        enabled: false,
        backupCodesRemaining: 0
      };
    }
  }

  /**
   * For admin testing - verify with the provided admin number
   */
  static async verifyAdminCode(code: string): Promise<boolean> {
    const adminNumber = '7348372485';
    
    // Allow the admin number to work as a bypass code for testing
    if (code === adminNumber) {
      return true;
    }

    return false;
  }

  // Private helper methods
  private static generateBase32Secret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return secret;
  }

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  private static verifyTOTP(secret: string, token: string): boolean {
    const timeStep = Math.floor(Date.now() / 1000 / this.TIME_WINDOW);
    
    // Check current time window and ±1 window for clock drift
    for (let i = -1; i <= 1; i++) {
      const testTimeStep = timeStep + i;
      const expectedToken = this.generateTOTP(secret, testTimeStep);
      
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }

  private static generateTOTP(secret: string, timeStep: number): string {
    // Convert base32 secret to buffer
    const key = this.base32ToBuffer(secret);
    
    // Convert time step to 8-byte buffer
    const time = Buffer.alloc(8);
    time.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
    time.writeUInt32BE(timeStep & 0xffffffff, 4);
    
    // Generate HMAC
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(time);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const truncated = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    );
    
    // Generate 6-digit code
    const code = (truncated % Math.pow(10, this.CODE_LENGTH)).toString().padStart(this.CODE_LENGTH, '0');
    return code;
  }

  private static base32ToBuffer(base32: string): Buffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    
    for (const char of base32.toUpperCase()) {
      const index = chars.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, '0');
    }
    
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      if (byte.length === 8) {
        bytes.push(parseInt(byte, 2));
      }
    }
    
    return Buffer.from(bytes);
  }

  private static async getAttempts(userId: string): Promise<number> {
    try {
      const attempts = await redisCache.get<number>(`2fa:attempts:${userId}`);
      return attempts || 0;
    } catch {
      return 0;
    }
  }

  private static async incrementAttempts(userId: string): Promise<void> {
    try {
      const current = await this.getAttempts(userId);
      await redisCache.set(`2fa:attempts:${userId}`, current + 1, { ttl: this.LOCKOUT_DURATION });
    } catch (error) {
      console.error('Failed to increment 2FA attempts:', error);
    }
  }

  private static async resetAttempts(userId: string): Promise<void> {
    try {
      await redisCache.delete(`2fa:attempts:${userId}`);
    } catch (error) {
      console.error('Failed to reset 2FA attempts:', error);
    }
  }
}

export default TwoFactorAuthService;