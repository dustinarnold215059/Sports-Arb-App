import { NextApiRequest, NextApiResponse } from 'next';
import { handleVercelCSRFTokenRequest } from '@/lib/middleware/vercelCSRF';

/**
 * CSRF Token API Endpoint
 * GET /api/auth/csrf
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handleVercelCSRFTokenRequest(req, res);
}