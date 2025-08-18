// ULTRA-OPTIMIZED API calls for maximum efficiency
// This module implements aggressive caching, batching, and smart prioritization

import { LiveOddsGame } from './oddsAPI';

interface CachedData {
  data: any;
  timestamp: number;
  sport: string;
}

interface OptimizedAPIConfig {
  BASE_URL: string;
  API_KEY: string;
  REGIONS: string;
  MARKETS: string;
  ODDS_FORMAT: string;
  DATE_FORMAT: string;
  BOOKMAKERS: string; // Key optimization: specify high-value bookmakers only
}

// OPTIMIZATION 1: Target only the most important bookmakers to reduce response size
const OPTIMIZED_CONFIG: OptimizedAPIConfig = {
  BASE_URL: 'https://api.the-odds-api.com/v4',
  API_KEY: process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || '7f0bd24ef41d31ae6fd09082bc36d3bb',
  REGIONS: 'us',
  MARKETS: 'h2h,spreads,totals,outrights,btts,draw_no_bet,team_totals,alternate_spreads,alternate_totals,player_props', // Enhanced bet types including player props for maximum arbitrage opportunities
  ODDS_FORMAT: 'american',
  DATE_FORMAT: 'iso',
  // CRITICAL: Only request data from major bookmakers to reduce payload
  BOOKMAKERS: 'draftkings,fanduel,betmgm,caesars,pointsbet,betrivers'
};

// OPTIMIZATION 2: Multi-level intelligent caching
class SuperCache {
  private cache = new Map<string, CachedData>();
  private sportsPriorityCache: { data: string[], timestamp: number } | null = null;
  private gamesWithOddsCache = new Map<string, { games: any[], timestamp: number }>();
  
  // Different cache durations for different data types
  private readonly SPORTS_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours - sports don't change often
  private readonly ODDS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - odds change frequently
  private readonly GAMES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - games list changes slowly

  set(key: string, data: any, sport: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      sport
    });
  }

  get(key: string, maxAge: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      console.log(`💾 Cache HIT for ${key} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }
    if (cached) {
      console.log(`💾 Cache EXPIRED for ${key} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
      this.cache.delete(key);
    }
    return null;
  }

  setSportsPriority(sports: string[]): void {
    this.sportsPriorityCache = {
      data: sports,
      timestamp: Date.now()
    };
  }

  getSportsPriority(): string[] | null {
    if (this.sportsPriorityCache && Date.now() - this.sportsPriorityCache.timestamp < this.SPORTS_CACHE_DURATION) {
      console.log('📦 Using cached sports priority list');
      return this.sportsPriorityCache.data;
    }
    return null;
  }

  setGamesWithOdds(sport: string, games: any[]): void {
    this.gamesWithOddsCache.set(sport, {
      games,
      timestamp: Date.now()
    });
  }

  getGamesWithOdds(sport: string): any[] | null {
    const cached = this.gamesWithOddsCache.get(sport);
    if (cached && Date.now() - cached.timestamp < this.GAMES_CACHE_DURATION) {
      return cached.games;
    }
    return null;
  }

  clear(): void {
    this.cache.clear();
    this.sportsPriorityCache = null;
    this.gamesWithOddsCache.clear();
  }

  getStats(): { totalEntries: number, cacheHitRatio: number, oldestEntry: number } {
    const now = Date.now();
    let hits = 0;
    let oldestAge = 0;
    
    this.cache.forEach(({ timestamp }) => {
      const age = now - timestamp;
      if (age < this.ODDS_CACHE_DURATION) hits++;
      oldestAge = Math.max(oldestAge, age);
    });

    return {
      totalEntries: this.cache.size,
      cacheHitRatio: this.cache.size > 0 ? hits / this.cache.size : 0,
      oldestEntry: oldestAge
    };
  }
}

// OPTIMIZATION 3: Smart request batching and deduplication
class RequestBatcher {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<{ sport: string, priority: number, callback: (data: any) => void }> = [];
  private isProcessing = false;

