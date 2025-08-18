import { NextRequest, NextResponse } from 'next/server';
import { cacheUtils } from '@/lib/redis';
import { performanceMonitor } from '@/lib/webVitals';

// Enhanced arbitrage endpoint with Redis caching
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'americanfootball_nfl';
    const region = searchParams.get('region') || 'us';
    const markets = searchParams.get('markets') || 'h2h';
    
    const cacheKey = `arbitrage:${sport}:${region}:${markets}`;
    
    // Try to get from cache first
    const cached = await cacheUtils.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackApiCall('/api/arbitrage/cached', duration, 200);
      
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // If not in cache, fetch from The Odds API
    const apiKey = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
    if (!apiKey) {
      throw new Error('The Odds API key not configured');
    }

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?` +
      `apiKey=${apiKey}&regions=${region}&markets=${markets}&oddsFormat=american&dateFormat=iso`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`The Odds API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process for arbitrage opportunities
    const arbitrageOpportunities = processArbitrageOpportunities(data);
    
    // Cache the result for 5 minutes
    await cacheUtils.set(cacheKey, arbitrageOpportunities, 300);
    
    const duration = performance.now() - startTime;
    performanceMonitor.trackApiCall('/api/arbitrage/cached', duration, 200);

    return NextResponse.json({
      success: true,
      data: arbitrageOpportunities,
      cached: false,
      timestamp: new Date().toISOString(),
      remaining: response.headers.get('x-requests-remaining'),
      used: response.headers.get('x-requests-used')
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.trackApiCall('/api/arbitrage/cached', duration, 500);
    
    console.error('Cached Arbitrage API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function processArbitrageOpportunities(games: any[]) {
  const opportunities = [];
  
  for (const game of games) {
    if (!game.bookmakers || game.bookmakers.length < 2) continue;
    
    // Process each market (h2h, spreads, totals)
    for (const market of ['h2h']) {
      const marketData = game.bookmakers
        .map((bookmaker: any) => {
          const marketInfo = bookmaker.markets?.find((m: any) => m.key === market);
          if (!marketInfo) return null;
          
          return {
            bookmaker: bookmaker.title,
            outcomes: marketInfo.outcomes
          };
        })
        .filter(Boolean);
      
      if (marketData.length < 2) continue;
      
      // Find arbitrage opportunities
      const arbitrage = findArbitrageOpportunity(marketData, game, market);
      if (arbitrage) {
        opportunities.push(arbitrage);
      }
    }
  }
  
  return opportunities.sort((a, b) => b.profitMargin - a.profitMargin);
}

function findArbitrageOpportunity(marketData: any[], game: any, market: string) {
  // Simple arbitrage detection for h2h markets
  if (market !== 'h2h' || marketData.length < 2) return null;
  
  // Get all possible outcomes
  const outcomeNames = marketData[0].outcomes.map((o: any) => o.name);
  
  let bestCombination = null;
  let bestProfitMargin = 0;
  
  // Try all combinations of bookmakers for different outcomes
  for (let i = 0; i < marketData.length; i++) {
    for (let j = i + 1; j < marketData.length; j++) {
      const bookmaker1 = marketData[i];
      const bookmaker2 = marketData[j];
      
      // Check if we can create an arbitrage
      for (const outcome1 of bookmaker1.outcomes) {
        for (const outcome2 of bookmaker2.outcomes) {
          if (outcome1.name === outcome2.name) continue;
          
          const odds1 = Math.abs(outcome1.price);
          const odds2 = Math.abs(outcome2.price);
          
          // Convert American odds to decimal
          const decimal1 = odds1 > 0 ? (odds1 / 100) + 1 : (100 / odds1) + 1;
          const decimal2 = odds2 > 0 ? (odds2 / 100) + 1 : (100 / odds2) + 1;
          
          // Calculate implied probabilities
          const prob1 = 1 / decimal1;
          const prob2 = 1 / decimal2;
          
          // Check for arbitrage (total probability < 1)
          const totalProb = prob1 + prob2;
          if (totalProb < 1) {
            const profitMargin = ((1 - totalProb) / totalProb) * 100;
            
            if (profitMargin > bestProfitMargin) {
              bestProfitMargin = profitMargin;
              bestCombination = {
                game: `${game.home_team} vs ${game.away_team}`,
                sport: game.sport_title,
                commenceTime: game.commence_time,
                market,
                profitMargin,
                bets: [
                  {
                    bookmaker: bookmaker1.bookmaker,
                    outcome: outcome1.name,
                    odds: outcome1.price,
                    stake: (prob1 * 100).toFixed(2) + '%'
                  },
                  {
                    bookmaker: bookmaker2.bookmaker,
                    outcome: outcome2.name,
                    odds: outcome2.price,
                    stake: (prob2 * 100).toFixed(2) + '%'
                  }
                ]
              };
            }
          }
        }
      }
    }
  }
  
  return bestCombination;
}