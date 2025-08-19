import { NextRequest, NextResponse } from 'next/server';

// ULTRA-OPTIMIZED API route with maximum data extraction per call
const OPTIMIZED_CONFIG = {
  BASE_URL: 'https://api.the-odds-api.com/v4',
  API_KEY: process.env.NEXT_PUBLIC_ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || '7f0bd24ef41d31ae6fd09082bc36d3bb',
  REGIONS: 'us',
  MARKETS_FULL: 'h2h,spreads,totals,outrights,btts,draw_no_bet,team_totals,alternate_spreads,alternate_totals,player_props', // All bet types for maximum arbitrage opportunities
  MARKETS_FALLBACK: 'h2h,spreads,totals', // Fallback markets that work for all sports
  ODDS_FORMAT: 'american',
  DATE_FORMAT: 'iso',
  // CRITICAL OPTIMIZATION: Only request major bookmakers to reduce payload size
  BOOKMAKERS: 'draftkings,fanduel,betmgm,caesars,pointsbet,betrivers' // Reliable major bookmakers
};

// Start with very conservative sport-specific market configurations
// Many sports may be out of season or have limited markets available
const SPORT_MARKET_CONFIG: Record<string, string> = {
  'americanfootball_nfl': 'h2h,spreads,totals',
  'americanfootball_ncaaf': 'h2h,spreads,totals',
  'basketball_nba': 'h2h,spreads,totals',
  'basketball_ncaab': 'h2h,spreads,totals',
  'baseball_mlb': 'h2h,spreads,totals',
  'icehockey_nhl': 'h2h,spreads,totals',
  'soccer_epl': 'h2h',
  'soccer_spain_la_liga': 'h2h',
  'soccer_usa_mls': 'h2h',
  'mma_mixed_martial_arts': 'h2h',
  'tennis_wta': 'h2h',
  'tennis_atp': 'h2h'
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sport = searchParams.get('sport') || 'basketball_nba';
  
  try {
    const apiKey = OPTIMIZED_CONFIG.API_KEY;
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json({ 
        error: 'API key not configured', 
        games: [],
        sport,
        generated_at: new Date().toISOString()
      }, { status: 500 });
    }

    // OPTIMIZATION 1: Use sport-specific markets for better compatibility
    const markets = SPORT_MARKET_CONFIG[sport] || OPTIMIZED_CONFIG.MARKETS_FALLBACK;
    
    const url = `${OPTIMIZED_CONFIG.BASE_URL}/sports/${sport}/odds/` +
      `?apiKey=${apiKey}` +
      `&regions=${OPTIMIZED_CONFIG.REGIONS}` +
      `&markets=${markets}` +
      `&oddsFormat=${OPTIMIZED_CONFIG.ODDS_FORMAT}` +
      `&dateFormat=${OPTIMIZED_CONFIG.DATE_FORMAT}` +
      `&bookmakers=${OPTIMIZED_CONFIG.BOOKMAKERS}` +
      `&commenceTimeFrom=${new Date().toISOString()}` + // Only future games
      `&commenceTimeTo=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`; // Next 7 days

    console.log('🚀 Optimized API call:', {
      sport,
      markets: markets.split(','),
      marketCount: markets.split(',').length,
      bookmakers: OPTIMIZED_CONFIG.BOOKMAKERS.split(',').length,
      timeRange: '7 days'
    });

    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SportsArb-Optimized/2.0',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      // Add timeout and compression
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    const responseTime = Date.now() - startTime;
    console.log(`⚡ API response time: ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('❌ External API Error:', {
        status: response.status,
        sport,
        url: url.replace(apiKey, 'HIDDEN'),
        error: errorData
      });
      
      // Enhanced error handling with optimization context
      let errorMessage = `Optimized API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = '🔑 UNAUTHORIZED - API key lacks permissions for odds data';
      } else if (response.status === 404) {
        errorMessage = `Sport not found: ${sport}`;
      } else if (response.status === 422) {
        console.log(`⚠️ 422 error for ${sport} with markets: ${markets}`);
        
        // Try multiple fallback strategies
        const fallbackStrategies = [
          'h2h', // Most basic - just moneyline
          '', // No markets parameter at all
        ];
        
        for (const fallbackMarkets of fallbackStrategies) {
          if (fallbackMarkets === markets) continue; // Skip if same as what we tried
          
          console.log(`⚡ Trying fallback strategy for ${sport}: ${fallbackMarkets || 'no markets param'}`);
          
          let fallbackUrl = `${OPTIMIZED_CONFIG.BASE_URL}/sports/${sport}/odds/` +
            `?apiKey=${apiKey}` +
            `&regions=${OPTIMIZED_CONFIG.REGIONS}`;
          
          // Only add markets parameter if not empty
          if (fallbackMarkets) {
            fallbackUrl += `&markets=${fallbackMarkets}`;
          }
          
          fallbackUrl += `&oddsFormat=${OPTIMIZED_CONFIG.ODDS_FORMAT}` +
            `&dateFormat=${OPTIMIZED_CONFIG.DATE_FORMAT}` +
            `&bookmakers=draftkings,fanduel,betmgm` + // Reduce to most reliable bookmakers
            `&commenceTimeFrom=${new Date().toISOString()}` +
            `&commenceTimeTo=${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()}`; // Expand to 2 weeks
          
          try {
            const fallbackResponse = await fetch(fallbackUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'SportsArb-Fallback/1.0',
                'Accept-Encoding': 'gzip, deflate, br'
              },
              signal: AbortSignal.timeout(15000)
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              const processedData = processOptimizedOddsData(fallbackData, sport);
              
              console.log(`✅ Fallback successful for ${sport}:`, {
                games: processedData.games.length,
                strategy: fallbackMarkets || 'no-markets-param',
                url: fallbackUrl.replace(apiKey, 'HIDDEN')
              });
              
              return NextResponse.json({
                ...processedData,
                sport,
                generated_at: new Date().toISOString(),
                apiUsage: {
                  remainingRequests: fallbackResponse.headers.get('X-Requests-Remaining'),
                  requestsUsed: fallbackResponse.headers.get('X-Requests-Used'),
                  responseTime: Date.now() - startTime,
                  optimization: `fallback-${fallbackMarkets || 'no-markets'}`
                }
              });
            } else {
              console.log(`❌ Fallback ${fallbackMarkets || 'no-markets'} failed: ${fallbackResponse.status}`);
            }
          } catch (fallbackError) {
            console.log(`❌ Fallback ${fallbackMarkets || 'no-markets'} error:`, fallbackError);
          }
        }
        
        errorMessage = `🚫 INVALID REQUEST PARAMETERS\n\nThe API request parameters are invalid for sport: ${sport}\n\nPossible Issues:\n• Unsupported markets for this sport\n• Invalid bookmaker combinations\n• Sport may be out of season\n\nAPI Response: ${errorData?.message || errorText}`;
      } else if (response.status === 429) {
        const remainingRequests = response.headers.get('X-Requests-Remaining');
        errorMessage = `🚫 OUT OF API REQUESTS\n\nAPI quota exceeded.\n\nStatus:\n• Remaining: ${remainingRequests || '0'}\n• This was an optimized call requesting multiple markets\n\nActions:\n• Wait for quota reset\n• Upgrade plan at https://the-odds-api.com/`;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        games: [],
        sport,
        generated_at: new Date().toISOString(),
        apiUsage: {
          remainingRequests: response.headers.get('X-Requests-Remaining'),
          requestsUsed: response.headers.get('X-Requests-Used')
        }
      }, { status: response.status });
    }

    const data = await response.json();
    const remainingRequests = response.headers.get('X-Requests-Remaining');
    const requestsUsed = response.headers.get('X-Requests-Used');
    
    // OPTIMIZATION 2: Enhanced data processing and statistics
    const processedData = processOptimizedOddsData(data, sport);
    
    console.log('✅ Optimized response processed:', {
      sport,
      games: processedData.games.length,
      totalMarkets: processedData.totalMarkets,
      bookmakersCovered: processedData.bookmakersCovered,
      betTypesCovered: processedData.betTypesCovered,
      responseTime: `${responseTime}ms`,
      remaining: remainingRequests
    });
    
    return NextResponse.json({
      ...processedData,
      sport,
      generated_at: new Date().toISOString(),
      apiUsage: {
        remainingRequests: remainingRequests,
        requestsUsed: requestsUsed,
        responseTime: responseTime,
        optimization: 'ultra-efficient-v2'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Optimized API error:', error);
    
    return NextResponse.json({ 
      error: `Optimized fetch failed: ${error.message}`,
      games: [],
      sport,
      generated_at: new Date().toISOString(),
      apiUsage: {
        remainingRequests: null,
        requestsUsed: null,
        optimization: 'failed'
      }
    }, { status: 500 });
  }
}

// OPTIMIZATION 3: Advanced data processing to extract maximum value
function processOptimizedOddsData(rawData: any[], sport: string) {
  if (!Array.isArray(rawData)) {
    return {
      games: [],
      totalMarkets: 0,
      bookmakersCovered: 0,
      betTypesCovered: 0,
      arbitrageOpportunities: []
    };
  }

  const processedGames = rawData.map(game => {
    // Extract all available data in one pass
    const processedGame = {
      id: game.id,
      sport_key: game.sport_key,
      sport_title: game.sport_title,
      commence_time: game.commence_time,
      home_team: game.home_team,
      away_team: game.away_team,
      bookmakers: game.bookmakers || [],
      
      // OPTIMIZATION: Pre-calculate market summaries for all bet types
      marketSummary: {
        moneyline: {},
        spreads: {},
        totals: {},
        outrights: {},
        btts: {},
        draw_no_bet: {},
        team_totals: {},
        alternate_spreads: {},
        alternate_totals: {},
        player_props: {}
      },
      
      // OPTIMIZATION: Pre-calculate best odds for quick access
      bestOdds: {
        homeWin: { odds: null, bookmaker: '', market: '' },
        awayWin: { odds: null, bookmaker: '', market: '' },
        bestSpread: { odds: null, bookmaker: '', points: null },
        bestTotal: { odds: null, bookmaker: '', points: null }
      },

      // OPTIMIZATION: Calculate arbitrage potential immediately
      arbitragePotential: 0,
      hasArbitrageOpportunity: false
    };

    // Process each bookmaker's markets efficiently
    let totalMarkets = 0;
    const bookmakerSet = new Set();
    const marketTypeSet = new Set();

    processedGame.bookmakers.forEach((bookmaker: any) => {
      bookmakerSet.add(bookmaker.key);
      totalMarkets += bookmaker.markets?.length || 0;

      bookmaker.markets?.forEach((market: any) => {
        marketTypeSet.add(market.key);
        
        // Pre-process market data for fast arbitrage calculation
        switch (market.key) {
          case 'h2h': // Moneyline
            market.outcomes?.forEach((outcome: any) => {
              const key = outcome.name === processedGame.home_team ? 'home' : 'away';
              processedGame.marketSummary.moneyline[`${bookmaker.key}_${key}`] = {
                odds: outcome.price,
                bookmaker: bookmaker.title,
                last_update: bookmaker.last_update
              };

              // Track best odds
              const bestKey = key === 'home' ? 'homeWin' : 'awayWin';
              if (!(processedGame.bestOdds as Record<string, any>)[bestKey]?.odds || 
                  outcome.price > (processedGame.bestOdds as Record<string, any>)[bestKey].odds) {
                (processedGame.bestOdds as Record<string, any>)[bestKey] = {
                  odds: outcome.price,
                  bookmaker: bookmaker.title,
                  market: 'moneyline'
                };
              }
            });
            break;

          case 'spreads':
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}_${outcome.point || 0}`;
              (processedGame.marketSummary.spreads as Record<string, any>)[key] = {
                odds: outcome.price,
                points: outcome.point,
                bookmaker: bookmaker.title,
                team: outcome.name,
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'totals':
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}_${outcome.point || 0}`;
              (processedGame.marketSummary.totals as Record<string, any>)[key] = {
                odds: outcome.price,
                points: outcome.point,
                bookmaker: bookmaker.title,
                type: outcome.name, // Over/Under
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'btts': // Both Teams To Score
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}`;
              (processedGame.marketSummary.btts as Record<string, any>)[key] = {
                odds: outcome.price,
                bookmaker: bookmaker.title,
                outcome: outcome.name, // Yes/No
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'draw_no_bet': // Draw No Bet
            market.outcomes?.forEach((outcome: any) => {
              const key = outcome.name === processedGame.home_team ? 'home' : 'away';
              processedGame.marketSummary.draw_no_bet[`${bookmaker.key}_${key}`] = {
                odds: outcome.price,
                bookmaker: bookmaker.title,
                team: outcome.name,
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'team_totals': // Individual team totals
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}_${outcome.point || 0}`;
              (processedGame.marketSummary.team_totals as Record<string, any>)[key] = {
                odds: outcome.price,
                points: outcome.point,
                bookmaker: bookmaker.title,
                team: outcome.name,
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'alternate_spreads': // Alternative spreads
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}_${outcome.point || 0}`;
              (processedGame.marketSummary.alternate_spreads as Record<string, any>)[key] = {
                odds: outcome.price,
                points: outcome.point,
                bookmaker: bookmaker.title,
                team: outcome.name,
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'alternate_totals': // Alternative totals
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}_${outcome.point || 0}`;
              (processedGame.marketSummary.alternate_totals as Record<string, any>)[key] = {
                odds: outcome.price,
                points: outcome.point,
                bookmaker: bookmaker.title,
                type: outcome.name, // Over/Under
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'outrights': // Championship/tournament winners
            market.outcomes?.forEach((outcome: any) => {
              const key = `${bookmaker.key}_${outcome.name}`;
              (processedGame.marketSummary.outrights as Record<string, any>)[key] = {
                odds: outcome.price,
                bookmaker: bookmaker.title,
                participant: outcome.name,
                last_update: bookmaker.last_update
              };
            });
            break;

          case 'player_props': // Player performance props
            // Enhanced processing for player props with proper structure
            if (market.player_name && market.prop_name) {
              const propKey = `${bookmaker.key}_${market.player_name}_${market.prop_name}`;
              (processedGame.marketSummary.player_props as Record<string, any>)[propKey] = {
                player: market.player_name,
                prop: market.prop_name,
                bookmaker: bookmaker.title,
                outcomes: {},
                last_update: bookmaker.last_update
              };
              
              market.outcomes?.forEach((outcome: any) => {
                (processedGame.marketSummary.player_props as Record<string, any>)[propKey].outcomes[outcome.name] = {
                  odds: outcome.price,
                  point: outcome.point || market.point,
                  description: outcome.description
                };
              });
            } else {
              // Fallback processing for different player props structures
              market.outcomes?.forEach((outcome: any) => {
                const key = `${bookmaker.key}_${outcome.description || outcome.name}_${outcome.point || 0}`;
                (processedGame.marketSummary.player_props as Record<string, any>)[key] = {
                  odds: outcome.price,
                  bookmaker: bookmaker.title,
                  player: outcome.player_name || 'Unknown Player',
                  prop: outcome.prop_name || market.key,
                  point: outcome.point,
                  description: outcome.description || outcome.name,
                  last_update: bookmaker.last_update
                };
              });
            }
            break;
        }
      });
    });

    // OPTIMIZATION: Quick arbitrage detection
    const moneylineOdds = Object.values(processedGame.marketSummary.moneyline);
    if (moneylineOdds.length >= 2) {
      // Simple arbitrage check - can be expanded
      const homeOdds = moneylineOdds.filter((o: any) => o.bookmaker !== (moneylineOdds as Record<string, unknown>)[0]?.bookmaker);
      const awayOdds = moneylineOdds.filter((o: any) => o.bookmaker !== (homeOdds as Record<string, unknown>)[0]?.bookmaker);
      
      if (homeOdds.length > 0 && awayOdds.length > 0) {
        // Calculate implied probability sum (simplified)
        const bestHome = Math.max(...homeOdds.map((o: any) => o.odds));
        const bestAway = Math.max(...awayOdds.map((o: any) => o.odds));
        
        const homeImplied = bestHome > 0 ? 100 / (bestHome + 100) : Math.abs(bestHome) / (Math.abs(bestHome) + 100);
        const awayImplied = bestAway > 0 ? 100 / (bestAway + 100) : Math.abs(bestAway) / (Math.abs(bestAway) + 100);
        
        const totalImplied = homeImplied + awayImplied;
        processedGame.arbitragePotential = totalImplied < 1 ? (1 - totalImplied) * 100 : 0;
        processedGame.hasArbitrageOpportunity = processedGame.arbitragePotential > 0.5; // 0.5% minimum
      }
    }

    return processedGame;
  });

  // Calculate overall statistics
  const uniqueBookmakers = new Set();
  const uniqueMarketTypes = new Set();
  let totalMarkets = 0;
  const arbitrageOpportunities = [];

  processedGames.forEach(game => {
    game.bookmakers.forEach((bookmaker: any) => {
      uniqueBookmakers.add(bookmaker.key);
      bookmaker.markets?.forEach((market: any) => {
        uniqueMarketTypes.add(market.key);
        totalMarkets++;
      });
    });

    if (game.hasArbitrageOpportunity) {
      arbitrageOpportunities.push({
        gameId: game.id,
        teams: `${game.away_team} vs ${game.home_team}`,
        potential: game.arbitragePotential,
        sport: game.sport_title
      });
    }
  });

  return {
    games: processedGames,
    totalMarkets,
    bookmakersCovered: uniqueBookmakers.size,
    betTypesCovered: uniqueMarketTypes.size,
    arbitrageOpportunities,
    summary: {
      gamesWithArbitrage: arbitrageOpportunities.length,
      averageMarketsPerGame: processedGames.length > 0 ? totalMarkets / processedGames.length : 0,
      dataQuality: {
        bookmakerDiversity: uniqueBookmakers.size,
        marketTypeDiversity: uniqueMarketTypes.size,
        completeness: totalMarkets > 0 ? 1 : 0
      }
    }
  };
}