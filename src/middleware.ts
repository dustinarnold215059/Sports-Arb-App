import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders, addCorsHeaders } from '@/lib/security/middleware';

export function middleware(request: NextRequest) {
  // Create response
  let response = NextResponse.next();

  // Add security headers to all responses
  response = addSecurityHeaders(response);

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response = addCorsHeaders(response, request);
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/api/admin/auth')) {
    // Check for authentication cookie or redirect to login
    const hasAuth = request.cookies.has('refreshToken') || request.headers.get('authorization');
    
    if (!hasAuth) {
      // Redirect to admin login
      const loginUrl = new URL('/admin', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Security logging for sensitive endpoints
  if (request.nextUrl.pathname.startsWith('/api/admin/') || 
      request.nextUrl.pathname.startsWith('/api/auth/')) {
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`[SECURITY] ${request.method} ${request.nextUrl.pathname} from IP: ${clientIP}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};