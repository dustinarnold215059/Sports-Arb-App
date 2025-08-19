import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to test individual API calls
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sport = searchParams.get('sport') || 'basketball_nba';
  const markets = searchParams.get('markets') || 'h2h';
  const bookmakers = searchParams.get('bookmakers') || 'draftkings,fanduel,betmgm';
  
  const apiKey = process.env.NEXT_PUBLIC_ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || '7f0bd24ef41d31ae6fd09082bc36d3bb';
  
  if (!apiKey || apiKey === 'your-api-key-here') {
    return NextResponse.json({ 
      error: 'API key not configured',
      debug: {
        hasEnvKey: !!process.env.NEXT_PUBLIC_ODDS_API_KEY,
        hasAltKey: !!process.env.NEXT_PUBLIC_THE_ODDS_API_KEY,
        keyLength: apiKey?.length
      }
    }, { status: 500 });
  }

  // Build URL with minimal parameters
  let url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/` +
    `?apiKey=${apiKey}` +
    `&regions=us`;
  
  if (markets && markets !== 'none') {
    url += `&markets=${markets}`;
  }
  
  if (bookmakers && bookmakers !== 'none') {
    url += `&bookmakers=${bookmakers}`;
  }
  
  url += `&oddsFormat=american` +
    `&dateFormat=iso` +
    `&commenceTimeFrom=${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}` +
    `&commenceTimeTo=${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')}`;

  console.log('🔍 Debug API call:', {
    sport,
    markets: markets || 'none',
    bookmakers: bookmakers || 'none',
    url: url.replace(apiKey, 'HIDDEN')
  });

  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SportsArb-Debug/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    console.log('🔍 Debug response:', {
      status: response.status,
      responseTime: `${responseTime}ms`,
      dataType: Array.isArray(data) ? `array[${data.length}]` : typeof data,
      remaining: response.headers.get('X-Requests-Remaining')
    });

    return NextResponse.json({
      debug: {
        sport,
        markets: markets || 'none',
        bookmakers: bookmakers || 'none', 
        url: url.replace(apiKey, 'HIDDEN'),
        status: response.status,
        responseTime: `${responseTime}ms`,
        remaining: response.headers.get('X-Requests-Remaining'),
        used: response.headers.get('X-Requests-Used')
      },
      success: response.ok,
      data: response.ok ? data : null,
      error: !response.ok ? {
        status: response.status,
        message: data?.message || responseText
      } : null
    });
    
  } catch (error: any) {
    console.error('🔍 Debug API error:', error);
    
    return NextResponse.json({
      debug: {
        sport,
        markets: markets || 'none',
        bookmakers: bookmakers || 'none',
        url: url.replace(apiKey, 'HIDDEN')
      },
      success: false,
      error: {
        message: error.message,
        type: error.name
      }
    }, { status: 500 });
  }
}