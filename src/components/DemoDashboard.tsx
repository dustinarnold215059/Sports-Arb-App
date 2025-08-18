'use client';

import { useState, useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../shared/components/ui/ModernBadge";
import { EnhancedArbitrageScanner } from '@/components/EnhancedArbitrageScanner';
import { DemoNavigation } from '@/components/DemoNavigation';
import { useDemo } from '@/context/DemoContext';
import Link from 'next/link';

export function DemoDashboard() {
  const { fakeBets, fakeArbitrageOpportunities, fakePortfolioStats } = useDemo();
  const [liveStats, setLiveStats] = useState({
    activeOpportunities: 18,
    scanningSpeed: '< 1s',
    marketsMonitored: 247,
    lastUpdate: new Date()
  });

  useEffect(() => {
    const updateData = () => {
      setLiveStats(prev => ({
        ...prev,
        activeOpportunities: Math.floor(Math.random() * 10) + 12,
        marketsMonitored: 240 + Math.floor(Math.random() * 20),
        lastUpdate: new Date()
      }));
    };
    
    // Update stats every 15 seconds
    const interval = setInterval(updateData, 15000);
    return () => clearInterval(interval);
  }, []);

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
                <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
                <p className="text-gray-400 text-sm">
                  Welcome back, <span className="text-white font-medium">Demo User</span>
                </p>
              </div>
              
              {/* Live Statistics */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Active Scanner</div>
                  <div className="text-lg font-bold text-green-400">Live</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Live Opportunities</div>
                <div className="text-lg font-bold text-green-400">{liveStats.activeOpportunities}</div>
              </div>
              <div className="status-indicator status-active">
                <span>Scanning Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Navigation */}
      <DemoNavigation />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Live Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className={`metric-value profit-loss ${fakePortfolioStats.netProfit >= 0 ? 'positive' : 'negative'}`}>
              ${fakePortfolioStats.netProfit.toFixed(2)}
            </div>
            <div className="metric-label">Net Profit</div>
            <div className="metric-change profit-loss positive">
              <span>+{fakePortfolioStats.profitRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {fakePortfolioStats.winRate.toFixed(1)}%
            </div>
            <div className="metric-label">Win Rate</div>
            <div className="metric-change">
              <span>{fakePortfolioStats.totalBets > 0 ? 'Active' : 'Ready'}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {liveStats.activeOpportunities}
            </div>
            <div className="metric-label">Live Opportunities</div>
            <div className="metric-change">
              <span>Real-time</span>
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

        {/* Demo Data Warning */}
        <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-300 font-semibold">Demo Data Warning</p>
              <p className="text-red-200 text-sm">The arbitrage opportunities shown below are fake demo data. Do not place any real bets based on this information.</p>
            </div>
          </div>
        </div>

        {/* Main Scanner Section */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">
                  🎯 Arbitrage Scanner
                </h2>
                <div className="status-indicator status-active">
                  <span>Real-time</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ModernButton variant="ghost" size="sm">
                  Refresh
                </ModernButton>
                <NeonButton size="sm">
                  Auto Scan
                </NeonButton>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardBody padding="none">
            <EnhancedArbitrageScanner useMockData={true} />
          </ModernCardBody>
        </ModernCard>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <div className="flex items-center justify-between w-full">
                <h3 className="text-xl font-semibold text-white">Recent Bets</h3>
                <Link href="/demo">
                  <ModernButton variant="ghost" size="sm">
                    View All →
                  </ModernButton>
                </Link>
              </div>
            </ModernCardHeader>
            <ModernCardBody>
              {fakeBets && fakeBets.length > 0 ? (
                <div className="space-y-3">
                  {fakeBets.slice(0, 4).map((bet) => (
                    <div key={bet.id} className="data-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{bet.game || 'Game Data'}</p>
                          <p className="text-sm text-gray-300">
                            {bet.bookmaker} • ${bet.stake} • {bet.betType}
                          </p>
                        </div>
                        <ModernBadge 
                          variant={bet.status === 'won' ? 'success' : bet.status === 'lost' ? 'danger' : 'warning'} 
                          size="sm"
                        >
                          {bet.status}
                        </ModernBadge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-white mb-2">No Trading History</h4>
                  <p className="text-gray-400 mb-4">Start using the scanner to track opportunities</p>
                  <ModernButton variant="primary" size="sm">
                    Find Opportunities
                  </ModernButton>
                </div>
              )}
            </ModernCardBody>
          </ModernCard>
        </div>
      </div>
    </div>
  );
}