import { NextApiRequest, NextApiResponse } from 'next';
import { handleSimpleCSRFTokenRequest } from '@/lib/middleware/simpleCSRF';

/**
 * CSRF Token API Endpoint
 * GET /api/auth/csrf
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handleSimpleCSRFTokenRequest(req, res);
}