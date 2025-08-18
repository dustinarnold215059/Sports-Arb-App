'use client';

import { useState, useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton, NeonButton, GradientButton } from '../shared/components/ui/ModernButton';
import { ModernBadge, StatusBadge, MetricBadge } from '../shared/components/ui/ModernBadge';
import { useAuth } from '../shared/auth/authProvider';
import { loadBetsFromStorage } from '@/lib/betTracking';
import { decimalToAmerican, formatAmericanOdds } from '@/lib/utils';

interface ProfessionalStats {
  totalProfit: number;
  totalStaked: number;
  roi: number;
  winRate: number;
  avgMargin: number;
  activeBets: number;
  completedBets: number;
  todayVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  liveOpportunities: number;
}

interface LiveOpportunity {
  id: string;
  sport: string;
  matchup: string;
  bookmaker1: string;
  bookmaker2: string;
  margin: number;
  odds1: number;
  odds2: number;
  confidence: number;
  expiresIn: number; // minutes
}

export function ProfessionalDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ProfessionalStats>({
    totalProfit: 0,
    totalStaked: 0,
    roi: 0,
    winRate: 0,
    avgMargin: 0,
    activeBets: 0,
    completedBets: 0,
    todayVolume: 0,
    weeklyVolume: 0,
    monthlyVolume: 0,
    liveOpportunities: 0
  });
  
  const [liveOpportunities, setLiveOpportunities] = useState<LiveOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
      // Set up real-time updates
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedTimeframe]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const bets = loadBetsFromStorage();
      const settledBets = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');
      const wonBets = bets.filter(bet => bet.status === 'won');
      const activeBets = bets.filter(bet => bet.status === 'pending');

      const totalStaked = settledBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalReturn = wonBets.reduce((sum, bet) => sum + (bet.potentialPayout || 0), 0);
      const totalProfit = totalReturn - totalStaked;
      const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
      const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
      const avgMargin = settledBets.length > 0 ? 
        settledBets.reduce((sum, bet) => sum + (bet.margin || 3.2), 0) / settledBets.length : 0;

      // Mock live opportunities data
      const mockOpportunities: LiveOpportunity[] = [
        {
          id: '1',
          sport: 'NBA',
          matchup: 'Lakers vs Warriors',
          bookmaker1: 'DraftKings',
          bookmaker2: 'BetMGM',
          margin: 4.8,
          odds1: 1.95,
          odds2: 2.15,
          confidence: 0.94,
          expiresIn: 12
        },
        {
          id: '2',
          sport: 'NFL',
          matchup: 'Chiefs vs Bills',
          bookmaker1: 'FanDuel',
          bookmaker2: 'Caesars',
          margin: 3.1,
          odds1: 2.10,
          odds2: 1.85,
          confidence: 0.89,
          expiresIn: 8
        },
        {
          id: '3',
          sport: 'NHL',
          matchup: 'Rangers vs Bruins',
          bookmaker1: 'PointsBet',
          bookmaker2: 'BetRivers',
          margin: 2.7,
          odds1: 2.30,
          odds2: 1.75,
          confidence: 0.86,
          expiresIn: 25
        }
      ];

      setStats({
        totalProfit,
        totalStaked,
        roi,
        winRate,
        avgMargin,
        activeBets: activeBets.length,
        completedBets: settledBets.length,
        todayVolume: Math.random() * 5000 + 2000,
        weeklyVolume: Math.random() * 25000 + 15000,
        monthlyVolume: Math.random() * 100000 + 50000,
        liveOpportunities: mockOpportunities.length
      });
      
      setLiveOpportunities(mockOpportunities);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.8) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 4) return 'text-green-400';
    if (margin >= 2.5) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <ModernCard variant="glass" className="max-w-md w-full text-center">
          <ModernCardBody padding="lg">
            <div className="text-6xl mb-6">📊</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Professional <span className="text-gradient">Analytics Dashboard</span>
            </h1>
            <p className="text-gray-300 mb-8">
              Advanced sports betting analytics with real-time market insights and professional-grade tools.
            </p>
            <div className="space-y-4">
              <NeonButton size="lg" fullWidth>
                Access Professional Dashboard
              </NeonButton>
              <ModernButton variant="ghost" size="lg" fullWidth>
                View Demo
              </ModernButton>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Professional Header */}
      <div className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gradient">SportsArb Professional</h1>
                <p className="text-gray-400 text-sm">
                  Welcome back, <span className="text-white font-medium">{user?.username || 'Professional Trader'}</span>
                </p>
              </div>
              
              {/* Timeframe Selector */}
              <div className="flex bg-gray-800/50 rounded-lg p-1">
                {(['24h', '7d', '30d', 'all'] as const).map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      selectedTimeframe === timeframe
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {timeframe.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Live Opportunities</div>
                <div className="text-lg font-bold text-green-400">{stats.liveOpportunities}</div>
              </div>
              <div className="status-indicator status-active">
                <span>System Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className="metric-value profit-loss positive">
              {formatCurrency(stats.totalProfit)}
            </div>
            <div className="metric-label">Total Profit</div>
            <div className="metric-change profit-loss positive">
              +{formatPercentage(stats.roi)} ROI
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatPercentage(stats.winRate)}
            </div>
            <div className="metric-label">Win Rate</div>
            <div className="metric-change">
              {stats.completedBets} total bets
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatPercentage(stats.avgMargin)}
            </div>
            <div className="metric-label">Avg Margin</div>
            <div className="metric-change">
              {stats.activeBets} active bets
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatCurrency(stats.todayVolume)}
            </div>
            <div className="metric-label">Today Volume</div>
            <div className="metric-change">
              {formatCurrency(stats.weeklyVolume)} weekly
            </div>
          </div>
        </div>

        {/* Live Opportunities Table */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">Live Arbitrage Opportunities</h3>
                <div className="status-indicator status-active">
                  <span>Real-time</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ModernButton variant="ghost" size="sm">
                  ⚙️ Configure
                </ModernButton>
                <NeonButton size="sm">
                  🎯 Auto-Trade
                </NeonButton>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardBody padding="none">
            <div className="overflow-x-auto">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Sport</th>
                    <th>Matchup</th>
                    <th>Bookmakers</th>
                    <th>Margin</th>
                    <th>Odds</th>
                    <th>Confidence</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liveOpportunities.map((opp) => (
                    <tr key={opp.id}>
                      <td>
                        <ModernBadge variant="primary" size="xs">
                          {opp.sport}
                        </ModernBadge>
                      </td>
                      <td className="font-medium">{opp.matchup}</td>
                      <td className="text-sm text-gray-400">
                        {opp.bookmaker1} vs {opp.bookmaker2}
                      </td>
                      <td>
                        <span className={`font-mono font-bold ${getMarginColor(opp.margin)}`}>
                          {formatPercentage(opp.margin)}
                        </span>
                      </td>
                      <td className="font-mono text-sm">
                        <div className="flex gap-2">
                          <span className="odds-display">{formatAmericanOdds(decimalToAmerican(opp.odds1))}</span>
                          <span className="odds-display">{formatAmericanOdds(decimalToAmerican(opp.odds2))}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-mono font-bold ${getConfidenceColor(opp.confidence)}`}>
                          {formatPercentage(opp.confidence * 100, 0)}
                        </span>
                      </td>
                      <td className="text-sm">
                        <span className={opp.expiresIn < 10 ? 'text-red-400' : 'text-gray-400'}>
                          {opp.expiresIn}m
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <ModernButton variant="ghost" size="sm">
                            📊 Analyze
                          </ModernButton>
                          <GradientButton size="sm">
                            💰 Execute
                          </GradientButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Analytics and Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Performance Analytics</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="h-64 flex items-center justify-center bg-gradient-to-t from-gray-800/20 to-transparent rounded-lg border border-gray-700/30">
                <div className="text-center">
                  <div className="text-4xl mb-4">📈</div>
                  <h4 className="text-lg font-semibold text-white mb-2">Advanced Chart View</h4>
                  <p className="text-gray-400 text-sm mb-4">Real-time P&L and performance metrics</p>
                  <ModernButton variant="primary" size="sm">
                    View Full Analytics
                  </ModernButton>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>

          {/* Quick Actions */}
          <ModernCard variant="default">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="data-card text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-sm font-medium text-white mb-1">Auto Trading</div>
                  <div className="text-xs text-gray-400 mb-3">Automated execution</div>
                  <NeonButton size="sm" fullWidth>
                    Configure
                  </NeonButton>
                </div>

                <div className="data-card text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm font-medium text-white mb-1">Scanner</div>
                  <div className="text-xs text-gray-400 mb-3">Real-time opportunities</div>
                  <ModernButton variant="primary" size="sm" fullWidth>
                    Launch
                  </ModernButton>
                </div>

                <div className="data-card text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-white mb-1">Reports</div>
                  <div className="text-xs text-gray-400 mb-3">Detailed analytics</div>
                  <ModernButton variant="secondary" size="sm" fullWidth>
                    Generate
                  </ModernButton>
                </div>

                <div className="data-card text-center">
                  <div className="text-2xl mb-2">🛡️</div>
                  <div className="text-sm font-medium text-white mb-1">Risk Manager</div>
                  <div className="text-xs text-gray-400 mb-3">Portfolio protection</div>
                  <ModernButton variant="warning" size="sm" fullWidth>
                    Review
                  </ModernButton>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>

        {/* Footer Stats */}
        <ModernCard variant="glass">
          <ModernCardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-lg font-bold text-blue-400">15+</div>
                <div className="text-sm text-gray-400">Supported Sports</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">200+</div>
                <div className="text-sm text-gray-400">Bookmaker APIs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">24/7</div>
                <div className="text-sm text-gray-400">Market Monitoring</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">&lt; 1s</div>
                <div className="text-sm text-gray-400">Execution Speed</div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    </div>
  );
}

export default ProfessionalDashboard;