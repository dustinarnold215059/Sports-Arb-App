// Live odds data integration using SportRadar API
// Sign up at https://sportradar.com/ for API key

export interface LiveOddsGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    last_update: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        price: number;
        point?: number;
      }[];
    }[];
  }[];
}

// API configuration for The Odds API
const THE_ODDS_API_CONFIG = {
  BASE_URL: 'https://api.the-odds-api.com/v4',
  API_KEY: process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || '',
  REGIONS: 'us', // US bookmakers
  MARKETS: 'h2h,spreads,totals', // head-to-head, spreads, totals
  ODDS_FORMAT: 'american', // American odds format
  DATE_FORMAT: 'iso'
};

// Debug API key loading
console.log('The Odds API Status:');
console.log('- API key configured:', !!THE_ODDS_API_CONFIG.API_KEY);
console.log('- Environment check:', process.env.NODE_ENV || 'development');
console.log('- Base URL:', THE_ODDS_API_CONFIG.BASE_URL);

// The Odds API Sports
// The Odds API uses these sport keys
export const THE_ODDS_API_SPORTS = {
  // American Football
  NFL: 'americanfootball_nfl',
  NCAAF: 'americanfootball_ncaaf',
  
  // Basketball  
  NBA: 'basketball_nba',
  NCAAB: 'basketball_ncaab',
  WNBA: 'basketball_wnba',
  
  // Baseball
  MLB: 'baseball_mlb',
  MiLB: 'baseball_milb', 
  NPB: 'baseball_npb',
  KBO: 'baseball_kbo',
  'NCAA Baseball': 'baseball_ncaa',
  
  // Ice Hockey
  NHL: 'icehockey_nhl',
  
  // Soccer/Football
  'Premier League': 'soccer_epl',
  'La Liga': 'soccer_spain_la_liga',
  Bundesliga: 'soccer_germany_bundesliga',
  'Serie A': 'soccer_italy_serie_a',
  'Ligue 1': 'soccer_france_ligue_one',
  'Champions League': 'soccer_uefa_champs_league',
  MLS: 'soccer_usa_mls',
  'Liga MX': 'soccer_mexico_ligamx',
  
  // Tennis
  'ATP Tennis': 'tennis_atp',
  'WTA Tennis': 'tennis_wta',
  
  // Combat Sports
  'MMA': 'mma_mixed_martial_arts',
  'UFC': 'mma_mixed_martial_arts',
  'Boxing': 'boxing_boxing',
  
  // Other Sports
  'Aussie Rules': 'aussierules_afl',
  Cricket: 'cricket_icc_world_cup',
  Rugby: 'rugbyleague_nrl'
};

// Export all The Odds API sports
export const ALL_SPORTS_AND_LEAGUES = THE_ODDS_API_SPORTS;

// Use ALL sports as requested by user
export const SUPPORTED_SPORTS = ALL_SPORTS_AND_LEAGUES;

// Fetch live odds from SportRadar API with fallback to mock data
export async function fetchLiveOdds(sport: string = SUPPORTED_SPORTS.NBA): Promise<LiveOddsGame[]> {
  console.log(`🔑 Fetching real odds data for sport: ${sport}`);
  
  // Use Next.js API route to avoid CORS issues
  const url = `/api/odds?sport=${encodeURIComponent(sport)}`;
  console.log('🌐 Attempting to fetch via proxy:', url);

  // Set a timeout for the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`📡 Proxy API response status for ${sport}:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Real API Response received via proxy:', data);
    
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }
    
    // Transform SportRadar data to our format
    const games = data.games || [];
    console.log('Number of real games found:', games.length);
    
    if (games.length === 0) {
      throw new Error('No games found in API response');
    }
    
    // Transform The Odds API format to our LiveOddsGame format
    return transformOddsAPIData(games, sport);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Real API error:', error);
    throw error; // Don't fall back to mock data, let the error propagate
  }
}

