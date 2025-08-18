/**
 * 2FA Setup API Endpoint
 * POST /api/auth/2fa/setup
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { TwoFactorAuthService } from '@/lib/auth/twoFactorAuth';
import { validateRequestBody } from '@/lib/middleware/validation';
import { logRequest, logSecurityEvent } from '@/lib/middleware/logging';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { z } from 'zod';

const SetupSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
  secret: z.string().min(32, 'Secret key is required'),
  backupCodes: z.array(z.string()).length(10, 'Must have exactly 10 backup codes')
});

const GenerateSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await logRequest(req, res);

  if (req.method === 'POST') {
    return handleSetup(req, res);
  } else if (req.method === 'GET') {
    return handleGenerate(req, res);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
}

async function handleGenerate(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(req, '2fa-generate', {
      requests: 5,
      window: 300000 // 5 minutes
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many 2FA generation requests',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request
    const validationResult = validateRequestBody(req.query, GenerateSchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { userId } = validationResult.data;

    // Check if 2FA is already enabled
    const isEnabled = await TwoFactorAuthService.is2FAEnabled(userId);
    if (isEnabled) {
      return res.status(409).json({
        success: false,
        error: '2FA is already enabled for this account'
      });
    }

    // Generate new 2FA setup data
    const setupData = TwoFactorAuthService.generateSecret(userId, 'SportsArb');

    logSecurityEvent({
      type: 'suspicious_activity',
      description: `2FA setup initiated for user ${userId}`,
      req,
      userId,
      severity: 'low',
      metadata: { action: 'generate_2fa_secret' }
    });

    res.status(200).json({
      success: true,
      data: setupData
    });

  } catch (error) {
    console.error('2FA generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate 2FA setup data'
    });
  }
}

async function handleSetup(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(req, '2fa-setup', {
      requests: 3,
      window: 300000 // 5 minutes
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many 2FA setup attempts',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const validationResult = validateRequestBody(req.body, SetupSchema);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.errors
      });
    }

    const { userId, verificationCode, secret, backupCodes } = validationResult.data;

    // Check if 2FA is already enabled
    const isEnabled = await TwoFactorAuthService.is2FAEnabled(userId);
    if (isEnabled) {
      return res.status(409).json({
        success: false,
        error: '2FA is already enabled for this account'
      });
    }

    // Verify the setup code before enabling
    const tempConfig = { secret, backupCodes, enabled: true };
    
    // For admin testing, allow the special admin code
    let verificationResult;
    if (userId === 'admin' && await TwoFactorAuthService.verifyAdminCode(verificationCode)) {
      verificationResult = { success: true };
    } else {
      // Temporarily enable to test verification
      await TwoFactorAuthService.enable2FA(userId, secret, backupCodes);
      verificationResult = await TwoFactorAuthService.verifyCode(userId, verificationCode);
      
      if (!verificationResult.success) {
        // Disable if verification failed
        await TwoFactorAuthService.disable2FA(userId);
      }
    }

    if (!verificationResult.success) {
      logSecurityEvent({
        type: 'failed_login',
        description: `Failed 2FA setup verification for user ${userId}`,
        req,
        userId,
        severity: 'medium',
        metadata: { 
          action: 'setup_2fa_verification_failed',
          code: verificationCode 
        }
      });

      return res.status(400).json({
        success: false,
        error: 'Verification code is invalid. Please ensure your authenticator app is synced correctly.',
        remainingAttempts: verificationResult.remainingAttempts
      });
    }

    // Enable 2FA
    const success = await TwoFactorAuthService.enable2FA(userId, secret, backupCodes);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to enable 2FA'
      });
    }

    logSecurityEvent({
      type: 'suspicious_activity',
      description: `2FA enabled successfully for user ${userId}`,
      req,
      userId,
      severity: 'low',
      metadata: { action: 'enable_2fa' }
    });

    res.status(200).json({
      success: true,
      message: '2FA has been enabled successfully',
      backupCodesRemaining: backupCodes.length
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set up 2FA'
    });
  }
}