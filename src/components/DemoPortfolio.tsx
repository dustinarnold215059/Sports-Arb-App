'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../shared/components/ui/ModernBadge";
import { BetTracker } from '@/components/BetTracker';
import { DemoNavigation } from '@/components/DemoNavigation';
import { useDemo } from '@/context/DemoContext';
import Link from 'next/link';

export function DemoPortfolio() {
  const { fakeBets, fakePortfolioStats } = useDemo();
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(false);

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPerformanceClass = (value: number) => {
    if (value > 0) return 'profit-loss positive';
    if (value < 0) return 'profit-loss negative';
    return '';
  };

  return (
    <div>
      {/* Demo Mode Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-blue-700/20">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-center gap-2">
            <ModernBadge variant="info" size="sm">🎯 Demo Mode</ModernBadge>
            <span className="text-blue-300 text-sm">Experience features with sample data</span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1>
                <p className="text-gray-400 text-sm">
                  Welcome back, <span className="text-white font-medium">Demo User</span>
                </p>
              </div>
              
              {/* Timeframe Selector */}
              <div className="flex bg-gray-800/50 rounded-lg p-1">
                {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      timeframe === tf
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Total Bets</div>
                <div className="text-lg font-bold text-green-400">{fakePortfolioStats.totalBets}</div>
              </div>
              <div className="status-indicator status-active">
                <span>Portfolio Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Navigation */}
      <DemoNavigation />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Portfolio Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className={`metric-value ${getPerformanceClass(fakePortfolioStats.netProfit)}`}>
              ${fakePortfolioStats.netProfit.toFixed(2)}
            </div>
            <div className="metric-label">Net Profit</div>
            <div className={`metric-change ${getPerformanceClass(fakePortfolioStats.profitRate)}`}>
              <span>{fakePortfolioStats.profitRate > 0 ? '+' : ''}{fakePortfolioStats.profitRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {fakePortfolioStats.winRate.toFixed(1)}%
            </div>
            <div className="metric-label">Win Rate</div>
            <div className="metric-change">
              <span>{fakePortfolioStats.wonBets} / {fakePortfolioStats.wonBets + fakePortfolioStats.lostBets} bets</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              ${fakePortfolioStats.totalStaked.toFixed(2)}
            </div>
            <div className="metric-label">Total Staked</div>
            <div className="metric-change">
              <span>{fakePortfolioStats.pendingBets} pending</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {fakePortfolioStats.arbitrageSuccessRate.toFixed(1)}%
            </div>
            <div className="metric-label">Arbitrage Success</div>
            <div className="metric-change">
              <span>{fakePortfolioStats.arbitrageGroups} groups</span>
            </div>
          </div>
        </div>

        {/* Portfolio Status Banner */}
        <ModernCard variant="glass">
          <ModernCardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Portfolio Performance Summary</h3>
                  <div className="flex items-center gap-6 text-sm text-gray-300">
                    <span>Active Bets: <span className="text-yellow-400 font-medium">{fakePortfolioStats.pendingBets}</span></span>
                    <span>Completed: <span className="text-green-400 font-medium">{fakePortfolioStats.wonBets + fakePortfolioStats.lostBets}</span></span>
                    <span>Success Rate: <span className="text-blue-400 font-medium">{fakePortfolioStats.arbitrageSuccessRate.toFixed(1)}%</span></span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/demo">
                  <ModernButton variant="secondary" size="md">
                    📡 Scanner
                  </ModernButton>
                </Link>
                <Link href="/demo">
                  <GradientButton size="md">
                    🎯 Find Opportunities
                  </GradientButton>
                </Link>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Detailed Bet Tracking Component */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">Detailed Bet Tracking</h2>
                <div className="status-indicator status-active">
                  <span>Live Tracking</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ModernButton variant="ghost" size="sm">
                  📄 Export PDF
                </ModernButton>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardBody padding="none">
            <BetTracker />
          </ModernCardBody>
        </ModernCard>

        {/* Portfolio Performance Analysis */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white">Performance Analysis</h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Bookmaker Performance */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">🏦</span> Demo Bookmaker Performance
                </h4>
                <div className="space-y-3">
                  {[
                    { name: 'DraftKings', bets: 12, profit: 245.50, winRate: 75.0, staked: 850 },
                    { name: 'FanDuel', bets: 8, profit: 180.25, winRate: 62.5, staked: 600 },
                    { name: 'BetMGM', bets: 15, profit: 312.75, winRate: 80.0, staked: 950 },
                    { name: 'Caesars', bets: 6, profit: 125.00, winRate: 66.7, staked: 400 },
                    { name: 'PointsBet', bets: 9, profit: 201.50, winRate: 77.8, staked: 750 }
                  ].map((bookmaker) => (
                    <div key={bookmaker.name} className="data-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{bookmaker.name}</p>
                          <p className="text-sm text-gray-300">
                            {bookmaker.bets} bets • ${bookmaker.staked} staked
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getPerformanceColor(bookmaker.profit)}`}>
                            ${bookmaker.profit.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {bookmaker.winRate.toFixed(1)}% win rate
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bet Type Analysis */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">📊</span> Demo Bet Type Analysis
                </h4>
                <div className="space-y-3">
                  {[
                    { type: 'Moneyline', bets: 18, profit: 425.75, winRate: 72.2, staked: 1200 },
                    { type: 'Spread', bets: 15, profit: 320.50, winRate: 66.7, staked: 980 },
                    { type: 'Over/Under', bets: 12, profit: 275.25, winRate: 75.0, staked: 850 },
                    { type: 'Prop Bets', bets: 5, profit: 143.50, winRate: 80.0, staked: 420 }
                  ].map((betType) => (
                    <div key={betType.type} className="data-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{betType.type}</p>
                          <p className="text-sm text-gray-300">
                            {betType.bets} bets • ${betType.staked} staked
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getPerformanceColor(betType.profit)}`}>
                            ${betType.profit.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {betType.winRate.toFixed(1)}% win rate
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sport Analysis */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">🏈</span> Demo Sport Performance
                </h4>
                <div className="space-y-3">
                  {[
                    { sport: 'Basketball', bets: 20, profit: 450.75, winRate: 75.0, staked: 1350 },
                    { sport: 'Football', bets: 15, profit: 325.50, winRate: 66.7, staked: 1000 },
                    { sport: 'Baseball', bets: 12, profit: 280.25, winRate: 66.7, staked: 850 },
                    { sport: 'Hockey', bets: 8, profit: 175.00, winRate: 62.5, staked: 600 },
                    { sport: 'Soccer', bets: 5, profit: 133.50, winRate: 80.0, staked: 350 }
                  ].map((sport) => (
                    <div key={sport.sport} className="data-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{sport.sport}</p>
                          <p className="text-sm text-gray-300">
                            {sport.bets} bets • ${sport.staked} staked
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getPerformanceColor(sport.profit)}`}>
                            ${sport.profit.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {sport.winRate.toFixed(1)}% win rate
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Professional Tips */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              💡 <span>Portfolio Optimization Tips</span>
            </h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="data-card border-l-4 border-l-green-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-semibold text-green-400 mb-1">Diversification</p>
                    <p className="text-sm text-gray-300">
                      Spread your bets across multiple bookmakers to minimize risk and maximize opportunities.
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-blue-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="font-semibold text-blue-400 mb-1">Kelly Criterion</p>
                    <p className="text-sm text-gray-300">
                      Use optimal stake sizing based on your edge and bankroll to maximize long-term growth.
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-purple-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <p className="font-semibold text-purple-400 mb-1">Record Everything</p>
                    <p className="text-sm text-gray-300">
                      Track every bet to identify patterns and improve your strategy over time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-yellow-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <p className="font-semibold text-yellow-400 mb-1">Risk Management</p>
                    <p className="text-sm text-gray-300">
                      Never stake more than 2-5% of your bankroll on any single arbitrage opportunity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
    </div>
  );
}