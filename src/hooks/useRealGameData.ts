import { useEffect, useState } from 'react';
import { fetchLiveOdds, transformOddsData, SUPPORTED_SPORTS, RateLimiter } from '@/lib/oddsAPI';
import { fetchOptimizedMultiSportData, rateLimiter as optimizedRateLimiter } from '@/lib/optimizedOddsAPI';

const rateLimiter = optimizedRateLimiter;

export interface RealGameData {
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
}

export interface GameDataStats {
  gamesLive: number;
  gamesUpcoming: number;
  totalOdds: number;
  lastUpdate: Date;
}

export const useRealGameData = (refreshInterval: number = 5 * 60 * 1000) => {
  const [games, setGames] = useState<RealGameData[]>([]);
  const [stats, setStats] = useState<GameDataStats>({
    gamesLive: 0,
    gamesUpcoming: 0,
    totalOdds: 0,
    lastUpdate: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we can make requests
      if (!rateLimiter.canMakeRequest()) {
        setError(`🚫 OUT OF API REQUESTS\n\nYou have used all your API requests for this period.\n\nThe Odds API Status:\n• Requests Remaining: ${rateLimiter.getRemainingRequests()}\n\nWhat to do:\n• Wait for your quota to reset (monthly)\n• Upgrade your plan at https://the-odds-api.com/\n• Check your usage at The Odds API dashboard`);
        setLoading(false);
        return;
      }

      console.log('🚀 Using ULTRA-OPTIMIZED game data fetching...');

      // OPTIMIZATION: Use new ultra-efficient multi-sport fetcher
      const maxSports = Math.min(rateLimiter.getRemainingRequests(), 6); // Conservative for games page
      const result = await fetchOptimizedMultiSportData(maxSports);

      const allGames: RealGameData[] = [];
      let totalMarketsCount = result.totalMarkets;

      console.log(`⚡ Optimized fetch for Live Sports Center:`, {
        games: result.allGames.length,
        markets: result.totalMarkets,
        sports: result.sportsProcessed.length,
        cacheHitRatio: `${(result.cacheStats.cacheHitRatio * 100).toFixed(1)}%`
      });

      // Process the optimized game data
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

          const optimizedGame: RealGameData = {
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
            availableBetTypes
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

      setGames(allGames);
      setStats({
        gamesLive: liveGames,
        gamesUpcoming: upcomingGames,
        totalOdds: totalMarkets,
        lastUpdate: new Date()
      });

      console.log('⚡ Ultra-optimized Live Sports Center updated:', {
        games: allGames.length,
        sports: result.sportsProcessed.length,
        markets: totalMarkets,
        cacheHitRatio: `${(result.cacheStats.cacheHitRatio * 100).toFixed(1)}%`
      });

    } catch (err: any) {
      console.error('❌ Error fetching real game data:', err);
      setError(`Failed to fetch real game data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealGames();
    
    const interval = setInterval(fetchRealGames, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    games,
    stats,
    loading,
    error,
    refetch: fetchRealGames,
    rateLimiter
  };
};