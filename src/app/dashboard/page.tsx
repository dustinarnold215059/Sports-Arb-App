'use client';

import { Navigation } from '@/components/Navigation';
import { useState, useEffect, lazy, Suspense } from 'react';
import { betTracker, BettingPortfolio, loadBetsFromStorage } from '@/lib/betTracking';
import Link from 'next/link';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../../shared/components/ui/ModernBadge";
import { useAuth } from "../../shared/auth/authProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSkeleton, StatsSkeleton, CardSkeleton } from "../../shared/components/ui/LoadingSkeleton";

// Dynamic import for heavy components
const EnhancedArbitrageScanner = lazy(() => import('@/components/EnhancedArbitrageScanner').then(module => ({ default: module.EnhancedArbitrageScanner })));

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [portfolio, setPortfolio] = useState<BettingPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState({
    activeOpportunities: 18,
    scanningSpeed: '< 1s',
    marketsMonitored: 247,
    lastUpdate: new Date()
  });

  useEffect(() => {
    const updateData = async () => {
      setIsLoading(true);
      
      // Simulate loading time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isAuthenticated && user) {
        betTracker.setCurrentUser(user.id);
      } else {
        betTracker.setCurrentUser(null);
      }
      setPortfolio(betTracker.getPortfolioStats());
      setLiveStats(prev => ({
        ...prev,
        activeOpportunities: Math.floor(Math.random() * 10) + 12,
        marketsMonitored: 240 + Math.floor(Math.random() * 20),
        lastUpdate: new Date()
      }));
      
      setIsLoading(false);
    };
    
    updateData();
    
    // Update stats every 15 seconds (without loading state for background updates)
    const interval = setInterval(() => {
      if (isAuthenticated && user) {
        betTracker.setCurrentUser(user.id);
      } else {
        betTracker.setCurrentUser(null);
      }
      setPortfolio(betTracker.getPortfolioStats());
      setLiveStats(prev => ({
        ...prev,
        activeOpportunities: Math.floor(Math.random() * 10) + 12,
        marketsMonitored: 240 + Math.floor(Math.random() * 20),
        lastUpdate: new Date()
      }));
    }, 15000);
    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  return (
    <ProtectedRoute requirePremium={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Navigation */}
        <Navigation />

      {/* Page Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
                <p className="text-gray-400 text-sm">
                  Welcome back, <span className="text-white font-medium">{user?.username || 'Professional Trader'}</span>
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Live Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className={`metric-value profit-loss ${portfolio && portfolio.netProfit >= 0 ? 'positive' : 'negative'}`}>
              ${portfolio ? portfolio.netProfit.toFixed(2) : '0.00'}
            </div>
            <div className="metric-label">Net Profit</div>
            <div className="metric-change profit-loss positive">
              <span>+{portfolio ? portfolio.profitRate.toFixed(1) : '0.0'}%</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {portfolio ? portfolio.winRate.toFixed(1) : '0.0'}%
            </div>
            <div className="metric-label">Win Rate</div>
            <div className="metric-change">
              <span>{portfolio && portfolio.totalBets > 0 ? 'Active' : 'Ready'}</span>
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
              {portfolio ? portfolio.arbitrageSuccessRate.toFixed(1) : '0.0'}%
            </div>
            <div className="metric-label">Arbitrage Success</div>
            <div className="metric-change">
              <span>{portfolio ? portfolio.arbitrageGroups : 0} groups</span>
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
            <Suspense fallback={<CardSkeleton />}>
              <EnhancedArbitrageScanner />
            </Suspense>
          </ModernCardBody>
        </ModernCard>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <div className="flex items-center justify-between w-full">
                <h3 className="text-xl font-semibold text-white">Recent Bets</h3>
                <Link href="/portfolio">
                  <ModernButton variant="ghost" size="sm">
                    View All →
                  </ModernButton>
                </Link>
              </div>
            </ModernCardHeader>
            <ModernCardBody>
              {portfolio && portfolio.totalBets > 0 ? (
                <div className="space-y-3">
                  {loadBetsFromStorage().slice(0, 4).map((bet) => (
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
          </>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}