  // Deduplicate identical requests
  async dedupedRequest(sport: string, requestFn: () => Promise<any>): Promise<any> {
    const key = `odds-${sport}`;
    
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request for ${sport}`);
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn();
    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  // Batch requests by priority
  queueRequest(sport: string, priority: number, callback: (data: any) => void): void {
    this.requestQueue.push({ sport, priority, callback });
    this.requestQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0 && rateLimiter.canMakeRequest()) {
      const { sport, callback } = this.requestQueue.shift()!;
      
      try {
        const data = await this.dedupedRequest(sport, () => fetchOptimizedOdds(sport));
        callback(data);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed batch request for ${sport}:`, error);
        callback({ error });
      }
    }
    
    this.isProcessing = false;
  }
}

// OPTIMIZATION 4: Enhanced rate limiter with prediction
class OptimizedRateLimiter {
  private requests: { timestamp: number, sport: string, success: boolean }[] = [];
  private actualRemaining: number | null = null;
  private readonly maxRequests = 500;
  private readonly timeWindow = 30 * 24 * 60 * 60 * 1000; // 30 days

  canMakeRequest(): boolean {
    if (this.actualRemaining !== null) {
      return this.actualRemaining > 0;
    }

    const now = Date.now();
    this.requests = this.requests.filter(req => now - req.timestamp < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(sport: string, success: boolean = true): void {
    this.requests.push({
      timestamp: Date.now(),
      sport,
      success
    });
    
    if (this.actualRemaining !== null) {
      this.actualRemaining--;
    }
  }

  updateFromAPIResponse(remainingRequests: string | null): void {
    if (remainingRequests) {
      this.actualRemaining = parseInt(remainingRequests);
    }
  }

  getRemainingRequests(): number {
    if (this.actualRemaining !== null) {
      return this.actualRemaining;
    }

    const now = Date.now();
    this.requests = this.requests.filter(req => now - req.timestamp < this.timeWindow);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  // Predict best sports to request based on historical success
  getBestSportsToRequest(availableSports: string[], limit: number): string[] {
    const now = Date.now();
    const recentWindow = 24 * 60 * 60 * 1000; // 24 hours
    
    // Get success rates for each sport
    const sportStats = new Map<string, { requests: number, successes: number }>();
    
    this.requests
      .filter(req => now - req.timestamp < recentWindow)
      .forEach(req => {
        const stats = sportStats.get(req.sport) || { requests: 0, successes: 0 };
        stats.requests++;
        if (req.success) stats.successes++;
        sportStats.set(req.sport, stats);
      });

    // Sort sports by success rate and recency
    const prioritizedSports = availableSports
      .map(sport => {
        const stats = sportStats.get(sport) || { requests: 0, successes: 0 };
        const successRate = stats.requests > 0 ? stats.successes / stats.requests : 0.5;
        
        // Priority factors: success rate, default priority for known good sports
        const basePriority = this.getSportBasePriority(sport);
        const finalPriority = successRate * 0.7 + basePriority * 0.3;
        
        return { sport, priority: finalPriority, successRate, requests: stats.requests };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    console.log('🎯 Optimized sport priority:', prioritizedSports.map(s => 
      `${s.sport} (${(s.priority * 100).toFixed(0)}% priority, ${s.requests} requests)`
    ));

    return prioritizedSports.map(s => s.sport);
  }

  private getSportBasePriority(sport: string): number {
    // Base priorities for different sports (0-1 scale)
    const priorities: Record<string, number> = {
      'americanfootball_nfl': 0.95,
      'basketball_nba': 0.90,
      'soccer_epl': 0.85,
      'basketball_ncaab': 0.80,
      'americanfootball_ncaaf': 0.75,
      'soccer_spain_la_liga': 0.70,
      'mma_mixed_martial_arts': 0.65,
      'baseball_mlb': 0.60,
      'icehockey_nhl': 0.55,
      'soccer_usa_mls': 0.50
    };
    
    return priorities[sport] || 0.3;
  }

  getStatus(): string {
    const remaining = this.getRemainingRequests();
    const recentRequests = this.requests.filter(
      req => Date.now() - req.timestamp < 60 * 60 * 1000
    ).length;
    
    return `${remaining} requests left | ${recentRequests} used in last hour`;
  }
}

// Global instances
const superCache = new SuperCache();
const requestBatcher = new RequestBatcher();
const rateLimiter = new OptimizedRateLimiter();

// OPTIMIZATION 5: Ultra-efficient single API call
async function fetchOptimizedOdds(sport: string): Promise<any> {
  // Check cache first
  const cachedData = superCache.get(`odds-${sport}`, superCache['ODDS_CACHE_DURATION']);
  if (cachedData) {
    return cachedData;
  }

  const url = `/api/optimized-odds?sport=${encodeURIComponent(sport)}`;
  
  try {
    rateLimiter.recordRequest(sport, false); // Assume failure until success
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Update rate limiter with actual API response
    if (data.apiUsage?.remainingRequests) {
      rateLimiter.updateFromAPIResponse(data.apiUsage.remainingRequests);
    }
    
    // Cache the successful result
    superCache.set(`odds-${sport}`, data, sport);
    rateLimiter.recordRequest(sport, true); // Mark as successful
    
    return data;
    
  } catch (error) {
    console.error(`Optimized API call failed for ${sport}:`, error);
    throw error;
  }
}

// OPTIMIZATION 6: Smart multi-sport batch fetching
export async function fetchOptimizedMultiSportData(maxSports: number = 5): Promise<{
  allGames: any[],
  totalMarkets: number,
  sportsProcessed: string[],
  cacheStats: any
}> {
  console.log('🚀 Starting ultra-optimized multi-sport fetch...');
  
  // Get cached sports priority or determine it
  let prioritySports = superCache.getSportsPriority();
  
  if (!prioritySports) {
    // Use rate limiter intelligence to pick best sports
    const allAvailableSports = [
      'americanfootball_nfl', 'basketball_nba', 'soccer_epl', 'basketball_ncaab',
      'americanfootball_ncaaf', 'soccer_spain_la_liga', 'mma_mixed_martial_arts',
      'baseball_mlb', 'icehockey_nhl', 'soccer_usa_mls'
    ];
    
    prioritySports = rateLimiter.getBestSportsToRequest(allAvailableSports, maxSports * 2);
    superCache.setSportsPriority(prioritySports);
  }
  
  const sportsToProcess = prioritySports.slice(0, maxSports);
  console.log('🎯 Processing sports in optimal order:', sportsToProcess);
  
  const allGames: any[] = [];
  const sportsProcessed: string[] = [];
  let totalMarkets = 0;
  
  // Process sports in parallel with smart batching
  const promises = sportsToProcess.map(async (sport, index) => {
    if (!rateLimiter.canMakeRequest()) {
      console.log(`⏹️ Stopping at sport ${sport} - out of API requests`);
      return null;
    }
    
    try {
      // Add small delay for lower priority sports to not overwhelm API
      if (index > 2) {
        await new Promise(resolve => setTimeout(resolve, index * 200));
      }
      
      const data = await requestBatcher.dedupedRequest(sport, () => fetchOptimizedOdds(sport));
      
      if (data && data.games && data.games.length > 0) {
        allGames.push(...data.games);
        sportsProcessed.push(sport);
        totalMarkets += data.games.reduce((sum: number, game: any) => 
          sum + (game.bookmakers?.length || 0), 0
        );
        
        console.log(`✅ ${sport}: ${data.games.length} games, ${data.games.reduce((sum: number, game: any) => sum + (game.bookmakers?.length || 0), 0)} markets`);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${sport}:`, error);
      return null;
    }
  });
  
  await Promise.allSettled(promises);
  
  const cacheStats = superCache.getStats();
  
  console.log('🏁 Optimized fetch complete:', {
    totalGames: allGames.length,
    totalMarkets,
    sportsProcessed: sportsProcessed.length,
    cacheHitRatio: `${(cacheStats.cacheHitRatio * 100).toFixed(1)}%`
  });
  
  return {
    allGames,
    totalMarkets,
    sportsProcessed,
    cacheStats
  };
}

// OPTIMIZATION 7: Export optimized functions
export {
  superCache,
  rateLimiter,
  requestBatcher,
  fetchOptimizedOdds,
  OptimizedRateLimiter
};

// Export cache management functions
export const cacheManager = {
  clear: () => superCache.clear(),
  getStats: () => superCache.getStats(),
  preWarm: async (sports: string[]) => {
    console.log('🔥 Pre-warming cache for sports:', sports);
    const promises = sports.slice(0, 3).map(sport => fetchOptimizedOdds(sport));
    await Promise.allSettled(promises);
  }
};