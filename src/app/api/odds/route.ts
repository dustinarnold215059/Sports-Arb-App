import { NextRequest, NextResponse } from 'next/server';
import { EnvManager } from '@/lib/security/env';
import { RateLimitService, SecurityUtils } from '@/lib/security/auth';
import { addSecurityHeaders } from '@/lib/security/middleware';

const THE_ODDS_API_CONFIG = {
  BASE_URL: process.env.THE_ODDS_API_BASE_URL || 'https://api.the-odds-api.com/v4',
  REGIONS: 'us', // US bookmakers
  MARKETS: 'h2h,spreads,totals', // head-to-head, spreads, totals
  ODDS_FORMAT: 'american', // American odds format
  DATE_FORMAT: 'iso'
};

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = SecurityUtils.getClientIP(request);
    const rateLimitKey = `odds_api:${clientIP}`;
    const rateLimit = RateLimitService.checkRateLimit(rateLimitKey, 30, 60 * 1000); // 30 requests per minute

    if (!rateLimit.allowed) {
      const response = NextResponse.json({
        error: 'Rate limit exceeded for odds API',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, { status: 429 });
      
      return addSecurityHeaders(response);
    }

    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get('sport') || 'basketball_nba';
    
    // Input validation
    const allowedSports = [
      'basketball_nba', 'americanfootball_nfl', 'baseball_mlb', 
      'icehockey_nhl', 'soccer_epl', 'tennis_atp'
    ];
    
    if (!allowedSports.includes(sport)) {
      const response = NextResponse.json({ 
        error: 'Invalid sport parameter',
        allowed: allowedSports 
      }, { status: 400 });
      
      return addSecurityHeaders(response);
    }

    // Get API key securely
    const apiKey = EnvManager.getOddsAPIKey();
    
    if (!apiKey) {
      EnvManager.log('error', 'The Odds API key not configured');
      const response = NextResponse.json({ 
        error: 'API configuration error' 
      }, { status: 500 });
      
      return addSecurityHeaders(response);
    }

    // Build secure API URL
    const url = new URL(`${THE_ODDS_API_CONFIG.BASE_URL}/sports/${sport}/odds/`);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('regions', THE_ODDS_API_CONFIG.REGIONS);
    url.searchParams.set('markets', THE_ODDS_API_CONFIG.MARKETS);
    url.searchParams.set('oddsFormat', THE_ODDS_API_CONFIG.ODDS_FORMAT);
    url.searchParams.set('dateFormat', THE_ODDS_API_CONFIG.DATE_FORMAT);

    EnvManager.log('info', 'Server-side API call to The Odds API', { sport });
    EnvManager.log('debug', 'API URL (key hidden)', url.toString().replace(apiKey, '[HIDDEN]'));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SportsArb/1.0'
      },
    });

    console.log('📡 The Odds API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('The Odds API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        remainingRequests: response.headers.get('X-Requests-Remaining'),
        requestsUsed: response.headers.get('X-Requests-Used')
      });
      
      let errorMessage = `The Odds API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = '🔑 UNAUTHORIZED ACCESS\n\nYour API key lacks permission for odds data.\n\nThe Odds API Status:\n• Your key can list sports but cannot access odds\n• This usually means you need a paid plan\n\nSolutions:\n• Upgrade your plan at https://the-odds-api.com/\n• Check if your free trial has expired\n• Verify your account has payment info';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden - check The Odds API key permissions';
      } else if (response.status === 404) {
        errorMessage = `Sport not found: ${sport}`;
      } else if (response.status === 422) {
        errorMessage = 'Invalid parameters for The Odds API';
      } else if (response.status === 429) {
        // Check if it's rate limit exceeded
        const remainingRequests = response.headers.get('X-Requests-Remaining');
        const requestsUsed = response.headers.get('X-Requests-Used');
        
        if (remainingRequests === '0' || errorText.includes('quota') || errorText.includes('limit')) {
          errorMessage = `🚫 OUT OF API REQUESTS\n\nYou have used all your API requests for this period.\n\nThe Odds API Status:\n• Requests Used: ${requestsUsed || 'Unknown'}\n• Requests Remaining: ${remainingRequests || '0'}\n\nWhat to do:\n• Wait for your quota to reset (monthly)\n• Upgrade your plan at https://the-odds-api.com/\n• Check your usage at The Odds API dashboard`;
        } else {
          errorMessage = 'Rate limit exceeded - too many requests per second';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        isRateLimit: response.status === 429,
        remainingRequests: response.headers.get('X-Requests-Remaining'),
        requestsUsed: response.headers.get('X-Requests-Used')
      }, { status: response.status });
    }

    const data = await response.json();
    const remainingRequests = response.headers.get('X-Requests-Remaining');
    const requestsUsed = response.headers.get('X-Requests-Used');
    
    console.log('✅ The Odds API Response received');
    console.log('📊 Games with odds in response:', data.length || 0);
    console.log('📈 API Usage - Remaining:', remainingRequests, 'Used:', requestsUsed);
    
    // The Odds API returns array directly, transform to expected format
    const transformedData = {
      games: data || [],
      sport: sport,
      generated_at: new Date().toISOString(),
      apiUsage: {
        remainingRequests: remainingRequests,
        requestsUsed: requestsUsed
      }
    };
    
    return NextResponse.json(transformedData);
    
  } catch (error: any) {
    console.error('❌ The Odds API proxy error:', error);
    return NextResponse.json({ 
      error: `Failed to fetch odds data from The Odds API: ${error.message}` 
    }, { status: 500 });
  }
}