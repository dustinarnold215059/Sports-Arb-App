'use client';

import { useState, useEffect } from 'react';
import { 
  findBestArbitrageOpportunity, 
  formatAmericanOdds, 
  ArbitrageOpportunity, 
  MultiBookmakerOdds,
  SPORTSBOOKS,
  getBookmakerColor
} from '@/lib/arbitrage';
import { decimalToAmerican, formatAmericanOdds as utilFormatAmericanOdds } from '@/lib/utils';
import { BetTracker } from '@/components/BetTracker';
import { 
  fetchLiveOdds, 
  transformOddsData, 
  RateLimiter, 
  SUPPORTED_SPORTS,
  getSportsWithGames
} from '@/lib/oddsAPI';

const rateLimiter = new RateLimiter();

export function ArbitrageScanner() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [totalStake, setTotalStake] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [totalGames, setTotalGames] = useState(0);
  const [scannedSports, setScannedSports] = useState(0);
  const [totalSports, setTotalSports] = useState(0);
  const [activeSports, setActiveSports] = useState<string[]>([]);
  const [showBetTracker, setShowBetTracker] = useState<{ show: boolean; opportunity?: ArbitrageOpportunity }>({ show: false });

  const scanForOpportunities = async () => {
    const remainingRequests = rateLimiter.getRemainingRequests();
    
    // OPTIMIZED: Get sports with games efficiently
    let sportsToScan: string[];
    try {
      rateLimiter.recordRequest(); // Count the validation request  
      sportsToScan = await getSportsWithGames();
      console.log(`🎯 Found ${sportsToScan.length} sports to scan with optimized priority`);
    } catch (err) {
      console.error('Failed to get sports with games, using fallback:', err);
      sportsToScan = [
        'americanfootball_nfl', 'basketball_nba', 'soccer_epl',
        'soccer_spain_la_liga', 'basketball_ncaab', 'mma_mixed_martial_arts'
      ];
    }
    
    const totalSportsCount = sportsToScan.length;
    
    // Prioritize two-outcome sports with higher probability of having games
    const prioritySports = [
      'americanfootball_nfl', 'basketball_nba', 'baseball_mlb', 'basketball_ncaab', 
      'americanfootball_ncaaf', 'basketball_wnba', 'mma_mixed_martial_arts',
      'tennis_atp_us_open', 'tennis_wta_us_open', 'golf_pga_championship'
    ];
    
    // SMART SCANNING: Use ALL sports but with intelligent batching
    const maxConcurrent = Math.min(remainingRequests - 1, 20); // Save 1 request, max 20 concurrent
    const sportsToActuallyScan = sportsToScan.slice(0, maxConcurrent);
    
    console.log(`⚡ Smart scan: ${sportsToActuallyScan.length}/${sportsToScan.length} sports selected for optimal API usage`);
    
    if (sportsToActuallyScan.length === 0) {
      setError(`No API requests remaining. Current limit: ${rateLimiter.getRemainingRequests()}\n\nTip: Each scan uses 1 request per sport. Try again later when your rate limit resets.`);
      return;
    }

    setIsScanning(true);
    setError(null);
    setTotalSports(totalSportsCount);
    setScannedSports(0);
    
    try {
      // ULTRA-EFFICIENT: Smart batching with early success detection
      const batchSize = 5; // Smaller batches for faster response
      const allGames: any[] = [];
      let totalGamesCount = 0;
      let processedCount = 0;
      let foundGames = 0;
      
      for (let i = 0; i < sportsToActuallyScan.length; i += batchSize) {
        const batch = sportsToActuallyScan.slice(i, i + batchSize);
        
        // Early exit if we found enough games
        if (foundGames >= 50) {
          console.log(`🎯 Early exit: Found ${foundGames} games, stopping scan to save API requests`);
          break;
        }
        
        const batchPromises = batch.map(async (sport) => {
          try {
            rateLimiter.recordRequest();
            const data = await fetchLiveOdds(sport);
            processedCount++;
            setScannedSports(processedCount);
            const sportName = Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === sport)?.[0] || sport;
            console.log(`✅ ${sportName}: ${data.length} games found`);
            return { sport, data, sportName };
          } catch (err: any) {
            const sportName = Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === sport)?.[0] || sport;
            
            // Only log actual errors, not just "no games" situations
            if (err.message?.includes('404')) {
              console.warn(`⚠️ ${sportName}: Sport not available in API`);
            } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
              console.warn(`🚫 ${sportName}: Rate limit hit`);
            } else {
              console.error(`❌ ${sportName}:`, err.message);
            }
            
            processedCount++;
            setScannedSports(processedCount);
            return { sport, data: [], sportName };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // SMART PROCESSING: Enhanced logging with risk warnings
        const sportsWithGames: string[] = [];
        batchResults.forEach(({ sport, data, sportName }) => {
          if (data && data.length > 0) {
            const transformedGames = transformOddsData(data);
            const gamesWithSport = transformedGames.map(game => ({
              ...game,
              sport: sport,
              sportName: sportName
            }));
            allGames.push(...gamesWithSport);
            totalGamesCount += data.length;
            foundGames += transformedGames.length;
            sportsWithGames.push(sportName);
            
            // Enhanced logging with risk info
            const riskGames = transformedGames.filter(game => game.hasDrawRisk).length;
            const safeGames = transformedGames.length - riskGames;
            console.log(`✅ ${sportName}: ${transformedGames.length} games (${safeGames} safe, ${riskGames} with draw risk)`);
          } else {
            console.log(`📅 ${sportName}: No games scheduled`);
          }
        });
        
        setActiveSports([...new Set([...activeSports, ...sportsWithGames])]);
        
        // Minimal delay for faster scanning
        if (i + batchSize < sportsToActuallyScan.length && foundGames < 50) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setTotalGames(totalGamesCount);
      
      if (allGames.length === 0) {
        const scannedSportNames = Object.entries(SUPPORTED_SPORTS)
          .filter(([, value]) => sportsToActuallyScan.includes(value))
          .map(([name]) => name)
          .join(', ');
          
        // Get current date info for better error message
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const isBasketballSeason = month >= 10 || month <= 4; // Oct-Apr
        const isBaseballSeason = month >= 3 && month <= 10; // Mar-Oct
        const isFootballSeason = month >= 9 && month <= 1; // Sep-Jan
        
        let seasonInfo = '\n\nCurrent Season Status:';
        if (isBasketballSeason) seasonInfo += '\n🏀 Basketball: IN SEASON';
        else seasonInfo += '\n🏀 Basketball: OFF-SEASON';
        
        if (isBaseballSeason) seasonInfo += '\n⚾ Baseball: IN SEASON';
        else seasonInfo += '\n⚾ Baseball: OFF-SEASON';
        
        if (isFootballSeason) seasonInfo += '\n🏈 Football: IN SEASON';
        else seasonInfo += '\n🏈 Football: OFF-SEASON';
        
        seasonInfo += '\n🥊 UFC: Event-based (check UFC schedule)';
        seasonInfo += '\n🎾 Tennis: Year-round (check tournament calendar)';
        
        setError(`No games found across ${sportsToActuallyScan.length} sports/leagues.${seasonInfo}\n\nScanned: ${scannedSportNames || 'Various sports'}\n\nTip: Try again during active sports seasons or when major tournaments are happening.`);
        setOpportunities([]);
        return;
      }
      
      const found: ArbitrageOpportunity[] = [];
      
      allGames.forEach(game => {
        if (Object.keys(game.odds).length >= 2) {
          const opportunity = findBestArbitrageOpportunity(
            game.odds,
            game.team1,
            game.team2,
            `${game.game} (${game.sportName})${game.hasDrawRisk ? ' ⚠️' : ''}`,
            totalStake
          );
          
          if (opportunity.isArbitrage) {
            // Add risk warning to opportunity
            opportunity.riskWarning = game.riskWarning;
            opportunity.hasDrawRisk = game.hasDrawRisk;
            found.push(opportunity);
          }
        }
      });
      
      found.sort((a, b) => b.profitMargin - a.profitMargin);
      setOpportunities(found);
      
    } catch (err: any) {
      console.error('Error scanning for opportunities:', err);
      setError(err.message || 'Failed to fetch live odds data');
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Arbitrage Scanner
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Scan {Object.keys(SUPPORTED_SPORTS).length}+ sports & leagues worldwide (includes soccer/hockey with draw risk warnings)
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Stake Amount
            </label>
            <input
              type="number"
              value={totalStake}
              onChange={(e) => setTotalStake(Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={scanForOpportunities}
            disabled={isScanning || !rateLimiter.canMakeRequest()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isScanning || !rateLimiter.canMakeRequest()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isScanning ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning {scannedSports}/{totalSports} Sports...</span>
              </div>
            ) : (
`Smart Scan All Sports`
            )}
          </button>
        </div>
      </div>

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
            API requests remaining: {rateLimiter.getRemainingRequests()}
          </div>
        </div>
        
        {activeSports.length > 0 && (
          <div className="text-xs text-green-600 dark:text-green-400">
            ✅ Active sports with games: {activeSports.join(', ')}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="text-red-500">⚠️</div>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Scanner Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isScanning ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Smart scanning {Object.keys(SUPPORTED_SPORTS).length}+ global sports & leagues...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Progress: {scannedSports}/{totalSports} sports scanned
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Smart API optimization: scans high-priority leagues first, stops early when games found
          </p>
        </div>
      ) : (
        <>
          {opportunities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Arbitrage Opportunities Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No profitable arbitrage opportunities were detected in the current scan.
                <br />
                Opportunities are rare and market conditions change quickly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                  🎯 {opportunities.length} Opportunity{opportunities.length !== 1 ? 's' : ''} Found
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total potential profit: $
                  {opportunities.reduce((sum, opp) => sum + opp.guaranteedProfit, 0).toFixed(2)}
                </div>
              </div>

              {opportunities.map((opportunity, index) => (
                <div key={index} className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {opportunity.game}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Compared {opportunity.totalBookmakers} sportsbooks
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${opportunity.guaranteedProfit.toFixed(2)} profit
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {opportunity.profitMargin.toFixed(2)}% margin
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {opportunity.bets.map((bet, betIndex) => {
                      const colors = getBookmakerColor(bet.bookmaker);
                      return (
                        <div key={betIndex} className={`p-3 rounded border ${colors.bg} ${colors.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${colors.text}`}>
                              {bet.bookmaker}
                            </span>
                            <span className="text-sm font-mono">
                              {formatAmericanOdds(bet.odds)}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Bet:</span>
                              <span className="font-medium">{bet.team}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Odds:</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {Math.abs(bet.odds) < 10 
                                  ? utilFormatAmericanOdds(decimalToAmerican(bet.odds))
                                  : formatAmericanOdds(bet.odds)
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Stake:</span>
                              <span className="font-medium">${bet.stake.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Payout:</span>
                              <span className="font-medium">${bet.potentialPayout.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 space-y-2">
                    {opportunity.hasDrawRisk && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
                        <strong>⚠️ DRAW RISK WARNING:</strong> This sport can end in ties/draws. You could lose money if the game doesn't have a clear winner. Consider avoiding unless you're experienced with three-outcome arbitrage.
                      </div>
                    )}
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>Action Required:</strong> Place bets quickly as odds change rapidly. 
                      Verify current odds before betting across all sportsbooks.
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setShowBetTracker({ show: true, opportunity })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <span>📝</span>
                        <span>Record This Arbitrage</span>
                      </button>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Click to track this opportunity in your portfolio
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
            🚀 Smart Optimization Features
          </h4>
          <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
            <li>• <strong>Minimal API Usage:</strong> 30-min caching, smart batching, early exit when games found</li>
            <li>• <strong>Priority Scanning:</strong> High-activity leagues scanned first (NFL, NBA, EPL, etc.)</li>
            <li>• <strong>Maximum Coverage:</strong> {Object.keys(SUPPORTED_SPORTS).length}+ sports & leagues worldwide</li>
            <li>• <strong>Draw Risk Warnings:</strong> Soccer/hockey games clearly marked with risk alerts</li>
            <li>• <strong>Efficient Batching:</strong> Stops scanning when sufficient opportunities found</li>
          </ul>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            ⚠️ Important Disclaimers
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Arbitrage opportunities are rare and may disappear quickly</li>
            <li>• Always verify odds are current before placing bets</li>
            <li>• Account limits and betting restrictions may apply</li>
            <li>• Consider transaction fees and withdrawal times</li>
            <li>• <strong>Draw Risk:</strong> Soccer/hockey can end in ties - you could lose money</li>
            <li>• This is for educational purposes - bet responsibly</li>
          </ul>
        </div>
      </div>

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
    </div>
  );
}