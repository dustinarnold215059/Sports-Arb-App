/**
 * CSRF Token Generation Endpoint
 * Provides CSRF tokens for client-side forms and AJAX requests
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { handleCSRFTokenRequest } from '@/lib/middleware/csrf';
import { logRequest, createEndpointLogger } from '@/lib/middleware/logging';

const logger = createEndpointLogger('CSRF-TOKEN');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log the request
  await logRequest(req, res);

  try {
    logger.info(`CSRF token request from ${req.headers['user-agent']}`);
    
    // Handle CSRF token generation
    await handleCSRFTokenRequest(req, res);
    
  } catch (error) {
    logger.error('CSRF token generation failed', error as Error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate CSRF token'
    });
  }
}