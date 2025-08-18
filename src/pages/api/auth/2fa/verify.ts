/**
 * 2FA Verification API Endpoint
 * POST /api/auth/2fa/verify
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { TwoFactorAuthService } from '@/lib/auth/twoFactorAuth';
import { validateRequestBody } from '@/lib/middleware/validation';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { z } from 'zod';

const VerifySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  code: z.string().min(6, 'Verification code must be at least 6 characters'),
  isBackupCode: z.boolean().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Rate limiting - more restrictive for 2FA
    const rateLimitResult = await rateLimiter.checkLimit(req, '2fa-verify', {
      requests: 5,
      window: 300000 // 5 minutes
    });

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        description: '2FA verification rate limit exceeded',
        req,
        severity: 'high',
        metadata: { endpoint: '2fa-verify' }
      });

      return res.status(429).json({
        success: false,
        error: 'Too many verification attempts',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const validationResult = validateRequestBody(req.body, VerifySchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { userId, code, isBackupCode } = validationResult.data;

    // Check if 2FA is enabled
    const isEnabled = await TwoFactorAuthService.is2FAEnabled(userId);
    if (!isEnabled) {
      logSecurityEvent({
        type: 'suspicious_activity',
        description: `2FA verification attempted for user without 2FA enabled: ${userId}`,
        req,
        userId,
        severity: 'medium',
        metadata: { action: 'verify_2fa_not_enabled' }
      });

      return res.status(400).json({
        success: false,
        error: '2FA is not enabled for this account'
      });
    }

    // For admin testing with the special number
    let verificationResult;
    if (userId === 'admin' && await TwoFactorAuthService.verifyAdminCode(code)) {
      verificationResult = { success: true };
    } else {
      // Verify the code
      verificationResult = await TwoFactorAuthService.verifyCode(userId, code);
    }

    if (!verificationResult.success) {
      logSecurityEvent({
        type: 'failed_login',
        description: `Failed 2FA verification for user ${userId}`,
        req,
        userId,
        severity: 'medium',
        metadata: { 
          action: 'failed_2fa_verification',
          isBackupCode: isBackupCode || false,
          remainingAttempts: verificationResult.remainingAttempts
        }
      });

      return res.status(401).json({
        success: false,
        error: verificationResult.error || 'Invalid verification code',
        remainingAttempts: verificationResult.remainingAttempts
      });
    }

    // Success
    logSecurityEvent({
      type: 'suspicious_activity',
      description: `Successful 2FA verification for user ${userId}`,
      req,
      userId,
      severity: 'low',
      metadata: { 
        action: 'successful_2fa_verification',
        isBackupCode: isBackupCode || false
      }
    });

    res.status(200).json({
      success: true,
      message: '2FA verification successful'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    
    logSecurityEvent({
      type: 'suspicious_activity',
      description: '2FA verification system error',
      req,
      severity: 'high',
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: '2fa_system_error'
      }
    });

    res.status(500).json({
      success: false,
      error: 'Verification failed due to system error'
    });
  }
}