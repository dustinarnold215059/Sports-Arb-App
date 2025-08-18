import { useEffect, useState } from 'react';
import { SUPPORTED_SPORTS } from '@/lib/oddsAPI';
import { fetchOptimizedMultiSportData, rateLimiter, cacheManager } from '@/lib/optimizedOddsAPI';

export interface OptimizedGameData {
  id: string;
  home: string;
  away: string;
  league: string;
  sport: string;
  time: string;
  date: string;
  status: 'live' | 'upcoming' | 'finished';
  score?: { home: number; away: number };
  quarter?: string;
  odds: { home: string; away: string };
  commence_time: string;
  sportName: string;
  totalMarkets: number;
  availableBetTypes: string[];
  arbitragePotential?: number;
  hasArbitrageOpportunity?: boolean;
}

export interface OptimizedGameStats {
  gamesLive: number;
  gamesUpcoming: number;
  totalOdds: number;
  totalMarkets: number;
  arbitrageOpportunities: number;
  lastUpdate: Date;
  cacheEfficiency: number;
  apiCallsSaved: number;
}

export const useOptimizedGameData = (refreshInterval: number = 3 * 60 * 1000) => {
  const [games, setGames] = useState<OptimizedGameData[]>([]);
  const [stats, setStats] = useState<OptimizedGameStats>({
    gamesLive: 0,
    gamesUpcoming: 0,
    totalOdds: 0,
    totalMarkets: 0,
    arbitrageOpportunities: 0,
    lastUpdate: new Date(),
    cacheEfficiency: 0,
    apiCallsSaved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimizedGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check API quota
      if (!rateLimiter.canMakeRequest()) {
        setError(`🚫 OUT OF API REQUESTS\n\nAPI quota exceeded.\n\nRequests Remaining: ${rateLimiter.getRemainingRequests()}\n\nActions:\n• Wait for quota reset\n• Upgrade at https://the-odds-api.com/`);
        setLoading(false);
        return;
      }

      console.log('🚀 Ultra-optimized game data fetch starting...');
      const startTime = Date.now();
      
      // ULTRA-OPTIMIZATION: Fetch multiple sports with single optimized call pattern
      const maxSports = Math.min(rateLimiter.getRemainingRequests(), 8);
      const result = await fetchOptimizedMultiSportData(maxSports);
      
      const fetchTime = Date.now() - startTime;
      const allGames: OptimizedGameData[] = [];
      let arbitrageOpportunities = 0;

      // Process games with enhanced data extraction
      result.allGames.forEach(game => {
        try {
          const sportName = Object.entries(SUPPORTED_SPORTS).find(
            ([, value]) => value === game.sport_key
          )?.[0] || game.sport_title;

          // Extract best odds from optimized data structure
          let homeOdds = '+100';
          let awayOdds = '+100';
          
          if (game.bestOdds?.homeWin?.odds && game.bestOdds?.awayWin?.odds) {
            const homeOddsNum = game.bestOdds.homeWin.odds;
            const awayOddsNum = game.bestOdds.awayWin.odds;
            homeOdds = homeOddsNum > 0 ? `+${homeOddsNum}` : `${homeOddsNum}`;
            awayOdds = awayOddsNum > 0 ? `+${awayOddsNum}` : `${awayOddsNum}`;
          } else if (game.bookmakers && game.bookmakers.length > 0) {
            // Fallback to first bookmaker's moneyline
            const firstBookmaker = game.bookmakers[0];
            const moneylineMarket = firstBookmaker.markets?.find((m: any) => m.key === 'h2h');
            if (moneylineMarket && moneylineMarket.outcomes) {
              const homeOutcome = moneylineMarket.outcomes.find((o: any) => o.name === game.home_team);
              const awayOutcome = moneylineMarket.outcomes.find((o: any) => o.name === game.away_team);
              
              if (homeOutcome) homeOdds = homeOutcome.price > 0 ? `+${homeOutcome.price}` : `${homeOutcome.price}`;
              if (awayOutcome) awayOdds = awayOutcome.price > 0 ? `+${awayOutcome.price}` : `${awayOutcome.price}`;
            }
          }

          // Enhanced status determination
          const commenceTime = new Date(game.commence_time);
          const now = new Date();
          const timeDiff = commenceTime.getTime() - now.getTime();
          
          let status: 'live' | 'upcoming' | 'finished';
          if (timeDiff < 0 && timeDiff > -3 * 60 * 60 * 1000) { // Started less than 3 hours ago
            status = 'live';
          } else if (timeDiff < -3 * 60 * 60 * 1000) {
            status = 'finished';
          } else {
            status = 'upcoming';
          }

          // Smart time formatting
          const timeDisplay = commenceTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // Smart date formatting
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          let dateDisplay = 'Today';
          if (commenceTime.toDateString() === tomorrow.toDateString()) {
            dateDisplay = 'Tomorrow';
          } else if (commenceTime.toDateString() !== today.toDateString()) {
            dateDisplay = commenceTime.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
          }

          // Sport categorization for filtering
          const sportCategory = game.sport_key.includes('basketball') ? 'nba' :
                               game.sport_key.includes('americanfootball') ? 'nfl' :
                               game.sport_key.includes('soccer') ? 'soccer' :
                               game.sport_key.includes('baseball') ? 'mlb' :
                               game.sport_key.includes('hockey') ? 'nhl' : 'other';

          // Count available bet types
          const availableBetTypes = game.bookmakers?.length > 0 
            ? [...new Set(game.bookmakers.flatMap((b: any) => b.markets?.map((m: any) => m.key) || []))]
            : [];

          // Track arbitrage opportunities
          if (game.hasArbitrageOpportunity) {
            arbitrageOpportunities++;
          }

          const optimizedGame: OptimizedGameData = {
            id: game.id,
            home: game.home_team,
            away: game.away_team,
            league: sportName,
            sport: sportCategory,
            time: timeDisplay,
            date: dateDisplay,
            status,
            odds: { home: homeOdds, away: awayOdds },
            commence_time: game.commence_time,
            sportName,
            totalMarkets: game.bookmakers?.reduce((sum: number, b: any) => sum + (b.markets?.length || 0), 0) || 0,
            availableBetTypes,
            arbitragePotential: game.arbitragePotential || 0,
            hasArbitrageOpportunity: game.hasArbitrageOpportunity || false
          };

          allGames.push(optimizedGame);
        } catch (err) {
          console.error('Error processing game:', err);
        }
      });

      // Calculate comprehensive stats
      const liveGames = allGames.filter(game => game.status === 'live').length;
      const upcomingGames = allGames.filter(game => game.status === 'upcoming').length;
      const totalMarkets = allGames.reduce((sum, game) => sum + game.totalMarkets, 0);
      const totalOdds = allGames.length * 2; // Rough estimate of odds data points

      const optimizedStats: OptimizedGameStats = {
        gamesLive: liveGames,
        gamesUpcoming: upcomingGames,
        totalOdds,
        totalMarkets,
        arbitrageOpportunities,
        lastUpdate: new Date(),
        cacheEfficiency: result.cacheStats.cacheHitRatio,
        apiCallsSaved: Math.max(0, maxSports - result.sportsProcessed.length)
      };

      setGames(allGames);
      setStats(optimizedStats);

      console.log('⚡ Ultra-optimized fetch complete:', {
        totalTime: `${fetchTime}ms`,
        games: allGames.length,
        sports: result.sportsProcessed.length,
        markets: totalMarkets,
        arbitrage: arbitrageOpportunities,
        cacheHitRatio: `${(result.cacheStats.cacheHitRatio * 100).toFixed(1)}%`,
        efficiency: `${(totalMarkets / fetchTime * 1000).toFixed(1)} markets/second`
      });

    } catch (err: any) {
      console.error('Ultra-optimized fetch error:', err);
      
      if (err.message?.includes('OUT OF API REQUESTS') || err.message?.includes('quota')) {
        setError(err.message);
      } else {
        setError(`Optimized data fetch failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Optimized refresh logic with smart caching
  useEffect(() => {
    fetchOptimizedGames();

    // Smart refresh interval based on cache efficiency
    const adjustedInterval = Math.max(
      refreshInterval * (1 + stats.cacheEfficiency), // Slower refresh if cache is effective
      60 * 1000 // Minimum 1 minute
    );

    const interval = setInterval(() => {
      // Only refresh if we have API quota
      if (rateLimiter.canMakeRequest()) {
        fetchOptimizedGames();
      } else {
        console.log('⏸️ Skipping refresh - no API quota available');
      }
    }, adjustedInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Expose cache management functions
  const refetch = () => {
    if (rateLimiter.canMakeRequest()) {
      fetchOptimizedGames();
    } else {
      setError('No API requests remaining. Please wait for quota reset.');
    }
  };

  const clearCache = () => {
    cacheManager.clear();
    console.log('🧹 Cache cleared - next fetch will be fresh');
  };

  const preWarmCache = async (sports: string[]) => {
    if (rateLimiter.getRemainingRequests() >= sports.length) {
      await cacheManager.preWarm(sports);
      console.log('🔥 Cache pre-warmed for sports:', sports);
    }
  };

  return {
    games,
    stats,
    loading,
    error,
    refetch,
    clearCache,
    preWarmCache,
    rateLimiter: {
      canMakeRequest: rateLimiter.canMakeRequest(),
      remainingRequests: rateLimiter.getRemainingRequests(),
      status: rateLimiter.getStatus()
    }
  };
};