'use client';

import { useState, useEffect } from 'react';
import { 
  findBestArbitrageOpportunity, 
  findBestPlayerPropArbitrage,
  formatAmericanOdds, 
  ArbitrageOpportunity, 
  getBookmakerColor,
  PlayerPropMarketData
} from '@/lib/arbitrage';
import { decimalToAmerican, formatAmericanOdds as utilFormatAmericanOdds } from '@/lib/utils';
import { BetTracker } from '@/components/BetTracker';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton, NeonButton } from '../shared/components/ui/ModernButton';
import { ModernBadge } from '../shared/components/ui/ModernBadge';
import { 
  fetchLiveOdds, 
  transformOddsData, 
  RateLimiter, 
  SUPPORTED_SPORTS,
  getSportsWithGames,
  BetMarket
} from '@/lib/oddsAPI';
import { 
  fetchOptimizedMultiSportData,
  rateLimiter as optimizedRateLimiter,
  cacheManager
} from '@/lib/optimizedOddsAPI';
import { useDemo } from '@/context/DemoContext';

const rateLimiter = optimizedRateLimiter;

interface EnhancedArbitrageScannerProps {
  useMockData?: boolean;
}

export function EnhancedArbitrageScanner({ useMockData = false }: EnhancedArbitrageScannerProps) {
  const { fakeArbitrageOpportunities } = useDemo();
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [totalStake, setTotalStake] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [totalGames, setTotalGames] = useState(0);
  const [scannedSports, setScannedSports] = useState(0);
  const [totalSports, setTotalSports] = useState(0);
  const [activeSports, setActiveSports] = useState<string[]>([]);
  const [selectedBetTypes] = useState<string[]>(['moneyline', 'spread', 'total', 'outright', 'btts', 'draw_no_bet', 'team_totals', 'alternate_spreads', 'alternate_totals', 'player_props']); // All bet types for maximum opportunities
  const [allGameData, setAllGameData] = useState<any[]>([]);
  const [showBetTracker, setShowBetTracker] = useState<{ show: boolean; opportunity?: ArbitrageOpportunity }>({ show: false });
  const [playerPropsEnabled, setPlayerPropsEnabled] = useState(false);
  const [loadingPlayerProps, setLoadingPlayerProps] = useState(false);
  const [playerPropsData, setPlayerPropsData] = useState<Map<string, any>>(new Map());

  // Function to fetch detailed player props for specific events
  const fetchPlayerPropsForEvent = async (eventId: string, sport: string) => {
    try {
      const response = await fetch(`/api/event-odds?eventId=${eventId}&sport=${sport}&playerProps=true`);
      
      if (!response.ok) {
        console.error(`Failed to fetch player props for event ${eventId}:`, response.status);
        return null;
      }
      
      const data = await response.json();
      return data.playerProps || {};
    } catch (error) {
      console.error(`Error fetching player props for event ${eventId}:`, error);
      return null;
    }
  };

  // Function to enhance games with player props data
  const enhanceGamesWithPlayerProps = async (games: any[]) => {
    if (!playerPropsEnabled || games.length === 0) return games;

    setLoadingPlayerProps(true);
    const newPlayerPropsData = new Map(playerPropsData);
    
    // Limit to first 5 games to conserve API calls
    const gamesToEnhance = games.slice(0, 5);
    console.log(`🎯 Fetching player props for ${gamesToEnhance.length} games...`);
    
    const promises = gamesToEnhance.map(async (game) => {
      if (!game.id || !game.sport_key) return game;
      
      const cacheKey = `${game.id}-${game.sport_key}`;
      
      // Check if we already have this data
      if (newPlayerPropsData.has(cacheKey)) {
        return { ...game, playerProps: newPlayerPropsData.get(cacheKey) };
      }
      
      // Fetch new player props
      const playerProps = await fetchPlayerPropsForEvent(game.id, game.sport_key);
      
      if (playerProps) {
        newPlayerPropsData.set(cacheKey, playerProps);
        return { ...game, playerProps };
      }
      
      return game;
    });
    
    try {
      const enhancedGames = await Promise.all(promises);
      setPlayerPropsData(newPlayerPropsData);
      setLoadingPlayerProps(false);
      
      // Replace the enhanced games in the original array
      const result = games.map((game, index) => {
        if (index < gamesToEnhance.length) {
          return enhancedGames[index];
        }
        return game;
      });
      
      console.log(`✅ Enhanced ${gamesToEnhance.length} games with player props`);
      return result;
    } catch (error) {
      console.error('Error enhancing games with player props:', error);
      setLoadingPlayerProps(false);
      return games;
    }
  };

  const betTypeOptions = [
    { id: 'moneyline', name: 'Moneyline', description: 'Who wins the game', icon: '🏆' },
    { id: 'spread', name: 'Point Spread', description: 'Cover the spread', icon: '📊' },
    { id: 'total', name: 'Over/Under', description: 'Total points scored', icon: '🎯' },
    { id: 'outright', name: 'Outrights', description: 'Championship winners', icon: '👑' },
    { id: 'btts', name: 'Both Teams Score', description: 'Both teams to score (soccer)', icon: '⚽' },
    { id: 'draw_no_bet', name: 'Draw No Bet', description: 'Win or get money back (soccer)', icon: '🤝' },
    { id: 'team_totals', name: 'Team Totals', description: 'Individual team points', icon: '🔢' },
    { id: 'alternate_spreads', name: 'Alt Spreads', description: 'Alternative point spreads', icon: '📈' },
    { id: 'alternate_totals', name: 'Alt Totals', description: 'Alternative over/under', icon: '📉' },
    { id: 'player_props', name: 'Player Props', description: 'Individual player performance', icon: '🏃' }
  ];

  const scanForOpportunities = async () => {
    // If using mock data, load fake opportunities immediately
    if (useMockData) {
      setIsScanning(true);
      setError(null);
      setScannedSports(0);
      
      // Simulate scanning delay
      setTimeout(() => {
        setOpportunities(fakeArbitrageOpportunities || []);
        setTotalGames(25);
        setScannedSports(6);
        setTotalSports(6);
        setActiveSports(['Basketball', 'Football', 'Baseball', 'Hockey', 'Soccer', 'Tennis']);
        setLastScan(new Date());
        setIsScanning(false);
      }, 2000);
      return;
    }

    // Check API quota
    if (!rateLimiter.canMakeRequest()) {
      setError(`🚫 OUT OF API REQUESTS\n\nAPI quota exceeded.\n\nRequests Remaining: ${rateLimiter.getRemainingRequests()}\n\nActions:\n• Wait for quota reset\n• Upgrade at https://the-odds-api.com/`);
      return;
    }

    setIsScanning(true);
    setError(null);
    setScannedSports(0);
    
    try {
      console.log('🚀 Ultra-optimized arbitrage scan starting...');
      const startTime = Date.now();
      
      // ULTRA-OPTIMIZATION: Use new multi-sport fetcher for maximum efficiency
      const maxSports = Math.min(rateLimiter.getRemainingRequests(), 12); // Conservative for arbitrage
      
      console.log('📊 Scan parameters:', {
        maxSports,
        remainingRequests: rateLimiter.getRemainingRequests(),
        canMakeRequest: rateLimiter.canMakeRequest(),
        rateLimiterStatus: rateLimiter.getStatus()
      });
      
      const result = await fetchOptimizedMultiSportData(maxSports);
      
      const fetchTime = Date.now() - startTime;
      const allGames: any[] = [];
      let totalGamesCount = result.allGames.length;
      
      console.log(`⚡ Optimized fetch for Arbitrage Scanner:`, {
        games: result.allGames.length,
        markets: result.totalMarkets,
        sports: result.sportsProcessed.length,
        cacheHitRatio: `${(result.cacheStats.cacheHitRatio * 100).toFixed(1)}%`,
        fetchTime: `${fetchTime}ms`
      });

      // Process the optimized game data for arbitrage scanning
      result.allGames.forEach(game => {
        try {
          const sportName = Object.entries(SUPPORTED_SPORTS).find(
            ([, value]) => value === game.sport_key
          )?.[0] || game.sport_title;

          // Enhanced game processing for arbitrage detection
          const processedGame = {
            ...game,
            sport: game.sport_key,
            sportName: sportName,
            game: `${game.away_team} vs ${game.home_team}`,
            team1: game.away_team,
            team2: game.home_team,
            totalMarkets: game.bookmakers?.reduce((sum: number, b: any) => sum + (b.markets?.length || 0), 0) || 0,
            hasDrawRisk: game.sport_key.includes('soccer'),
            riskWarning: game.sport_key.includes('soccer') ? 'This sport can end in draws/ties' : null,
            marketsByType: {
              moneyline: {},
              spread: {},
              total: {},
              outright: {},
              btts: {},
              draw_no_bet: {},
              team_totals: {},
              alternate_spreads: {},
              alternate_totals: {},
              player_props: {}
            }
          };

          // Process bookmaker data for arbitrage calculation
          if (game.bookmakers && game.bookmakers.length > 0) {
            game.bookmakers.forEach((bookmaker: any) => {
              bookmaker.markets?.forEach((market: any) => {
                switch (market.key) {
                  case 'h2h': // Moneyline
                    const moneylineData: any = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const key = outcome.name === game.home_team ? 'team2' : 'team1';
                      moneylineData[key] = outcome.price;
                    });
                    if (moneylineData.team1 && moneylineData.team2) {
                      processedGame.marketsByType.moneyline[bookmaker.title] = moneylineData;
                    }
                    break;
                    
                  case 'spreads':
                    // Group spread outcomes by absolute point value to find opposing spreads
                    const spreadsByAbsPoint: { [absPoint: string]: any[] } = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const point = outcome.point || 0;
                      const absPoint = Math.abs(point).toString();
                      if (!spreadsByAbsPoint[absPoint]) {
                        spreadsByAbsPoint[absPoint] = [];
                      }
                      spreadsByAbsPoint[absPoint].push({...outcome, originalPoint: point});
                    });
                    
                    // Create arbitrage-ready spread markets with exact opposing spreads
                    Object.entries(spreadsByAbsPoint).forEach(([absPoint, outcomes]) => {
                      if (outcomes.length === 2) {
                        // Sort outcomes to ensure we have positive and negative spreads
                        outcomes.sort((a, b) => a.originalPoint - b.originalPoint);
                        const negativeSpread = outcomes[0]; // Should be negative or smaller
                        const positiveSpread = outcomes[1]; // Should be positive or larger
                        
                        // Verify we have actual opposing spreads
                        if (Math.abs(negativeSpread.originalPoint + positiveSpread.originalPoint) < 0.1) {
                          const spreadKey = `${bookmaker.title}_${absPoint}`;
                          processedGame.marketsByType.spread[spreadKey] = {
                            option1: { 
                              odds: positiveSpread.price, 
                              name: `${positiveSpread.name} ${formatSpreadPoint(positiveSpread.originalPoint)}` 
                            },
                            option2: { 
                              odds: negativeSpread.price, 
                              name: `${negativeSpread.name} ${formatSpreadPoint(negativeSpread.originalPoint)}` 
                            }
                          };
                        } else {
                          console.log(`⚠️ Skipping non-opposing spreads: ${negativeSpread.originalPoint} and ${positiveSpread.originalPoint}`);
                        }
                      }
                    });
                    break;
                    
                  case 'totals':
                    // Group total outcomes by point value
                    const totalsByPoint: { [point: string]: any[] } = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const point = outcome.point?.toString() || '0';
                      if (!totalsByPoint[point]) {
                        totalsByPoint[point] = [];
                      }
                      totalsByPoint[point].push(outcome);
                    });
                    
                    // Create arbitrage-ready total markets
                    Object.entries(totalsByPoint).forEach(([point, outcomes]) => {
                      if (outcomes.length === 2) {
                        const totalKey = `${bookmaker.title}_${point}`;
                        const over = outcomes.find(o => o.name.toLowerCase().includes('over'));
                        const under = outcomes.find(o => o.name.toLowerCase().includes('under'));
                        
                        if (over && under) {
                          processedGame.marketsByType.total[totalKey] = {
                            option1: { 
                              odds: over.price, 
                              name: `Over ${point}` 
                            },
                            option2: { 
                              odds: under.price, 
                              name: `Under ${point}` 
                            }
                          };
                        }
                      }
                    });
                    break;

                  case 'btts': // Both Teams To Score (soccer)
                    // Create arbitrage-ready BTTS market
                    if (market.outcomes && market.outcomes.length === 2) {
                      const yes = market.outcomes.find((o: any) => o.name.toLowerCase().includes('yes'));
                      const no = market.outcomes.find((o: any) => o.name.toLowerCase().includes('no'));
                      
                      if (yes && no) {
                        processedGame.marketsByType.btts[bookmaker.title] = {
                          option1: { 
                            odds: yes.price, 
                            name: 'Both Teams Score - Yes' 
                          },
                          option2: { 
                            odds: no.price, 
                            name: 'Both Teams Score - No' 
                          }
                        };
                      }
                    }
                    break;

                  case 'draw_no_bet': // Draw No Bet (soccer)
                    const drawNoBetData: any = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const key = outcome.name === game.home_team ? 'team2' : 'team1';
                      drawNoBetData[key] = outcome.price;
                    });
                    if (drawNoBetData.team1 && drawNoBetData.team2) {
                      processedGame.marketsByType.draw_no_bet[bookmaker.title] = drawNoBetData;
                    }
                    break;

                  case 'team_totals': // Individual team totals
                    // Group team total outcomes by team and point value
                    const teamTotalsByTeamAndPoint: { [key: string]: any[] } = {};
                    market.outcomes?.forEach((outcome: any) => {
                      // Extract team name from outcome
                      const teamName = outcome.name || outcome.description || 'Unknown Team';
                      const point = outcome.point?.toString() || '0';
                      const key = `${teamName}_${point}`;
                      
                      if (!teamTotalsByTeamAndPoint[key]) {
                        teamTotalsByTeamAndPoint[key] = [];
                      }
                      teamTotalsByTeamAndPoint[key].push(outcome);
                    });
                    
                    // Create arbitrage-ready team total markets
                    Object.entries(teamTotalsByTeamAndPoint).forEach(([key, outcomes]) => {
                      if (outcomes.length === 2) {
                        const teamTotalKey = `${bookmaker.title}_${key}`;
                        const over = outcomes.find(o => o.name.toLowerCase().includes('over'));
                        const under = outcomes.find(o => o.name.toLowerCase().includes('under'));
                        
                        if (over && under) {
                          const teamName = key.split('_')[0];
                          const point = key.split('_')[1];
                          processedGame.marketsByType.team_totals[teamTotalKey] = {
                            option1: { 
                              odds: over.price, 
                              name: `${teamName} Over ${point}` 
                            },
                            option2: { 
                              odds: under.price, 
                              name: `${teamName} Under ${point}` 
                            }
                          };
                        }
                      }
                    });
                    break;

                  case 'alternate_spreads': // Alternative spreads
                    // Group alternate spread outcomes by absolute point value to find opposing spreads
                    const altSpreadsByAbsPoint: { [absPoint: string]: any[] } = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const point = outcome.point || 0;
                      const absPoint = Math.abs(point).toString();
                      if (!altSpreadsByAbsPoint[absPoint]) {
                        altSpreadsByAbsPoint[absPoint] = [];
                      }
                      altSpreadsByAbsPoint[absPoint].push({...outcome, originalPoint: point});
                    });
                    
                    // Create arbitrage-ready alternate spread markets with exact opposing spreads
                    Object.entries(altSpreadsByAbsPoint).forEach(([absPoint, outcomes]) => {
                      if (outcomes.length === 2) {
                        // Sort outcomes to ensure we have positive and negative spreads
                        outcomes.sort((a, b) => a.originalPoint - b.originalPoint);
                        const negativeSpread = outcomes[0]; // Should be negative or smaller
                        const positiveSpread = outcomes[1]; // Should be positive or larger
                        
                        // Verify we have actual opposing spreads
                        if (Math.abs(negativeSpread.originalPoint + positiveSpread.originalPoint) < 0.1) {
                          const altSpreadKey = `${bookmaker.title}_alt_${absPoint}`;
                          processedGame.marketsByType.alternate_spreads[altSpreadKey] = {
                            option1: { 
                              odds: positiveSpread.price, 
                              name: `${positiveSpread.name} ${formatSpreadPoint(positiveSpread.originalPoint)}` 
                            },
                            option2: { 
                              odds: negativeSpread.price, 
                              name: `${negativeSpread.name} ${formatSpreadPoint(negativeSpread.originalPoint)}` 
                            }
                          };
                        } else {
                          console.log(`⚠️ Skipping non-opposing alternate spreads: ${negativeSpread.originalPoint} and ${positiveSpread.originalPoint}`);
                        }
                      }
                    });
                    break;

                  case 'alternate_totals': // Alternative totals
                    // Group alternate total outcomes by point value
                    const altTotalsByPoint: { [point: string]: any[] } = {};
                    market.outcomes?.forEach((outcome: any) => {
                      const point = outcome.point?.toString() || '0';
                      if (!altTotalsByPoint[point]) {
                        altTotalsByPoint[point] = [];
                      }
                      altTotalsByPoint[point].push(outcome);
                    });
                    
                    // Create arbitrage-ready alternate total markets
                    Object.entries(altTotalsByPoint).forEach(([point, outcomes]) => {
                      if (outcomes.length === 2) {
                        const altTotalKey = `${bookmaker.title}_alt_${point}`;
                        const over = outcomes.find(o => o.name.toLowerCase().includes('over'));
                        const under = outcomes.find(o => o.name.toLowerCase().includes('under'));
                        
                        if (over && under) {
                          processedGame.marketsByType.alternate_totals[altTotalKey] = {
                            option1: { 
                              odds: over.price, 
                              name: `Over ${point}` 
                            },
                            option2: { 
                              odds: under.price, 
                              name: `Under ${point}` 
                            }
                          };
                        }
                      }
                    });
                    break;

                  case 'outrights': // Championship/tournament winners
                    market.outcomes?.forEach((outcome: any) => {
                      processedGame.marketsByType.outright[`${bookmaker.title}_${outcome.name}`] = {
                        odds: outcome.price,
                        name: outcome.name,
                        bookmaker: bookmaker.title
                      };
                    });
                    break;

                  case 'player_props': // Player performance props
                    // Player props have a specific structure with player names and prop types
                    if (market.player_name && market.prop_name) {
                      const propKey = `${market.player_name}_${market.prop_name}`;
                      if (!processedGame.marketsByType.player_props[propKey]) {
                        processedGame.marketsByType.player_props[propKey] = {
                          player: market.player_name,
                          prop: market.prop_name,
                          markets: {}
                        };
                      }
                      
                      market.outcomes?.forEach((outcome: any) => {
                        const outcomeKey = outcome.name.toLowerCase().includes('over') ? 'over' : 'under';
                        if (!processedGame.marketsByType.player_props[propKey].markets[bookmaker.title]) {
                          processedGame.marketsByType.player_props[propKey].markets[bookmaker.title] = {};
                        }
                        processedGame.marketsByType.player_props[propKey].markets[bookmaker.title][outcomeKey] = {
                          odds: outcome.price,
                          name: outcome.name,
                          point: outcome.point || market.point
                        };
                      });
                    } else {
                      // Fallback for general player props structure
                      market.outcomes?.forEach((outcome: any) => {
                        const playerPropKey = `${bookmaker.title}_${outcome.description || outcome.name}_${outcome.point || 0}`;
                        processedGame.marketsByType.player_props[playerPropKey] = {
                          odds: outcome.price,
                          name: outcome.description || outcome.name,
                          bookmaker: bookmaker.title,
                          player: outcome.player_name,
                          prop_type: outcome.prop_name,
                          point: outcome.point
                        };
                      });
                    }
                    break;
                }
              });
            });
          }

          allGames.push(processedGame);
        } catch (err) {
          console.error('Error processing game for arbitrage:', err);
        }
      });

      setTotalGames(totalGamesCount);
      setAllGameData(allGames);
      setTotalSports(result.sportsProcessed.length);
      setScannedSports(result.sportsProcessed.length);
      setActiveSports(result.sportsProcessed.map(sport => 
        Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === sport)?.[0] || sport
      ));
      
      // Enhance games with detailed player props if enabled
      let finalGames = allGames;
      if (playerPropsEnabled && allGames.length > 0) {
        console.log('🎯 Enhancing games with detailed player props...');
        finalGames = await enhanceGamesWithPlayerProps(allGames);
      }

      setTotalGames(totalGamesCount);
      setAllGameData(finalGames);
      
      if (finalGames.length === 0) {
        const scannedSportNames = result.sportsProcessed
          .map(sport => Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === sport)?.[0] || sport)
          .join(', ');
          
        setError(`No real games data available from optimized API across ${result.sportsProcessed.length} sports/leagues.\n\nScanned Sports: ${scannedSportNames || 'Various sports'}\n\nPossible reasons:\n• No games scheduled today for these sports\n• API rate limits reached\n• Sports are in off-season\n• API connectivity issues\n\nNote: This scanner uses ultra-optimized real live data from The Odds API.`);
        setOpportunities([]);
        return;
      }
      
      // Find arbitrage opportunities across selected bet types
      const found: ArbitrageOpportunity[] = [];
      
      console.log(`🔍 Processing ${finalGames.length} games for arbitrage...`);
      
      finalGames.forEach((game, gameIndex) => {
        // Only log games that might have opportunities
        if (game.bookmakers?.length >= 2) {
          console.log(`🎮 Game ${gameIndex + 1}: ${game.game}`, {
            sport: game.sport_key,
            totalMarkets: game.totalMarkets || 0,
            bookmakers: game.bookmakers?.length || 0,
            availableMarkets: Object.keys(game.marketsByType || {}).filter(key => 
              Object.keys(game.marketsByType[key] || {}).length >= 2
            )
          });
        }
        selectedBetTypes.forEach(betType => {
          // Skip draw risk bet types for sports that can have draws
          const drawRiskBetTypes = [
            'moneyline', 'h2h', 'match_winner', 'full_time_result', 'regulation_time',
            'three_way', '3way', 'match_result', 'game_winner', 'outright', 'winner',
            'head_to_head', 'match_odds', 'ft_result', 'match_betting'
          ];
          
          const isDrawRiskBet = drawRiskBetTypes.some(type => 
            betType.toLowerCase().includes(type.toLowerCase()) || 
            betType.toLowerCase() === type.toLowerCase()
          );
          
          if (hasDrawRisk(game.sport_key || '') && isDrawRiskBet) {
            console.log(`🚫 Skipping ${betType} for ${game.sport_key} - draw risk sport`);
            return; // Skip this bet type for this sport
          }
          
          const marketData = game.marketsByType[betType];
          // Only log if there's potential for arbitrage
          if (marketData && Object.keys(marketData).length >= 2) {
            console.log(`🎯 ${betType} for ${game.game}: ${Object.keys(marketData).length} bookmakers`);
          }
          
          if (marketData && Object.keys(marketData).length >= 2) {
            
            // Pre-filter totals markets to only include those with matching point values
            let filteredMarketData = marketData;
            if (betType === 'total' || betType === 'alternate_totals') {
              filteredMarketData = filterTotalsMarketsByPointValue(marketData);
              
              // Skip if no valid matching point values found
              if (Object.keys(filteredMarketData).length < 2) {
                console.log(`⚠️ Skipping ${betType} for ${game.game} - no markets with matching point values for valid arbitrage`);
                return;
              }
            }
            
            let opportunity: ArbitrageOpportunity;
            
            if (betType === 'moneyline') {
              // Use existing arbitrage calculator for moneyline
              opportunity = findBestArbitrageOpportunity(
                filteredMarketData,
                game.team1,
                game.team2,
                `${game.game} (${game.sportName})${game.hasDrawRisk ? ' ⚠️' : ''}`,
                totalStake
              );
            } else if (betType === 'player_props') {
              // Special handling for player props with enhanced structure
              // Convert player props data to the expected format
              const playerPropsFormatted: PlayerPropMarketData = {};
              
              // Check if game has enhanced player props data from event-specific API
              if (game.playerProps && Object.keys(game.playerProps).length > 0) {
                // Use detailed player props from event-specific API
                Object.entries(game.playerProps).forEach(([marketName, propData]: [string, any]) => {
                  if (propData.bookmakers && Object.keys(propData.bookmakers).length >= 2) {
                    // Extract player and prop info from the market description
                    const playerPropKey = `${marketName}_${Date.now()}`; // Unique key
                    
                    playerPropsFormatted[playerPropKey] = {
                      player: propData.description?.split(' ')[0] || 'Unknown Player',
                      prop: propData.description || marketName,
                      markets: {}
                    };
                    
                    // Process each bookmaker's odds for this prop
                    Object.entries(propData.bookmakers).forEach(([bookmakerKey, bookmakerData]: [string, any]) => {
                      const bookmakerTitle = bookmakerData.bookmaker || bookmakerKey;
                      playerPropsFormatted[playerPropKey].markets[bookmakerTitle] = {};
                      
                      // Process outcomes (over/under, yes/no)
                      bookmakerData.outcomes?.forEach((outcome: any) => {
                        const outcomeName = outcome.name?.toLowerCase() || '';
                        if (outcomeName.includes('over')) {
                          playerPropsFormatted[playerPropKey].markets[bookmakerTitle].over = {
                            odds: outcome.price,
                            name: outcome.name,
                            point: outcome.point
                          };
                        } else if (outcomeName.includes('under')) {
                          playerPropsFormatted[playerPropKey].markets[bookmakerTitle].under = {
                            odds: outcome.price,
                            name: outcome.name,
                            point: outcome.point
                          };
                        } else if (outcomeName.includes('yes')) {
                          playerPropsFormatted[playerPropKey].markets[bookmakerTitle].yes = {
                            odds: outcome.price,
                            name: outcome.name
                          };
                        } else if (outcomeName.includes('no')) {
                          playerPropsFormatted[playerPropKey].markets[bookmakerTitle].no = {
                            odds: outcome.price,
                            name: outcome.name
                          };
                        }
                      });
                    });
                  }
                });
              } else {
                // Fall back to basic player props from bulk API
                Object.entries(filteredMarketData).forEach(([propKey, propData]: [string, any]) => {
                  if (propData.player && propData.prop && propData.markets) {
                    playerPropsFormatted[propKey] = propData;
                  }
                });
              }
              
              // Only try to find arbitrage if we have formatted player props data
              if (Object.keys(playerPropsFormatted).length > 0) {
                opportunity = findBestPlayerPropArbitrage(
                  playerPropsFormatted,
                  `${game.game} (${game.sportName}) - PLAYER PROPS`,
                  totalStake
                );
              } else {
                // No player props data available
                opportunity = {
                  game: `${game.game} (${game.sportName}) - PLAYER PROPS`,
                  totalStake,
                  guaranteedProfit: 0,
                  profitMargin: 0,
                  isArbitrage: false,
                  totalBookmakers: 0,
                  betType: 'player_props',
                  bets: []
                };
              }
            } else {
              // Create custom opportunity object for other bet types
              opportunity = findBestArbitrageOpportunityForBetType(
                filteredMarketData,
                betType,
                `${game.game} (${game.sportName}) - ${betType.toUpperCase()}`,
                totalStake,
                game.sport_key || ''
              );
            }
            
            // Only log successful arbitrage opportunities
            if (opportunity.isArbitrage) {
              console.log(`💰 ARBITRAGE FOUND: ${betType} - ${opportunity.profitMargin.toFixed(2)}% profit`);
            }
            
            if (opportunity.isArbitrage) {
              // Check if same sportsbook is on both sides
              const bookmakers = opportunity.bets.map(bet => bet.bookmaker);
              const uniqueBookmakers = new Set(bookmakers);
              
              console.log(`🔍 Bookmaker check:`, {
                bookmakers,
                uniqueCount: uniqueBookmakers.size,
                betCount: opportunity.bets.length,
                passesCheck: uniqueBookmakers.size === opportunity.bets.length
              });
              
              // Only add if different sportsbooks are used
              if (uniqueBookmakers.size === opportunity.bets.length) {
                opportunity.riskWarning = game.riskWarning;
                opportunity.hasDrawRisk = game.hasDrawRisk;
                opportunity.betType = betType;
                found.push(opportunity);
              }
            } else if (opportunity.riskWarning) {
              // Log filtered opportunities for debugging
              console.log(`🚫 Filtered opportunity: ${opportunity.riskWarning}`, {
                sport: game.sport_key,
                betType,
                game: gameName,
                hasDrawRisk: hasDrawRisk(game.sport_key || '')
              });
            }
          }
        });
      });
      
      // Sort opportunities by profit margin (highest first)
      found.sort((a, b) => b.profitMargin - a.profitMargin);
      
      console.log(`🏁 FINAL RESULT: Found ${found.length} arbitrage opportunities:`, found.map(op => ({
        game: op.game,
        betType: op.betType,
        profitMargin: op.profitMargin,
        guaranteedProfit: op.guaranteedProfit,
        bookmakers: op.bets.map(bet => bet.bookmaker)
      })));
      
      setOpportunities(found);
      
    } catch (err: any) {
      console.error('Error scanning for opportunities:', err);
      
      // Enhanced error handling with detailed debugging
      let errorMessage = `Failed to fetch live odds data: ${err.message}`;
      
      // Check if it's a rate limit error
      if (err.message?.includes('OUT OF API REQUESTS') || err.message?.includes('quota') || err.message?.includes('limit')) {
        errorMessage = err.message;
      } else if (err.message?.includes('API key')) {
        errorMessage = `🔑 API KEY ISSUE\n\nThe API key may be invalid or missing.\n\nDetails: ${err.message}\n\nActions:\n• Check environment variable NEXT_PUBLIC_ODDS_API_KEY\n• Verify API key at https://the-odds-api.com/\n• Restart development server`;
      } else if (err.message?.includes('fetch')) {
        errorMessage = `🌐 NETWORK ERROR\n\nFailed to connect to optimized API endpoint.\n\nDetails: ${err.message}\n\nActions:\n• Check internet connection\n• Verify API endpoint is running\n• Check browser console for CORS errors`;
      } else {
        errorMessage = `🔧 PROCESSING ERROR\n\nAn error occurred while processing odds data.\n\nDetails: ${err.message}\n\nActions:\n• Try scanning again\n• Check browser console for details\n• Report issue if it persists`;
      }
      
      setError(errorMessage);
      setOpportunities([]);
    } finally {
      setLastScan(new Date());
      setIsScanning(false);
    }
  };

  // Auto-scan every 5 minutes
  useEffect(() => {
    scanForOpportunities();
    const interval = setInterval(scanForOpportunities, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [totalStake]);

  return (
    <>
      <ModernCard variant="glass" className="backdrop-blur-xl">
        <ModernCardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🚀 Arbitrage Scanner
            </h2>
            <p className="text-gray-300 text-sm">
              Enhanced scanning across {selectedBetTypes.length} bet types & {Object.keys(SUPPORTED_SPORTS).length}+ sports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ModernBadge variant="success" size="sm">
              Live
            </ModernBadge>
          </div>
        </div>
        </ModernCardHeader>
        
        <ModernCardBody>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
              Stake Amount
            </label>
            <input
              type="number"
              value={totalStake}
              onChange={(e) => setTotalStake(Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="playerPropsToggle"
              checked={playerPropsEnabled}
              onChange={(e) => setPlayerPropsEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="playerPropsToggle" className="text-sm text-gray-300 cursor-pointer">
              🎯 Enhanced Player Props {loadingPlayerProps && '(Loading...)'}
            </label>
          </div>
          <NeonButton
            onClick={scanForOpportunities}
            disabled={isScanning || !rateLimiter.canMakeRequest()}
            size="lg"
          >
            {isScanning ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning {scannedSports}/{totalSports} Sports...</span>
              </div>
            ) : (
              'Smart Scan All Bet Types'
            )}
          </NeonButton>
        </div>
      </div>


      {/* Status Display */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          {lastScan && (
            <div>
              Last scan: {lastScan.toLocaleTimeString()} • 
              Next auto-scan: {new Date(lastScan.getTime() + 5 * 60 * 1000).toLocaleTimeString()}
              {totalGames > 0 && ` • Found ${totalGames} games`}
            </div>
          )}
          <div className="text-right">
            {rateLimiter.getStatus()}
          </div>
        </div>
        
        {activeSports.length > 0 && (
          <div className="text-xs text-green-600 dark:text-green-400">
            ✅ Active sports with games: {activeSports.join(', ')}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-6 bg-gray-900/95 backdrop-blur-xl border border-red-500/30 rounded-xl">
          <div className="flex items-start space-x-4">
            <div className="text-red-400 text-2xl">
              {error.includes('OUT OF API REQUESTS') ? '🚫' : '⚠️'}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-400 text-lg mb-2">
                {error.includes('OUT OF API REQUESTS') ? 'Out of API Requests' : 'Scanner Error'}
              </h4>
              <p className="text-gray-300 whitespace-pre-line leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities Display */}
      {isScanning ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Enhanced scanning with all {selectedBetTypes.length} bet types...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Progress: {scannedSports}/{totalSports} sports • All bet types active
          </p>
        </div>
      ) : (
        <>
          {opportunities.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-4">
                No Arbitrage Opportunities Found
              </h3>
              <p className="text-gray-300 leading-relaxed max-w-md mx-auto">
                No profitable arbitrage opportunities detected across selected bet types.
                <br />
                Try different bet type combinations or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-green-400">
                  🎯 {opportunities.length} Multi-Type Opportunity{opportunities.length !== 1 ? 's' : ''} Found
                </h3>
                <div className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-medium border border-green-500/30">
                  Total: ${opportunities.reduce((sum, opp) => sum + opp.guaranteedProfit, 0).toFixed(2)}
                </div>
              </div>

              <div className="space-y-4">
                {opportunities.map((opportunity, index) => (
                  <ModernCard key={index} variant="default" className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                    <ModernCardBody>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">
                            {opportunity.game}
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <span>Bet Type:</span>
                            <ModernBadge variant="primary" size="sm">
                              {getBetTypeIcon(opportunity.betType || 'moneyline')} {(opportunity.betType || 'moneyline').toUpperCase()}
                            </ModernBadge>
                            <span>• {opportunity.totalBookmakers} sportsbooks</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg border border-green-500/30">
                            <div className="text-lg font-bold">
                              ${opportunity.guaranteedProfit.toFixed(2)} profit
                            </div>
                            <div className="text-sm opacity-90">
                              {opportunity.profitMargin.toFixed(2)}% margin
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Efficiency: {(100 / (1 + opportunity.profitMargin/100)).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {opportunity.bets.map((bet, betIndex) => {
                          const colors = getBookmakerColor(bet.bookmaker);
                          return (
                            <div key={betIndex} className="p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">
                                  {bet.bookmaker}
                                </span>
                                <span className="text-sm font-mono text-blue-300">
                                  {formatAmericanOdds(bet.odds)}
                                </span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Bet:</span>
                                  <span className="font-medium text-white">{bet.team}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Odds:</span>
                                  <span className="font-bold text-blue-300">
                                    {formatAmericanOdds(bet.odds)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Stake:</span>
                                  <span className="font-medium text-white">${bet.stake.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Payout:</span>
                                  <span className="font-medium text-green-300">${bet.potentialPayout.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 space-y-2">
                        {opportunity.hasDrawRisk && (
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
                            <strong>⚠️ DRAW RISK WARNING:</strong> This sport can end in ties/draws. Consider avoiding unless experienced with three-outcome arbitrage.
                          </div>
                        )}
                        {(opportunity.betType === 'spread' || opportunity.betType === 'total') && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
                            <strong>📊 {opportunity.betType?.toUpperCase()} INFO:</strong> Verify point values match across sportsbooks. Half-point differences can affect outcomes.
                          </div>
                        )}
                        {opportunity.betType === 'player_props' && (
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-sm text-purple-800 dark:text-purple-300">
                            <strong>🏃 PLAYER PROPS INFO:</strong> Check injury reports and player status before placing bets. Player props can be highly volatile.
                          </div>
                        )}
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
                          <strong>Action Required:</strong> Place bets quickly as odds change rapidly. 
                          Verify current odds and point values before betting.
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <ModernButton
                            onClick={() => setShowBetTracker({ show: true, opportunity })}
                            variant="primary"
                            size="sm"
                          >
                            📝 Record This Arbitrage
                          </ModernButton>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Click to track this opportunity in your portfolio
                          </div>
                        </div>
                      </div>
                    </ModernCardBody>
                  </ModernCard>
                ))}
              </div>
            </div>
          )}
        </>
      )}

        </ModernCardBody>
      </ModernCard>

      {/* Bet Tracker Modal/Overlay */}
      {showBetTracker.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Record Arbitrage Opportunity
              </h3>
              <button
                onClick={() => setShowBetTracker({ show: false })}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <BetTracker 
                opportunity={showBetTracker.opportunity}
                onBetRecorded={() => {
                  setShowBetTracker({ show: false });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper function to get bet type icons
function getBetTypeIcon(betType: string): string {
  switch (betType) {
    case 'moneyline': return '🏆';
    case 'spread': return '📊';
    case 'total': return '🎯';
    case 'outright': return '👑';
    case 'btts': return '⚽';
    case 'draw_no_bet': return '🤝';
    case 'team_totals': return '🔢';
    case 'alternate_spreads': return '📈';
    case 'alternate_totals': return '📉';
    case 'player_props': return '🏃';
    default: return '🎲';
  }
}

// Format spread points with proper +/- signs
function formatSpreadPoint(point: number): string {
  if (point === 0) return '0';
  return point > 0 ? `+${point}` : `${point}`;
}

// Check if sport has draw risk (3-way markets)
function hasDrawRisk(sportKey: string): boolean {
  // All soccer leagues have draw risk
  const soccerLeagues = [
    'soccer_epl', 'soccer_spain_la_liga', 'soccer_usa_mls', 'soccer_germany_bundesliga',
    'soccer_italy_serie_a', 'soccer_france_ligue_one', 'soccer_uefa_champs_league',
    'soccer_fifa_world_cup', 'soccer_uefa_european_championship', 'soccer_conmebol_copa_libertadores',
    'soccer_uefa_europa_league', 'soccer_fa_cup', 'soccer_league_cup', 'soccer_carabao_cup',
    'soccer_brazil_campeonato', 'soccer_argentina_primera_division', 'soccer_netherlands_eredivisie',
    'soccer_portugal_primeira_liga', 'soccer_belgium_first_div', 'soccer_austria_bundesliga',
    'soccer_denmark_superliga', 'soccer_finland_veikkausliiga', 'soccer_norway_eliteserien',
    'soccer_sweden_allsvenskan', 'soccer_switzerland_superleague', 'soccer_turkey_super_league',
    'soccer_greece_super_league', 'soccer_russia_premier_league', 'soccer_poland_ekstraklasa',
    'soccer_czech_republic_1', 'soccer_croatia_1hnl', 'soccer_serbia_superliga',
    'soccer_ukraine_premier_league', 'soccer_romania_liga_1', 'soccer_bulgaria_a_group',
    'soccer_hungary_nb_i', 'soccer_slovakia_super_liga', 'soccer_slovenia_prvaliga',
    'soccer_estonia_meistriliiga', 'soccer_latvia_virsliga', 'soccer_lithuania_a_lyga',
    'soccer_albania_superliga', 'soccer_armenia_premier_league', 'soccer_azerbaijan_premier_league',
    'soccer_belarus_premier_league', 'soccer_bosnia_premier_league', 'soccer_cyprus_1_division',
    'soccer_faroe_islands_1_division', 'soccer_georgia_erovnuli_liga', 'soccer_gibraltar_national_league',
    'soccer_iceland_urvalsdeild', 'soccer_kazakhstan_premier_league', 'soccer_kosovo_superliga',
    'soccer_liechtenstein_cup', 'soccer_luxembourg_national_division', 'soccer_malta_premier_league',
    'soccer_moldova_national_division', 'soccer_monaco_ligue_1', 'soccer_montenegro_1_cfl',
    'soccer_northern_ireland_premiership', 'soccer_republic_of_ireland_premier_division',
    'soccer_san_marino_campionato', 'soccer_scotland_premiership', 'soccer_wales_premier_league'
  ];
  
  // Cricket has draw risk (Test matches can end in draws)
  const cricketFormats = [
    'cricket_test_match', 'cricket_county_championship', 'cricket_sheffield_shield',
    'cricket_first_class', 'cricket_four_day'
  ];
  
  // Some other sports with potential draw outcomes
  const otherDrawRiskSports = [
    'rugby_league', 'rugby_union', 'australian_rules_football'
  ];
  
  const allDrawRiskSports = [...soccerLeagues, ...cricketFormats, ...otherDrawRiskSports];
  
  return allDrawRiskSports.some(sport => sportKey.toLowerCase().includes(sport.toLowerCase())) ||
         sportKey.toLowerCase().includes('soccer') ||
         sportKey.toLowerCase().includes('football') && !sportKey.toLowerCase().includes('american');
}

// Check if spread arbitrage is valid (opposing spreads)
function isValidSpreadArbitrage(option1Name: string, option2Name: string, betType: string): boolean {
  if (betType !== 'spread' && betType !== 'alternate_spreads') {
    return true; // Not a spread bet, no validation needed
  }
  
  // Extract spread values from option names - handle multiple formats
  const spread1Match = option1Name.match(/([+-]?\d+\.?\d*)/);
  const spread2Match = option2Name.match(/([+-]?\d+\.?\d*)/);
  
  if (!spread1Match || !spread2Match) {
    console.log(`❌ Spread validation failed: Cannot extract spread values from "${option1Name}" and "${option2Name}"`);
    return false; // Can't determine spread values
  }
  
  const spread1 = parseFloat(spread1Match[1]);
  const spread2 = parseFloat(spread2Match[1]);
  
  // Valid spread arbitrage requires opposing spreads (one positive, one negative, equal magnitude)
  const areOpposing = Math.abs(spread1 + spread2) < 0.1; // Allow small floating point differences
  const differentSigns = (spread1 > 0 && spread2 < 0) || (spread1 < 0 && spread2 > 0);
  
  const isValid = areOpposing && differentSigns;
  
  if (!isValid) {
    console.log(`❌ Invalid spread arbitrage: ${option1Name} (${spread1}) vs ${option2Name} (${spread2}) - not exact opposites`);
  } else {
    console.log(`✅ Valid spread arbitrage: ${option1Name} (${spread1}) vs ${option2Name} (${spread2})`);
  }
  
  return isValid;
}

// Check if totals arbitrage is valid (exact same point value)
function isValidTotalsArbitrage(option1Name: string, option2Name: string, betType: string): boolean {
  if (betType !== 'total' && betType !== 'alternate_totals') {
    return true; // Not a totals bet, no validation needed
  }
  
  // Extract point values from option names (Over/Under must have same point value)
  const point1Match = option1Name.match(/(\d+\.?\d*)/);
  const point2Match = option2Name.match(/(\d+\.?\d*)/);
  
  if (!point1Match || !point2Match) {
    console.log(`❌ Totals validation failed: Cannot extract point values from "${option1Name}" and "${option2Name}"`);
    return false; // Can't determine point values
  }
  
  const point1 = parseFloat(point1Match[1]);
  const point2 = parseFloat(point2Match[1]);
  
  // Valid totals arbitrage requires EXACT same point value
  const exactMatch = Math.abs(point1 - point2) < 0.01; // Very small tolerance for floating point
  
  // Check if we have one Over and one Under
  const isOver1 = option1Name.toLowerCase().includes('over');
  const isUnder1 = option1Name.toLowerCase().includes('under');
  const isOver2 = option2Name.toLowerCase().includes('over');
  const isUnder2 = option2Name.toLowerCase().includes('under');
  
  const hasOverAndUnder = (isOver1 && isUnder2) || (isUnder1 && isOver2);
  
  const isValid = exactMatch && hasOverAndUnder;
  
  if (!isValid) {
    if (!exactMatch) {
      console.log(`❌ Invalid totals arbitrage: Different point values ${point1} vs ${point2}. Score between these values would lose both bets.`);
    } else if (!hasOverAndUnder) {
      console.log(`❌ Invalid totals arbitrage: Need one Over and one Under, got "${option1Name}" vs "${option2Name}"`);
    }
  } else {
    console.log(`✅ Valid totals arbitrage: ${option1Name} vs ${option2Name} (same point value: ${point1})`);
  }
  
  return isValid;
}

// Filter totals markets to only include those with matching point values for valid arbitrage
function filterTotalsMarketsByPointValue(marketData: any): any {
  const filtered: any = {};
  const pointValueGroups: { [point: string]: string[] } = {};
  
  // Group markets by their point values
  Object.keys(marketData).forEach(marketKey => {
    const market = marketData[marketKey];
    if (market && market.option1 && market.option2) {
      // Extract point value from either option (they should be the same for valid totals)
      const option1Match = market.option1.name.match(/(\d+\.?\d*)/);
      const option2Match = market.option2.name.match(/(\d+\.?\d*)/);
      
      if (option1Match && option2Match) {
        const point1 = parseFloat(option1Match[1]);
        const point2 = parseFloat(option2Match[1]);
        
        // Only include if both options have the same point value (valid Over/Under pair)
        if (Math.abs(point1 - point2) < 0.01) {
          const pointValue = point1.toString();
          if (!pointValueGroups[pointValue]) {
            pointValueGroups[pointValue] = [];
          }
          pointValueGroups[pointValue].push(marketKey);
        }
      }
    }
  });
  
  // Find the point value with the most bookmakers (most liquid for arbitrage)
  let bestPointValue = '';
  let maxBookmakers = 0;
  
  Object.entries(pointValueGroups).forEach(([pointValue, marketKeys]) => {
    if (marketKeys.length > maxBookmakers) {
      maxBookmakers = marketKeys.length;
      bestPointValue = pointValue;
    }
  });
  
  // Return only markets with the most common point value
  if (bestPointValue && pointValueGroups[bestPointValue].length >= 2) {
    pointValueGroups[bestPointValue].forEach(marketKey => {
      filtered[marketKey] = marketData[marketKey];
    });
    
    console.log(`✅ Filtered totals markets: Using point value ${bestPointValue} with ${maxBookmakers} bookmakers`);
  } else {
    console.log(`❌ No valid totals arbitrage: Insufficient markets with matching point values`);
  }
  
  return filtered;
}

// Enhanced validation for spread markets from different bookmakers
function validateSpreadMarketCombination(market1: any, market2: any, betType: string): { isValid: boolean; reason?: string } {
  if (betType !== 'spread' && betType !== 'alternate_spreads') {
    return { isValid: true };
  }
  
  // Both markets must have option1 and option2
  if (!market1?.option1 || !market1?.option2 || !market2?.option1 || !market2?.option2) {
    return { isValid: false, reason: 'Missing spread options in one or both markets' };
  }
  
  // Extract spread values from all options
  const extractSpread = (name: string): number | null => {
    const match = name.match(/([+-]?\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  };
  
  const m1s1 = extractSpread(market1.option1.name);
  const m1s2 = extractSpread(market1.option2.name);
  const m2s1 = extractSpread(market2.option1.name);
  const m2s2 = extractSpread(market2.option2.name);
  
  if (m1s1 === null || m1s2 === null || m2s1 === null || m2s2 === null) {
    return { isValid: false, reason: 'Cannot extract spread values from option names' };
  }
  
  // Check if any combination creates valid opposing spreads
  const validCombinations = [
    { spread1: m1s1, spread2: m2s1, names: [market1.option1.name, market2.option1.name] },
    { spread1: m1s1, spread2: m2s2, names: [market1.option1.name, market2.option2.name] },
    { spread1: m1s2, spread2: m2s1, names: [market1.option2.name, market2.option1.name] },
    { spread1: m1s2, spread2: m2s2, names: [market1.option2.name, market2.option2.name] }
  ];
  
  for (const combo of validCombinations) {
    const areOpposing = Math.abs(combo.spread1 + combo.spread2) < 0.1;
    const differentSigns = (combo.spread1 > 0 && combo.spread2 < 0) || (combo.spread1 < 0 && combo.spread2 > 0);
    
    if (areOpposing && differentSigns) {
      return { isValid: true };
    }
  }
  
  return { 
    isValid: false, 
    reason: `No valid spread combination found. Spreads: [${m1s1}, ${m1s2}] vs [${m2s1}, ${m2s2}]` 
  };
}

// Enhanced arbitrage calculation for different bet types
function findBestArbitrageOpportunityForBetType(
  marketData: any,
  betType: string,
  gameName: string,
  totalStake: number,
  sportKey: string = ''
): ArbitrageOpportunity {
  const bookmakers = Object.keys(marketData);
  if (bookmakers.length < 2) {
    return {
      isArbitrage: false,
      profitMargin: 0,
      guaranteedProfit: 0,
      totalStake,
      bets: [],
      game: gameName,
      team1: '',
      team2: '',
      totalBookmakers: bookmakers.length
    };
  }

  // Find best odds for each outcome
  let bestOption1 = { bookmaker: '', odds: -Infinity, name: '' };
  let bestOption2 = { bookmaker: '', odds: -Infinity, name: '' };
  
  bookmakers.forEach(bookmaker => {
    const market = marketData[bookmaker];
    if (market && market.option1 && market.option2) {
      if (market.option1.odds > bestOption1.odds) {
        bestOption1 = {
          bookmaker,
          odds: market.option1.odds,
          name: market.option1.name
        };
      }
      if (market.option2.odds > bestOption2.odds) {
        bestOption2 = {
          bookmaker,
          odds: market.option2.odds,
          name: market.option2.name
        };
      }
    }
  });

  // Don't allow same bookmaker for both sides
  if (bestOption1.bookmaker === bestOption2.bookmaker) {
    // Find second best odds for one of the options
    let secondBestOption2 = { bookmaker: '', odds: -Infinity, name: '' };
    bookmakers.forEach(bookmaker => {
      if (bookmaker !== bestOption1.bookmaker) {
        const market = marketData[bookmaker];
        if (market && market.option2 && market.option2.odds > secondBestOption2.odds) {
          secondBestOption2 = {
            bookmaker,
            odds: market.option2.odds,
            name: market.option2.name
          };
        }
      }
    });
    if (secondBestOption2.odds > -Infinity) {
      bestOption2 = secondBestOption2;
    }
  }

  // Convert American odds to decimal for calculations
  const decimal1 = americanToDecimal(bestOption1.odds);
  const decimal2 = americanToDecimal(bestOption2.odds);
  
  // Calculate implied probabilities
  const impliedProb1 = 1 / decimal1;
  const impliedProb2 = 1 / decimal2;
  const totalImpliedProb = impliedProb1 + impliedProb2;
  
  // Validate arbitrage conditions before calculating
  
  // 1. Check for draw risk sports - filter out bet types that can have draws
  const drawRiskBetTypes = [
    'moneyline', 'h2h', 'match_winner', 'full_time_result', 'regulation_time',
    'three_way', '3way', 'match_result', 'game_winner', 'outright', 'winner',
    'head_to_head', 'match_odds', 'ft_result', 'match_betting'
  ];
  
  if (hasDrawRisk(sportKey) && drawRiskBetTypes.some(type => 
    betType.toLowerCase().includes(type.toLowerCase()) || 
    betType.toLowerCase() === type.toLowerCase()
  )) {
    return {
      isArbitrage: false,
      profitMargin: 0,
      guaranteedProfit: 0,
      totalStake,
      bets: [],
      game: gameName,
      team1: bestOption1.name,
      team2: bestOption2.name,
      totalBookmakers: bookmakers.length,
      riskWarning: `Draw risk: ${betType} bets in this sport can end in draws/ties, invalidating 2-outcome arbitrage`
    };
  }
  
  // 2. Validate spread arbitrage (must have opposing spreads)
  if (betType === 'spread' || betType === 'alternate_spreads') {
    // Enhanced spread validation - check if we have valid opposing spreads
    if (!isValidSpreadArbitrage(bestOption1.name, bestOption2.name, betType)) {
      return {
        isArbitrage: false,
        profitMargin: 0,
        guaranteedProfit: 0,
        totalStake,
        bets: [],
        game: gameName,
        team1: bestOption1.name,
        team2: bestOption2.name,
        totalBookmakers: bookmakers.length,
        riskWarning: `Invalid spread: Spreads must be exact opposites (e.g., +6.5 vs -6.5). Found: ${bestOption1.name} vs ${bestOption2.name}`
      };
    }
    
    // Additional validation to prevent scenarios like Over 6.5 vs Under 5.5
    const extractSpread = (name: string): number | null => {
      const match = name.match(/([+-]?\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : null;
    };
    
    const spread1 = extractSpread(bestOption1.name);
    const spread2 = extractSpread(bestOption2.name);
    
    if (spread1 !== null && spread2 !== null) {
      // Check if spreads are not opposing (like 6.5 and 5.5 instead of 6.5 and -6.5)
      if ((spread1 > 0 && spread2 > 0) || (spread1 < 0 && spread2 < 0)) {
        return {
          isArbitrage: false,
          profitMargin: 0,
          guaranteedProfit: 0,
          totalStake,
          bets: [],
          game: gameName,
          team1: bestOption1.name,
          team2: bestOption2.name,
          totalBookmakers: bookmakers.length,
          riskWarning: `Invalid spread combination: Both spreads are on the same side (${spread1} and ${spread2}). Need opposing spreads.`
        };
      }
    }
  }

  // 3. Validate totals arbitrage (must have exact same point value)
  if (betType === 'total' || betType === 'alternate_totals') {
    // Enhanced totals validation - check if we have valid Over/Under with same point value
    if (!isValidTotalsArbitrage(bestOption1.name, bestOption2.name, betType)) {
      return {
        isArbitrage: false,
        profitMargin: 0,
        guaranteedProfit: 0,
        totalStake,
        bets: [],
        game: gameName,
        team1: bestOption1.name,
        team2: bestOption2.name,
        totalBookmakers: bookmakers.length,
        riskWarning: `Invalid totals: Over/Under must have exact same point value. Found: ${bestOption1.name} vs ${bestOption2.name}. A score between these values would lose both bets.`
      };
    }
  }

  // Check if arbitrage exists
  const isArbitrage = totalImpliedProb < 1;
  const profitMargin = isArbitrage ? ((1 - totalImpliedProb) / totalImpliedProb) * 100 : 0;
  
  if (!isArbitrage) {
    return {
      isArbitrage: false,
      profitMargin: 0,
      guaranteedProfit: 0,
      totalStake,
      bets: [],
      game: gameName,
      team1: bestOption1.name,
      team2: bestOption2.name,
      totalBookmakers: bookmakers.length
    };
  }
  
  // Calculate optimal stakes
  const stake1 = totalStake * impliedProb1 / totalImpliedProb;
  const stake2 = totalStake * impliedProb2 / totalImpliedProb;
  
  const payout1 = stake1 * decimal1;
  const payout2 = stake2 * decimal2;
  const guaranteedProfit = Math.min(payout1, payout2) - totalStake;
  
  return {
    isArbitrage: true,
    profitMargin,
    guaranteedProfit,
    totalStake,
    bets: [
      {
        bookmaker: bestOption1.bookmaker,
        team: bestOption1.name,
        odds: bestOption1.odds,
        stake: stake1,
        potentialPayout: payout1
      },
      {
        bookmaker: bestOption2.bookmaker,
        team: bestOption2.name,
        odds: bestOption2.odds,
        stake: stake2,
        potentialPayout: payout2
      }
    ],
    game: gameName,
    team1: bestOption1.name,
    team2: bestOption2.name,
    totalBookmakers: bookmakers.length
  };
}

// Helper function to convert American odds to decimal
function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

// Enhanced arbitrage calculation specifically for player props
function findBestPlayerPropArbitrage(
  playerPropsData: any,
  gameName: string,
  totalStake: number
): ArbitrageOpportunity {
  let bestArbitrage: ArbitrageOpportunity = {
    isArbitrage: false,
    profitMargin: 0,
    guaranteedProfit: 0,
    totalStake,
    bets: [],
    game: gameName,
    team1: '',
    team2: '',
    totalBookmakers: 0
  };

  // Iterate through all player props to find the best arbitrage opportunity
  Object.entries(playerPropsData).forEach(([propKey, propData]: [string, any]) => {
    if (propData.player && propData.prop && propData.markets) {
      const markets = propData.markets;
      const bookmakers = Object.keys(markets);
      
      if (bookmakers.length >= 2) {
        // Look for over/under arbitrage opportunities
        let bestOver = { bookmaker: '', odds: -Infinity };
        let bestUnder = { bookmaker: '', odds: -Infinity };
        
        bookmakers.forEach(bookmaker => {
          const market = markets[bookmaker];
          if (market.over && market.over.odds > bestOver.odds) {
            bestOver = { bookmaker, odds: market.over.odds };
          }
          if (market.under && market.under.odds > bestUnder.odds) {
            bestUnder = { bookmaker, odds: market.under.odds };
          }
        });

        // Calculate arbitrage if we have both over and under from different bookmakers
        if (bestOver.bookmaker && bestUnder.bookmaker && bestOver.bookmaker !== bestUnder.bookmaker) {
          const decimalOver = americanToDecimal(bestOver.odds);
          const decimalUnder = americanToDecimal(bestUnder.odds);
          
          const impliedProbOver = 1 / decimalOver;
          const impliedProbUnder = 1 / decimalUnder;
          const totalImpliedProb = impliedProbOver + impliedProbUnder;
          
          if (totalImpliedProb < 1) {
            const profitMargin = ((1 - totalImpliedProb) / totalImpliedProb) * 100;
            
            if (profitMargin > bestArbitrage.profitMargin) {
              const stakeOver = totalStake * impliedProbOver / totalImpliedProb;
              const stakeUnder = totalStake * impliedProbUnder / totalImpliedProb;
              
              const payoutOver = stakeOver * decimalOver;
              const payoutUnder = stakeUnder * decimalUnder;
              const guaranteedProfit = Math.min(payoutOver, payoutUnder) - totalStake;
              
              bestArbitrage = {
                isArbitrage: true,
                profitMargin,
                guaranteedProfit,
                totalStake,
                bets: [
                  {
                    bookmaker: bestOver.bookmaker,
                    team: `${propData.player} Over ${propData.markets[bestOver.bookmaker].over.point}`,
                    odds: bestOver.odds,
                    stake: stakeOver,
                    potentialPayout: payoutOver
                  },
                  {
                    bookmaker: bestUnder.bookmaker,
                    team: `${propData.player} Under ${propData.markets[bestUnder.bookmaker].under.point}`,
                    odds: bestUnder.odds,
                    stake: stakeUnder,
                    potentialPayout: payoutUnder
                  }
                ],
                game: `${propData.player} - ${propData.prop}`,
                team1: `Over ${propData.markets[bestOver.bookmaker].over.point}`,
                team2: `Under ${propData.markets[bestUnder.bookmaker].under.point}`,
                totalBookmakers: bookmakers.length
              };
            }
          }
        }
      }
    }
  });

  return bestArbitrage;
}