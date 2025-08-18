'use client';

import { useState, useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton, NeonButton, GradientButton } from '../shared/components/ui/ModernButton';
import { ModernBadge, StatusBadge, MetricBadge, NotificationBadge } from '../shared/components/ui/ModernBadge';
import { useAuth } from '../shared/auth/authProvider';
import { loadBetsFromStorage } from '@/lib/betTracking';

interface DashboardStats {
  totalBets: number;
  activeBets: number;
  totalProfit: number;
  roi: number;
  winRate: number;
  arbitrageOpportunities: number;
}

export function ModernDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBets: 0,
    activeBets: 0,
    totalProfit: 0,
    roi: 0,
    winRate: 0,
    arbitrageOpportunities: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load betting data
      const bets = loadBetsFromStorage();
      const settledBets = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');
      const wonBets = bets.filter(bet => bet.status === 'won');
      const activeBets = bets.filter(bet => bet.status === 'pending');

      const totalStaked = settledBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalReturn = wonBets.reduce((sum, bet) => sum + (bet.potentialPayout || 0), 0);
      const totalProfit = totalReturn - totalStaked;
      const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
      const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;

      setStats({
        totalBets: bets.length,
        activeBets: activeBets.length,
        totalProfit,
        roi,
        winRate,
        arbitrageOpportunities: Math.floor(Math.random() * 15) + 5 // Mock data
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <ModernCard variant="neon" className="max-w-md w-full text-center">
          <ModernCardBody padding="lg">
            <div className="text-6xl mb-6">🎯</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">SportsArb Pro</span>
            </h1>
            <p className="text-gray-300 mb-8">
              Advanced sports betting arbitrage platform with real-time opportunities and AI-powered insights.
            </p>
            <div className="space-y-4">
              <NeonButton size="lg" fullWidth>
                Sign In to Continue
              </NeonButton>
              <ModernButton variant="ghost" size="lg" fullWidth>
                Learn More
              </ModernButton>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                SportsArb Pro
              </h1>
              <p className="text-gray-400 text-sm">
                Welcome back, {user?.username || 'Pro Trader'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <ModernButton variant="ghost" size="sm">
                  🔔
                </ModernButton>
                <NotificationBadge count={stats.arbitrageOpportunities} />
              </div>
              
              <StatusBadge status="active" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernCard variant="gradient" hover glow>
            <ModernCardBody className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(stats.totalProfit)}
              </div>
              <div className="text-gray-300 text-sm">Total Profit</div>
              <MetricBadge 
                value={formatPercentage(stats.roi)} 
                trend={stats.roi > 0 ? 'up' : stats.roi < 0 ? 'down' : 'neutral'}
                className="mt-2"
              />
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="neon" hover>
            <ModernCardBody className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <div className="text-3xl font-bold text-cyan-400 mb-2">
                {formatPercentage(stats.winRate)}
              </div>
              <div className="text-gray-300 text-sm">Win Rate</div>
              <ModernBadge variant="neon" size="xs" className="mt-2">
                {stats.totalBets} total bets
              </ModernBadge>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="default" hover>
            <ModernCardBody className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                {stats.arbitrageOpportunities}
              </div>
              <div className="text-gray-300 text-sm">Live Opportunities</div>
              <ModernBadge variant="warning" size="xs" pulse className="mt-2">
                Updated now
              </ModernBadge>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="glass" hover>
            <ModernCardBody className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-3xl font-bold text-emerald-400 mb-2">
                {stats.activeBets}
              </div>
              <div className="text-gray-300 text-sm">Active Bets</div>
              <StatusBadge status={stats.activeBets > 0 ? 'active' : 'inactive'} className="mt-2" />
            </ModernCardBody>
          </ModernCard>
        </div>

        {/* Quick Actions */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <NeonButton size="lg" fullWidth icon={<span>🎯</span>}>
                Find Arbitrage
              </NeonButton>
              <GradientButton size="lg" fullWidth icon={<span>📊</span>}>
                View Analytics
              </GradientButton>
              <ModernButton variant="success" size="lg" fullWidth icon={<span>💰</span>}>
                Track Bets
              </ModernButton>
              <ModernButton variant="secondary" size="lg" fullWidth icon={<span>⚙️</span>}>
                Settings
              </ModernButton>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Recent Activity & Live Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <ModernCard variant="default">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
              <ModernBadge variant="primary" size="xs">
                Last 24h
              </ModernBadge>
            </ModernCardHeader>
            <ModernCardBody>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                        ✓
                      </div>
                      <div>
                        <p className="text-white font-medium">Lakers vs Warriors</p>
                        <p className="text-gray-400 text-sm">Arbitrage completed</p>
                      </div>
                    </div>
                    <MetricBadge value="+$45.50" trend="up" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                        📊
                      </div>
                      <div>
                        <p className="text-white font-medium">Celtics vs Heat</p>
                        <p className="text-gray-400 text-sm">New opportunity found</p>
                      </div>
                    </div>
                    <ModernBadge variant="neon" size="xs">3.2% margin</ModernBadge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                        🎯
                      </div>
                      <div>
                        <p className="text-white font-medium">Portfolio Analysis</p>
                        <p className="text-gray-400 text-sm">Weekly report generated</p>
                      </div>
                    </div>
                    <ModernBadge variant="gradient" size="xs">New</ModernBadge>
                  </div>
                </div>
              )}
            </ModernCardBody>
          </ModernCard>

          {/* Live Opportunities */}
          <ModernCard variant="neon">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Live Opportunities</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300">Live</span>
              </div>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-400/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-semibold">76ers vs Knicks</h4>
                    <MetricBadge value="4.8%" variant="neon" glow />
                  </div>
                  <p className="text-gray-300 text-sm mb-3">DraftKings vs BetMGM</p>
                  <div className="flex gap-2">
                    <NeonButton size="sm">
                      Calculate
                    </NeonButton>
                    <ModernButton variant="ghost" size="sm">
                      Details
                    </ModernButton>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-400/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-semibold">Bulls vs Nets</h4>
                    <MetricBadge value="3.1%" variant="success" />
                  </div>
                  <p className="text-gray-300 text-sm mb-3">FanDuel vs Caesars</p>
                  <div className="flex gap-2">
                    <ModernButton variant="success" size="sm">
                      Calculate
                    </ModernButton>
                    <ModernButton variant="ghost" size="sm">
                      Details
                    </ModernButton>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <GradientButton size="sm">
                    View All Opportunities
                  </GradientButton>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>

        {/* Performance Chart Placeholder */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white">Performance Overview</h3>
            <div className="flex gap-2">
              <ModernBadge variant="primary" size="xs">7D</ModernBadge>
              <ModernBadge variant="ghost" size="xs">30D</ModernBadge>
              <ModernBadge variant="ghost" size="xs">90D</ModernBadge>
            </div>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="h-64 bg-gradient-to-t from-gray-800/50 to-transparent rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📈</div>
                <h4 className="text-xl font-semibold text-white mb-2">Performance Chart</h4>
                <p className="text-gray-400">Advanced analytics coming soon</p>
                <GradientButton className="mt-4" size="sm">
                  View Analytics
                </GradientButton>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    </div>
  );
}