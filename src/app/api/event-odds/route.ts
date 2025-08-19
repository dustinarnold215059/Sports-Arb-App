import { NextRequest, NextResponse } from 'next/server';

// Event-specific odds API route for detailed player props and additional markets
const EVENT_API_CONFIG = {
  BASE_URL: 'https://api.the-odds-api.com/v4',
  API_KEY: process.env.NEXT_PUBLIC_ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || 'b8fe6dead67058775bb5ae595cc57b94',
  REGIONS: 'us',
  // Comprehensive markets for detailed event data
  MARKETS: 'h2h,spreads,totals,outrights,btts,draw_no_bet,team_totals,alternate_spreads,alternate_totals,player_props',
  ODDS_FORMAT: 'american',
  DATE_FORMAT: 'iso',
  BOOKMAKERS: 'draftkings,fanduel,betmgm,caesars,pointsbet,betrivers'
};

// Sport-specific player props configurations
const SPORT_PLAYER_PROPS: Record<string, string[]> = {
  // NFL/College Football
  'americanfootball_nfl': [
    'player_pass_yds', 'player_pass_tds', 'player_pass_completions', 'player_pass_attempts', 'player_pass_interceptions',
    'player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_rush_longest',
    'player_rec_yds', 'player_receptions', 'player_rec_tds', 'player_rec_longest'
  ],
  'americanfootball_ncaaf': [
    'player_pass_yds', 'player_pass_tds', 'player_rush_yds', 'player_rec_yds', 'player_receptions'
  ],
  
  // Basketball
  'basketball_nba': [
    'player_points', 'player_rebounds', 'player_assists', 'player_steals', 'player_blocks', 'player_turnovers',
    'player_threes', 'player_field_goals', 'player_free_throws', 'player_double_double', 'player_triple_double'
  ],
  'basketball_ncaab': [
    'player_points', 'player_rebounds', 'player_assists', 'player_threes'
  ],
  'basketball_wnba': [
    'player_points', 'player_rebounds', 'player_assists', 'player_threes'
  ],
  
  // Baseball
  'baseball_mlb': [
    'player_hits', 'player_home_runs', 'player_rbis', 'player_runs', 'player_total_bases', 'player_stolen_bases',
    'player_strikeouts_pitcher', 'player_walks_pitcher', 'player_earned_runs', 'player_innings_pitched'
  ],
  
  // Hockey
  'icehockey_nhl': [
    'player_goals', 'player_assists', 'player_points', 'player_shots_on_goal', 'player_saves', 'player_goals_against'
  ],
  
  // Soccer
  'soccer_epl': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target', 'player_cards_yellow', 'player_cards_red'
  ],
  'soccer_spain_la_liga': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target', 'player_cards_yellow'
  ],
  'soccer_germany_bundesliga': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target'
  ],
  'soccer_italy_serie_a': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target'
  ],
  'soccer_france_ligue_one': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target'
  ],
  'soccer_usa_mls': [
    'player_goals', 'player_assists', 'player_shots', 'player_shots_on_target'
  ],
  
  // AFL
  'aussierules_afl': [
    'player_disposals', 'player_goals', 'player_tackles', 'player_marks', 'player_fantasy_points'
  ],
  
  // NRL
  'rugbyleague_nrl': [
    'player_tries', 'player_goals', 'player_tackles', 'player_runs', 'player_fantasy_points'
  ]
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get('eventId');
  const sport = searchParams.get('sport') || 'basketball_nba';
  const includePlayerProps = searchParams.get('playerProps') === 'true';
  
  if (!eventId) {
    return NextResponse.json({ 
      error: 'Event ID is required', 
      usage: 'GET /api/event-odds?eventId=GAME_ID&sport=SPORT_KEY&playerProps=true'
    }, { status: 400 });
  }
  
  try {
    const apiKey = EVENT_API_CONFIG.API_KEY;
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json({ 
        error: 'API key not configured', 
        eventId,
        sport
      }, { status: 500 });
    }

    // Build the event-specific URL
    let markets = EVENT_API_CONFIG.MARKETS;
    
    // If player props are requested and sport supports them, include all available props
    if (includePlayerProps && SPORT_PLAYER_PROPS[sport]) {
      const sportProps = SPORT_PLAYER_PROPS[sport].join(',');
      markets = `${EVENT_API_CONFIG.MARKETS},${sportProps}`;
    }

    const url = `${EVENT_API_CONFIG.BASE_URL}/sports/${sport}/events/${eventId}/odds/` +
      `?apiKey=${apiKey}` +
      `&regions=${EVENT_API_CONFIG.REGIONS}` +
      `&markets=${markets}` +
      `&oddsFormat=${EVENT_API_CONFIG.ODDS_FORMAT}` +
      `&dateFormat=${EVENT_API_CONFIG.DATE_FORMAT}` +
      `&bookmakers=${EVENT_API_CONFIG.BOOKMAKERS}`;

    console.log('🎯 Event-specific API call:', {
      eventId,
      sport,
      markets: markets.split(',').length,
      playerPropsRequested: includePlayerProps,
      sportSupportsProps: !!SPORT_PLAYER_PROPS[sport]
    });

    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SportsArb-EventOdds/1.0',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      signal: AbortSignal.timeout(20000) // 20 second timeout for detailed data
    });

    const responseTime = Date.now() - startTime;
    console.log(`⚡ Event API response time: ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('❌ Event API Error:', {
        status: response.status,
        eventId,
        sport,
        error: errorData
      });
      
      let errorMessage = `Event API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = '🔑 UNAUTHORIZED - API key lacks permissions for event odds';
      } else if (response.status === 404) {
        errorMessage = `Event not found: ${eventId} in sport ${sport}`;
      } else if (response.status === 422) {
        errorMessage = `🚫 INVALID PARAMETERS\n\nThe request parameters are invalid for event: ${eventId}\n\nPossible Issues:\n• Event may have ended or been cancelled\n• Unsupported markets for this sport\n• Invalid bookmaker combinations\n\nAPI Response: ${errorData?.message || errorText}`;
      } else if (response.status === 429) {
        const remainingRequests = response.headers.get('X-Requests-Remaining');
        errorMessage = `🚫 OUT OF API REQUESTS\n\nAPI quota exceeded.\n\nStatus:\n• Remaining: ${remainingRequests || '0'}\n• This was a detailed event call with player props\n\nActions:\n• Wait for quota reset\n• Upgrade plan at https://the-odds-api.com/`;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        eventId,
        sport,
        apiUsage: {
          remainingRequests: response.headers.get('X-Requests-Remaining'),
          requestsUsed: response.headers.get('X-Requests-Used')
        }
      }, { status: response.status });
    }

    const data = await response.json();
    const remainingRequests = response.headers.get('X-Requests-Remaining');
    const requestsUsed = response.headers.get('X-Requests-Used');
    
    // Process the detailed event data
    const processedData = processEventOddsData(data, sport, includePlayerProps);
    
    console.log('✅ Event odds processed:', {
      eventId,
      sport,
      totalMarkets: processedData.totalMarkets,
      playerPropsFound: processedData.playerPropsCount,
      bookmakersCovered: processedData.bookmakersCovered,
      responseTime: `${responseTime}ms`,
      remaining: remainingRequests
    });
    
    return NextResponse.json({
      ...processedData,
      eventId,
      sport,
      generated_at: new Date().toISOString(),
      apiUsage: {
        remainingRequests: remainingRequests,
        requestsUsed: requestsUsed,
        responseTime: responseTime,
        endpoint: 'event-specific'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Event API error:', error);
    
    return NextResponse.json({ 
      error: `Event odds fetch failed: ${error.message}`,
      eventId,
      sport,
      generated_at: new Date().toISOString()
    }, { status: 500 });
  }
}

// Process detailed event odds data with player props
function processEventOddsData(rawData: any, sport: string, includePlayerProps: boolean) {
  if (!rawData || typeof rawData !== 'object') {
    return {
      event: null,
      markets: {},
      playerProps: {},
      totalMarkets: 0,
      playerPropsCount: 0,
      bookmakersCovered: 0
    };
  }

  const processedEvent = {
    id: rawData.id,
    sport_key: rawData.sport_key,
    sport_title: rawData.sport_title,
    commence_time: rawData.commence_time,
    home_team: rawData.home_team,
    away_team: rawData.away_team,
    bookmakers: rawData.bookmakers || []
  };

  // Organize all markets by type
  const organizedMarkets: Record<string, any> = {
    moneyline: {},
    spreads: {},
    totals: {},
    outrights: {},
    btts: {},
    draw_no_bet: {},
    team_totals: {},
    alternate_spreads: {},
    alternate_totals: {}
  };

  const playerProps: Record<string, any> = {};
  
  let totalMarkets = 0;
  let playerPropsCount = 0;
  const bookmakerSet = new Set();

  // Process each bookmaker's markets
  processedEvent.bookmakers.forEach((bookmaker: any) => {
    bookmakerSet.add(bookmaker.key);
    totalMarkets += bookmaker.markets?.length || 0;

    bookmaker.markets?.forEach((market: any) => {
      const marketKey = market.key;
      
      // Handle player props separately
      if (marketKey.startsWith('player_') && includePlayerProps) {
        if (!playerProps[marketKey]) {
          playerProps[marketKey] = {
            marketName: marketKey,
            description: getPlayerPropDescription(marketKey, sport),
            bookmakers: {}
          };
        }
        
        playerProps[marketKey].bookmakers[bookmaker.key] = {
          bookmaker: bookmaker.title,
          outcomes: market.outcomes || [],
          last_update: bookmaker.last_update
        };
        
        playerPropsCount++;
      } else {
        // Handle standard markets
        if (organizedMarkets[marketKey]) {
          organizedMarkets[marketKey][bookmaker.key] = {
            bookmaker: bookmaker.title,
            outcomes: market.outcomes || [],
            last_update: bookmaker.last_update
          };
        }
      }
    });
  });

  return {
    event: processedEvent,
    markets: organizedMarkets,
    playerProps: playerProps,
    totalMarkets,
    playerPropsCount,
    bookmakersCovered: bookmakerSet.size,
    summary: {
      standardMarkets: Object.keys(organizedMarkets).filter(key => 
        Object.keys(organizedMarkets[key]).length > 0
      ).length,
      playerPropsMarkets: Object.keys(playerProps).length,
      bookmakerDiversity: bookmakerSet.size,
      dataCompleteness: totalMarkets > 0 ? 1 : 0
    }
  };
}

// Get human-readable description for player props
function getPlayerPropDescription(propKey: string, sport: string): string {
  const descriptions: Record<string, string> = {
    // Football
    'player_pass_yds': 'Passing Yards',
    'player_pass_tds': 'Passing Touchdowns', 
    'player_pass_completions': 'Pass Completions',
    'player_pass_attempts': 'Pass Attempts',
    'player_pass_interceptions': 'Interceptions Thrown',
    'player_rush_yds': 'Rushing Yards',
    'player_rush_tds': 'Rushing Touchdowns',
    'player_rush_attempts': 'Rushing Attempts',
    'player_rush_longest': 'Longest Rush',
    'player_rec_yds': 'Receiving Yards',
    'player_receptions': 'Receptions',
    'player_rec_tds': 'Receiving Touchdowns',
    'player_rec_longest': 'Longest Reception',
    
    // Basketball
    'player_points': 'Points Scored',
    'player_rebounds': 'Total Rebounds',
    'player_assists': 'Assists',
    'player_steals': 'Steals',
    'player_blocks': 'Blocks',
    'player_turnovers': 'Turnovers',
    'player_threes': '3-Point Field Goals Made',
    'player_field_goals': 'Field Goals Made',
    'player_free_throws': 'Free Throws Made',
    'player_double_double': 'Double-Double',
    'player_triple_double': 'Triple-Double',
    
    // Baseball
    'player_hits': 'Hits',
    'player_home_runs': 'Home Runs',
    'player_rbis': 'RBIs',
    'player_runs': 'Runs Scored',
    'player_total_bases': 'Total Bases',
    'player_stolen_bases': 'Stolen Bases',
    'player_strikeouts_pitcher': 'Strikeouts (Pitcher)',
    'player_walks_pitcher': 'Walks Allowed (Pitcher)',
    'player_earned_runs': 'Earned Runs Allowed',
    'player_innings_pitched': 'Innings Pitched',
    
    // Hockey
    'player_goals': 'Goals',
    'player_assists': 'Assists',
    'player_points': 'Points (Goals + Assists)',
    'player_shots_on_goal': 'Shots on Goal',
    'player_saves': 'Saves (Goalie)',
    'player_goals_against': 'Goals Against (Goalie)',
    
    // Soccer
    'player_shots': 'Shots',
    'player_shots_on_target': 'Shots on Target',
    'player_cards_yellow': 'Yellow Cards',
    'player_cards_red': 'Red Cards',
    
    // AFL/NRL
    'player_disposals': 'Disposals',
    'player_tackles': 'Tackles',
    'player_marks': 'Marks',
    'player_tries': 'Tries',
    'player_runs': 'Runs',
    'player_fantasy_points': 'Fantasy Points'
  };

  return descriptions[propKey] || propKey.replace('player_', '').replace(/_/g, ' ').toUpperCase();
}