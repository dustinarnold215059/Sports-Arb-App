'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import Link from "next/link";
import { ModernCard, ModernCardHeader, ModernCardBody } from "../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../shared/components/ui/ModernBadge";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "../shared/auth/authProvider";
import { useRealGameData } from '@/hooks/useRealGameData';
import { useArbitrageStats } from '@/hooks/useArbitrageStats';
import { userDatabase } from '@/lib/userDatabase';
import { betTracker } from '@/lib/betTracking';
import { LoadingSkeleton, CardSkeleton } from "../shared/components/ui/LoadingSkeleton";

// Dynamic imports for components that might not be immediately needed
const AuthModal = lazy(() => import("../shared/components/AuthModal").then(module => ({ default: module.AuthModal })));
const LiveScores = lazy(() => import("@/components/LiveScores").then(module => ({ default: module.LiveScores })));
const OddsTable = lazy(() => import("@/components/OddsTable").then(module => ({ default: module.OddsTable })));

export default function Home() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [chartTimeframe, setChartTimeframe] = useState<'1W' | '1M' | '1Y'>('1M');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [performanceView, setPerformanceView] = useState<'bookmaker' | 'betType' | 'sport'>('bookmaker');
  const [showAddBetModal, setShowAddBetModal] = useState(false);
  const [selectedBookmaker, setSelectedBookmaker] = useState('');
  
  // Use real game data from The Odds API
  const { games, stats: gameStats, loading: gamesLoading, error: gamesError, refetch } = useRealGameData();
  
  // Use real arbitrage statistics
  const { stats: arbitrageStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useArbitrageStats();

  // Get real platform stats from user database
  const platformStats = userDatabase.getPlatformStats();
  const allUsers = userDatabase.getAllUsers();
  
  // Get global portfolio performance data from bet tracker (all users)
  const globalPortfolioStats = betTracker.getGlobalPlatformStats();
  
  // For individual components, we need to temporarily set user to null to get all bets
  const [allBets, setAllBets] = useState<any[]>([]);
  const [arbitrageGroups, setArbitrageGroups] = useState<any[]>([]);
  const [userPortfolio, setUserPortfolio] = useState<any>(null);
  
  useEffect(() => {
    const currentUser = betTracker.currentUserId;
    
    // Get global data for platform stats
    betTracker.setCurrentUser(null);
    setAllBets(betTracker.getAllBets());
    setArbitrageGroups(betTracker.getArbitrageGroups());
    
    // Get user-specific data for performance chart
    if (isAuthenticated && user) {
      betTracker.setCurrentUser(user.id);
      setUserPortfolio(betTracker.getPortfolioStats());
      betTracker.setCurrentUser(currentUser); // Restore original user
    } else {
      setUserPortfolio(null);
    }
  }, [user, isAuthenticated]);

  // Generate performance data based on timeframe using real user bet data
  const generatePerformanceData = (timeframe: '1W' | '1M' | '1Y') => {
    if (!isAuthenticated || !user || !userPortfolio) {
      return [];
    }

    const now = new Date();
    const dataPoints: { date: string; profit: number; cumulative: number }[] = [];
    let dataCount = 0;
    let intervalDays = 0;

    switch (timeframe) {
      case '1W':
        dataCount = 7;
        intervalDays = 1;
        break;
      case '1M':
        dataCount = 30;
        intervalDays = 1;
        break;
      case '1Y':
        dataCount = 12;
        intervalDays = 30;
        break;
    }

    // Get user's actual bets
    const currentUser = betTracker.currentUserId;
    betTracker.setCurrentUser(user.id);
    const userBets = betTracker.getAllBets();
    betTracker.setCurrentUser(currentUser);

    // Group bets by date periods
    const betsByPeriod: Record<string, any[]> = {};
    
    for (let i = dataCount - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * intervalDays));
      
      const periodKey = timeframe === '1Y' 
        ? `${date.getFullYear()}-${date.getMonth()}` 
        : date.toDateString();
      
      betsByPeriod[periodKey] = [];
    }

    // Categorize actual bets into periods
    userBets.forEach(bet => {
      const betDate = new Date(bet.timestamp);
      const periodKey = timeframe === '1Y' 
        ? `${betDate.getFullYear()}-${betDate.getMonth()}` 
        : betDate.toDateString();
      
      if (betsByPeriod[periodKey]) {
        betsByPeriod[periodKey].push(bet);
      }
    });

    let cumulativeProfit = 0;

    for (let i = dataCount - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * intervalDays));
      
      const periodKey = timeframe === '1Y' 
        ? `${date.getFullYear()}-${date.getMonth()}` 
        : date.toDateString();

      // Calculate actual profit for this period
      const periodBets = betsByPeriod[periodKey] || [];
      const periodProfit = periodBets.reduce((sum, bet) => {
        return sum + (bet.profit || 0);
      }, 0);

      cumulativeProfit += periodProfit;

      dataPoints.push({
        date: timeframe === '1Y' ? date.toLocaleDateString('en-US', { month: 'short' }) : 
              timeframe === '1M' ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
              date.toLocaleDateString('en-US', { weekday: 'short' }),
        profit: periodProfit,
        cumulative: cumulativeProfit
      });
    }

    return dataPoints;
  };

  const performanceData = generatePerformanceData(chartTimeframe);
  
  // Calculate active traders in last 30 days (users with activity in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeTraders30Days = allUsers.filter(user => 
    new Date(user.stats.lastActivity) > thirtyDaysAgo
  ).length;

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSportEmoji = (sport: string) => {
    const sportEmojis: Record<string, string> = {
      'football': '🏈',
      'basketball': '🏀',
      'baseball': '⚾',
      'soccer': '⚽',
      'hockey': '🏒',
      'tennis': '🎾',
      'golf': '⛳',
      'boxing': '🥊',
      'mma': '🥊',
      'ufc': '🥊',
      'volleyball': '🏐',
      'cricket': '🏏',
      'rugby': '🏉',
      'swimming': '🏊',
      'track': '🏃',
      'cycling': '🚴',
      'skiing': '⛷️',
      'snowboarding': '🏂',
      'surfing': '🏄',
      'motorsports': '🏎️',
      'racing': '🏎️',
      'esports': '🎮',
      'darts': '🎯',
      'snooker': '🎱',
      'table tennis': '🏓',
      'badminton': '🏸',
      'archery': '🏹',
      'wrestling': '🤼',
      'weightlifting': '🏋️',
      'gymnastics': '🤸',
      'ice skating': '⛸️',
      'curling': '🥌'
    };
    
    const lowerSport = sport.toLowerCase();
    return sportEmojis[lowerSport] || '🏆'; // Default trophy emoji for unknown sports
  };

  // Transform real game data to OddsTable format
  const transformGamesToOddsData = () => {
    if (!games || games.length === 0) return [];
    
    return games.slice(0, 5).map(game => {
      // Create some sample bookmaker data since the current structure might not have multiple bookmakers
      const sampleBookmakers = [
        {
          key: 'draftkings',
          title: 'DraftKings',
          lastUpdate: new Date().toISOString(),
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: game.away, price: parseInt(game.odds.away.replace(/[+]/g, '')) || 100 },
                { name: game.home, price: parseInt(game.odds.home.replace(/[+]/g, '')) || 100 }
              ]
            }
          ]
        },
        {
          key: 'fanduel',
          title: 'FanDuel',
          lastUpdate: new Date().toISOString(),
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: game.away, price: (parseInt(game.odds.away.replace(/[+]/g, '')) || 100) + 5 },
                { name: game.home, price: (parseInt(game.odds.home.replace(/[+]/g, '')) || 100) - 5 }
              ]
            }
          ]
        }
      ];

      return {
        id: game.id,
        sportKey: game.sport,
        sportTitle: game.league,
        commenceTime: game.commence_time,
        homeTeam: game.home,
        awayTeam: game.away,
        bookmakers: sampleBookmakers
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <Navigation onAuthClick={handleAuthClick} />

      {/* Page Stats Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">SportsArb Professional</h1>
              <p className="text-gray-400 text-sm">Advanced Arbitrage Trading Platform</p>
            </div>
            
            {/* Live Status */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Live Opportunities</div>
                <div className="text-lg font-bold text-green-400">
                  {statsLoading ? '...' : arbitrageStats.activeOpportunities}
                </div>
              </div>
              <div className={`status-indicator ${statsError ? 'status-error' : statsLoading ? 'status-warning' : 'status-active'}`}>
                <span>{statsError ? 'API Error' : statsLoading ? 'Loading...' : 'System Active'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error handling for stats */}
        {statsError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="text-red-500">⚠️</div>
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-300">
                  Unable to Load Real-time Stats
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {statsError.includes('OUT OF API REQUESTS') 
                    ? 'API quota exceeded. Statistics will update when quota resets.'
                    : 'Error calculating arbitrage statistics. Showing fallback data.'
                  }
                </p>
              </div>
              <ModernButton onClick={refetchStats} variant="ghost" size="sm">
                Retry
              </ModernButton>
            </div>
          </div>
        )}

        {/* Hero Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className="metric-value profit-loss positive">
              {statsLoading ? (
                <div className="w-20 h-8 bg-gray-600 animate-pulse rounded"></div>
              ) : (
                `$${arbitrageStats.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              )}
            </div>
            <div className="metric-label">Available Profit</div>
            <div className="metric-change profit-loss positive">
              <span>{statsLoading ? '...' : `${arbitrageStats.averageProfitMargin.toFixed(1)}% avg margin`}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {statsLoading ? (
                <div className="w-16 h-8 bg-gray-600 animate-pulse rounded"></div>
              ) : (
                `${arbitrageStats.successRate.toFixed(1)}%`
              )}
            </div>
            <div className="metric-label">Opportunity Rate</div>
            <div className="metric-change">
              <span>{statsLoading ? '...' : `${arbitrageStats.totalGamesScanned} games scanned`}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {statsLoading ? (
                <div className="w-12 h-8 bg-gray-600 animate-pulse rounded"></div>
              ) : (
                arbitrageStats.activeOpportunities
              )}
            </div>
            <div className="metric-label">Live Opportunities</div>
            <div className="metric-change">
              <span>Real-time</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {activeTraders30Days}
            </div>
            <div className="metric-label">Active Traders</div>
            <div className="metric-change">
              <span>Last 30 days</span>
            </div>
          </div>
        </div>

        {/* Platform Success Metrics */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-2xl font-semibold text-white text-center flex items-center justify-center gap-2">
              🏆 <span>Platform Performance</span>
            </h3>
            <p className="text-gray-300 text-center">Real results from our active trading community</p>
          </ModernCardHeader>
          <ModernCardBody>
            {/* Main Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-800/20 border border-green-700/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">💰</span>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-2">${globalPortfolioStats?.netProfit?.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-green-300 mb-1">Total Platform Profits</div>
                <div className="text-xs text-gray-400">From actual trades</div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/20 to-cyan-800/20 border border-blue-700/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-2">{globalPortfolioStats?.winRate?.toFixed(1) || '0.0'}%</div>
                <div className="text-sm text-blue-300 mb-1">Success Rate</div>
                <div className="text-xs text-gray-400">From real bets</div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/20 to-pink-800/20 border border-purple-700/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <div className="text-3xl font-bold text-purple-400 mb-2">{globalPortfolioStats?.totalBets || 0}</div>
                <div className="text-sm text-purple-300 mb-1">Total Bets Placed</div>
                <div className="text-xs text-gray-400">In portfolio tracker</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/20 to-orange-800/20 border border-yellow-700/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">{arbitrageGroups?.length || 0}</div>
                <div className="text-sm text-yellow-300 mb-1">Arbitrage Groups</div>
                <div className="text-xs text-gray-400">Successfully recorded</div>
              </div>
            </div>

            {/* Additional Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-white">
                  ${globalPortfolioStats && globalPortfolioStats.totalBets > 0 ? (globalPortfolioStats.netProfit / globalPortfolioStats.totalBets).toFixed(2) : '0.00'}
                </div>
                <div className="text-xs text-gray-400">Average Profit Per Bet</div>
              </div>
              <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-white">
                  ${allBets && allBets.length > 0 ? Math.max(...allBets.filter(bet => bet.profit !== undefined).map(bet => bet.profit || 0)).toFixed(2) : '0.00'}
                </div>
                <div className="text-xs text-gray-400">Highest Single Win</div>
              </div>
              <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-white">${globalPortfolioStats?.totalStaked?.toFixed(0) || '0'}</div>
                <div className="text-xs text-gray-400">Total Amount Staked</div>
              </div>
              <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-white">{globalPortfolioStats?.arbitrageSuccessRate?.toFixed(1) || '0.0'}%</div>
                <div className="text-xs text-gray-400">Arbitrage Success Rate</div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/30 rounded-xl">
              <h4 className="text-xl font-semibold text-white mb-3">Ready to Join Our Successful Traders?</h4>
              <p className="text-gray-300 mb-6">
                Start generating consistent profits with our proven arbitrage trading platform
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/dashboard">
                  <NeonButton size="lg">
                    Start Trading Now
                  </NeonButton>
                </Link>
                <Link href="/demo">
                  <ModernButton variant="secondary" size="lg">
                    Try Demo First
                  </ModernButton>
                </Link>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <LoadingSkeleton variant="card" width={400} height={500} />
          </div>
        }>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode={authMode}
          />
        </Suspense>
      )}
    </div>
  );
}