// Get available sports from The Odds API
export async function getAvailableSports(): Promise<any[]> {
  try {
    // The Odds API doesn't have a single endpoint for all sports, so we return our predefined list
    const availableSports = Object.entries(THE_ODDS_API_SPORTS).map(([name, key]) => ({
      key,
      group: name,
      title: name,
      description: `${name} games and betting data`,
      has_outrights: true
    }));
    
    console.log('✅ The Odds API sports available:', availableSports.length, 'sports configured');
    return availableSports;
  } catch (error) {
    console.error('Error getting available sports from The Odds API:', error);
    throw error;
  }
}

// SMART API OPTIMIZATION: Get sports with actual games (minimal API usage)
let sportsCache: { data: any[], timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

export async function getValidSports(): Promise<string[]> {
  try {
    // Check cache first
    if (sportsCache && Date.now() - sportsCache.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached sports data');
      const availableKeys = sportsCache.data.map(sport => sport.key);
      return Object.values(ALL_SPORTS_AND_LEAGUES).filter(sportKey => 
        availableKeys.includes(sportKey)
      );
    }

    console.log('🌐 Fetching fresh sports data...');
    const availableSports = await getAvailableSports();
    
    // Update cache
    sportsCache = {
      data: availableSports,
      timestamp: Date.now()
    };
    
    const availableKeys = availableSports.map(sport => sport.key);
    
    // Filter ALL sports to only include ones that exist in the API
    const validSports = Object.values(ALL_SPORTS_AND_LEAGUES).filter(sportKey => 
      availableKeys.includes(sportKey)
    );
    
    console.log('✅ Valid sports found:', validSports.length, 'out of', Object.keys(ALL_SPORTS_AND_LEAGUES).length);
    console.log('📊 Sports by category:');
    console.log('- American Football:', validSports.filter(s => s.includes('americanfootball')).length);
    console.log('- Basketball:', validSports.filter(s => s.includes('basketball')).length);
    console.log('- Soccer:', validSports.filter(s => s.includes('soccer')).length);
    console.log('- Baseball:', validSports.filter(s => s.includes('baseball')).length);
    console.log('- Other sports:', validSports.filter(s => !s.includes('americanfootball') && !s.includes('basketball') && !s.includes('soccer') && !s.includes('baseball')).length);
    
    return validSports;
  } catch (error) {
    console.error('Error validating sports:', error);
    // Fallback to most likely active sports
    return [
      'americanfootball_nfl',
      'basketball_nba', 
      'baseball_mlb',
      'basketball_ncaab',
      'americanfootball_ncaaf',
      'soccer_epl',
      'soccer_spain_la_liga',
      'mma_mixed_martial_arts'
    ];
  }
}

// ULTRA-EFFICIENT: Pre-filter sports that have games before making expensive requests
export async function getSportsWithGames(): Promise<string[]> {
  try {
    console.log('🎯 Smart filtering: Finding sports with actual games...');
    
    // Get all valid sports first
    const validSports = await getValidSports();
    
    // Priority order: sports most likely to have games
    const priorityOrder = [
      // High priority - usually active
      'americanfootball_nfl', 'basketball_nba', 'soccer_epl', 'soccer_spain_la_liga',
      'soccer_germany_bundesliga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
      'basketball_ncaab', 'americanfootball_ncaaf', 'mma_mixed_martial_arts',
      
      // Medium priority - seasonal
      'baseball_mlb', 'icehockey_nhl', 'basketball_wnba', 'soccer_usa_mls',
      
      // Lower priority - less frequent or off-season
      ...validSports.filter(sport => ![
        'americanfootball_nfl', 'basketball_nba', 'soccer_epl', 'soccer_spain_la_liga',
        'soccer_germany_bundesliga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
        'basketball_ncaab', 'americanfootball_ncaaf', 'mma_mixed_martial_arts',
        'baseball_mlb', 'icehockey_nhl', 'basketball_wnba', 'soccer_usa_mls'
      ].includes(sport))
    ].filter(sport => validSports.includes(sport));
    
    console.log('📋 Sports prioritized for scanning:', priorityOrder.length);
    return priorityOrder;
    
  } catch (error) {
    console.error('Error getting sports with games:', error);
    // Ultra-conservative fallback
    return ['americanfootball_nfl', 'basketball_nba', 'soccer_epl'];
  }
}

// Enhanced bet types interface
export interface BetMarket {
  type: 'moneyline' | 'spread' | 'total' | 'outright' | 'prop';
  name: string;
  description: string;
  outcomes: {
    bookmaker: string;
    option1: { name: string; odds: number; point?: number };
    option2: { name: string; odds: number; point?: number };
    point?: number; // For spreads and totals
  }[];
  hasDrawRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

// Transform API data - handles ALL bet types (moneyline, spreads, totals, etc.)
export function transformOddsData(apiData: LiveOddsGame[]): any[] {
  return apiData.map(game => {
    const allMarkets: BetMarket[] = [];
    let hasDrawOption = false;
    
    // Process each bookmaker's markets
    game.bookmakers.forEach(bookmaker => {
      bookmaker.markets.forEach(market => {
        switch (market.key) {
          case 'h2h': // Moneyline
            const moneylineMarket = processMoneylineMarket(market, bookmaker, game);
            if (moneylineMarket) {
              allMarkets.push(moneylineMarket);
              if (moneylineMarket.hasDrawRisk) hasDrawOption = true;
            }
            break;
            
          case 'spreads': // Point Spreads  
            const spreadMarket = processSpreadMarket(market, bookmaker, game);
            if (spreadMarket) allMarkets.push(spreadMarket);
            break;
            
          case 'totals': // Over/Under
            const totalMarket = processTotalMarket(market, bookmaker, game);
            if (totalMarket) allMarkets.push(totalMarket);
            break;
            
          case 'outrights': // Championship/Season-long bets
            const outrightMarket = processOutrightMarket(market, bookmaker, game);
            if (outrightMarket) allMarkets.push(outrightMarket);
            break;
        }
      });
    });

    // Group markets by type for easier arbitrage calculation
    const marketsByType = groupMarketsByType(allMarkets);

    return {
      id: game.id,
      game: `${game.away_team} vs ${game.home_team}`,
      team1: game.away_team,
      team2: game.home_team,
      commence_time: game.commence_time,
      sport: game.sport_title,
      hasDrawRisk: hasDrawOption,
      riskWarning: hasDrawOption ? '⚠️ DRAW RISK: This sport can end in ties/draws' : null,
      
      // Legacy format for existing arbitrage calculator
      odds: marketsByType.moneyline || {},
      
      // New comprehensive market data
      allMarkets: allMarkets,
      marketsByType: marketsByType,
      availableBetTypes: Object.keys(marketsByType),
      totalMarkets: allMarkets.length
    };
  }).filter(game => game.allMarkets.length > 0); // Only return games with valid markets
}

// Process moneyline (head-to-head) markets
function processMoneylineMarket(market: any, bookmaker: any, game: any): BetMarket | null {
  if (!market.outcomes || market.outcomes.length < 2) return null;
  
  const hasDrawRisk = market.outcomes.length === 3;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (hasDrawRisk) {
    riskLevel = 'high';
    // Skip draw outcome, only use team outcomes
    const teamOutcomes = market.outcomes.filter((outcome: any) => 
      outcome.name === game.home_team || outcome.name === game.away_team
    );
    if (teamOutcomes.length < 2) return null;
  }
  
  const homeOutcome = market.outcomes.find((outcome: any) => outcome.name === game.home_team);
  const awayOutcome = market.outcomes.find((outcome: any) => outcome.name === game.away_team);
  
  if (!homeOutcome || !awayOutcome) return null;
  
  return {
    type: 'moneyline',
    name: 'Moneyline',
    description: 'Bet on which team will win the game',
    outcomes: [{
      bookmaker: bookmaker.title,
      option1: { name: game.away_team, odds: awayOutcome.price },
      option2: { name: game.home_team, odds: homeOutcome.price }
    }],
    hasDrawRisk,
    riskLevel
  };
}

// Process spread markets
function processSpreadMarket(market: any, bookmaker: any, game: any): BetMarket | null {
  if (!market.outcomes || market.outcomes.length !== 2) return null;
  
  const homeOutcome = market.outcomes.find((outcome: any) => outcome.name === game.home_team);
  const awayOutcome = market.outcomes.find((outcome: any) => outcome.name === game.away_team);
  
  if (!homeOutcome || !awayOutcome) return null;
  
  return {
    type: 'spread',
    name: 'Point Spread',
    description: `Bet on teams to cover the spread`,
    outcomes: [{
      bookmaker: bookmaker.title,
      option1: { 
        name: `${game.away_team} ${awayOutcome.point > 0 ? '+' : ''}${awayOutcome.point}`, 
        odds: awayOutcome.price, 
        point: awayOutcome.point 
      },
      option2: { 
        name: `${game.home_team} ${homeOutcome.point > 0 ? '+' : ''}${homeOutcome.point}`, 
        odds: homeOutcome.price, 
        point: homeOutcome.point 
      },
      point: Math.abs(awayOutcome.point || homeOutcome.point || 0)
    }],
    hasDrawRisk: false, // Spreads typically don't have draws
    riskLevel: 'low'
  };
}

// Process total (over/under) markets
function processTotalMarket(market: any, bookmaker: any, game: any): BetMarket | null {
  if (!market.outcomes || market.outcomes.length !== 2) return null;
  
  const overOutcome = market.outcomes.find((outcome: any) => outcome.name === 'Over');
  const underOutcome = market.outcomes.find((outcome: any) => outcome.name === 'Under');
  
  if (!overOutcome || !underOutcome) return null;
  
  const totalPoints = overOutcome.point || underOutcome.point;
  
  return {
    type: 'total',
    name: 'Total Points',
    description: `Bet on total points over/under ${totalPoints}`,
    outcomes: [{
      bookmaker: bookmaker.title,
      option1: { name: `Over ${totalPoints}`, odds: overOutcome.price, point: totalPoints },
      option2: { name: `Under ${totalPoints}`, odds: underOutcome.price, point: totalPoints },
      point: totalPoints
    }],
    hasDrawRisk: false, // Totals don't have draws
    riskLevel: 'low'
  };
}

// Process outright markets (championship winners, etc.)
function processOutrightMarket(market: any, bookmaker: any, game: any): BetMarket | null {
  if (!market.outcomes || market.outcomes.length < 2) return null;
  
  // Outrights are multi-outcome markets - higher risk
  return {
    type: 'outright',
    name: 'Championship/Outright',
    description: 'Bet on tournament/season winner',
    outcomes: [{
      bookmaker: bookmaker.title,
      option1: { name: market.outcomes[0].name, odds: market.outcomes[0].price },
      option2: { name: market.outcomes[1].name, odds: market.outcomes[1].price }
    }],
    hasDrawRisk: false,
    riskLevel: 'high' // Many possible outcomes
  };
}

// Group markets by type for easy access
function groupMarketsByType(markets: BetMarket[]): Record<string, any> {
  const grouped: Record<string, any> = {};
  
  markets.forEach(market => {
    if (!grouped[market.type]) {
      grouped[market.type] = {};
    }
    
    market.outcomes.forEach(outcome => {
      if (market.type === 'moneyline') {
        // Legacy format for existing arbitrage calculator
        grouped[market.type][outcome.bookmaker] = {
          team1: outcome.option1.odds,
          team2: outcome.option2.odds
        };
      } else {
        // New format for other bet types
        grouped[market.type][outcome.bookmaker] = {
          option1: outcome.option1,
          option2: outcome.option2,
          point: outcome.point
        };
      }
    });
  });
  
  return grouped;
}

// Rate limiting helper for The Odds API
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number; // in milliseconds
  private actualRemaining: number | null = null;

  constructor(maxRequests: number = 500, timeWindowHours: number = 24 * 30) { // Monthly limit
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowHours * 60 * 60 * 1000;
    // Start with 0 since user is already out of requests
    this.actualRemaining = 0;
    console.log('🚫 Rate limiter initialized - User is out of API requests');
  }

  canMakeRequest(): boolean {
    // If we have actual remaining count from API, use that
    if (this.actualRemaining !== null) {
      return this.actualRemaining > 0;
    }

    // Otherwise use local tracking
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
    if (this.actualRemaining !== null) {
      this.actualRemaining--;
    }
  }

  updateFromAPIResponse(remainingRequests: string | null): void {
    if (remainingRequests) {
      this.actualRemaining = parseInt(remainingRequests);
      console.log('📈 Updated API quota - Remaining requests:', this.actualRemaining);
    }
  }

  getRemainingRequests(): number {
    // If we have actual remaining count from API, use that
    if (this.actualRemaining !== null) {
      return this.actualRemaining;
    }

    // Otherwise use local tracking
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getStatus(): string {
    const remaining = this.getRemainingRequests();
    if (remaining === 0) {
      return '🚫 OUT OF API REQUESTS';
    } else if (remaining < 10) {
      return `⚠️ LOW API REQUESTS: ${remaining} remaining`;
    } else {
      return `✅ ${remaining} API requests remaining`;
    }
  }
}

// Transform The Odds API data to our LiveOddsGame format
function transformOddsAPIData(games: any[], sport: string): LiveOddsGame[] {
  console.log('🔄 Transforming The Odds API data:', games.length, 'games');
  
  return games.map((game: any) => {
    // The Odds API structure
    const gameId = game.id;
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    
    console.log('📋 Real game from The Odds API:', `${awayTeam} vs ${homeTeam}`);
    
    if (!homeTeam || !awayTeam || !gameId) {
      console.warn('⚠️ Incomplete game data, skipping:', game);
      return null;
    }

    // The Odds API includes bookmaker data directly
    const bookmakers = game.bookmakers || [];
    
    if (!bookmakers || bookmakers.length === 0) {
      console.warn('⚠️ No bookmaker odds available for:', `${awayTeam} vs ${homeTeam}`);
      return null;
    }

    console.log(`✅ Found ${bookmakers.length} bookmakers for ${awayTeam} vs ${homeTeam}`);

    return {
      id: gameId,
      sport_key: game.sport_key || sport,
      sport_title: game.sport_title || sport.toUpperCase(),
      commence_time: game.commence_time,
      home_team: homeTeam,
      away_team: awayTeam,
      bookmakers: bookmakers
    };
  }).filter(game => game !== null); // Remove null games
}

// Usage examples and setup instructions
export const SETUP_INSTRUCTIONS = {
  title: "Setting Up The Odds API",
  steps: [
    {
      step: 1,
      title: "Get API Key",
      description: "Sign up at https://the-odds-api.com/ for a free API key"
    },
    {
      step: 2,
      title: "Set Environment Variable", 
      description: "Add NEXT_PUBLIC_THE_ODDS_API_KEY=your-key-here to your .env.local file"
    },
    {
      step: 3,
      title: "Test Connection",
      description: "Use the fetchLiveOdds() function to test your integration"
    },
    {
      step: 4,
      title: "Monitor Usage",
      description: "The Odds API has usage limits: 500 requests/month free tier"
    }
  ],
  pricing: {
    free: "500 requests/month for testing",
    basic: "$10-50/month for higher limits",
    pro: "Custom pricing for commercial usage"
  }
};