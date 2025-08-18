'use client';

import { BetTracker } from '@/components/BetTracker';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { betTracker, BettingPortfolio } from '@/lib/betTracking';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../../shared/components/ui/ModernBadge";
import { useAuth } from "../../shared/auth/authProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function PortfolioPage() {
  const { user, isAuthenticated } = useAuth();
  const [portfolio, setPortfolio] = useState<BettingPortfolio | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updatePortfolio = () => {
      setIsLoading(true);
      try {
        // Set current user in bet tracker
        if (isAuthenticated && user) {
          betTracker.setCurrentUser(user.id);
        } else {
          betTracker.setCurrentUser(null);
        }
        
        const stats = betTracker.getPortfolioStats();
        setPortfolio(stats);
      } catch (error) {
        console.error('Failed to load portfolio stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    updatePortfolio();
    
    // Update portfolio stats every 30 seconds
    const interval = setInterval(updatePortfolio, 30000);
    return () => clearInterval(interval);
  }, [timeframe, user, isAuthenticated]);

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
    <ProtectedRoute requireProOrAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Navigation */}
        <Navigation />

      {/* Page Header */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1>
                <p className="text-gray-400 text-sm">
                  Welcome back, <span className="text-white font-medium">{user?.username || 'Professional Trader'}</span>
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
                <div className="text-lg font-bold text-green-400">{portfolio?.totalBets || 0}</div>
              </div>
              <div className="status-indicator status-active">
                <span>Portfolio Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Portfolio Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className={`metric-value ${getPerformanceClass(portfolio?.netProfit || 0)}`}>
              ${portfolio?.netProfit?.toFixed(2) || '0.00'}
            </div>
            <div className="metric-label">Net Profit</div>
            <div className={`metric-change ${getPerformanceClass(portfolio?.profitRate || 0)}`}>
              <span>{portfolio?.profitRate ? (portfolio.profitRate > 0 ? '+' : '') + portfolio.profitRate.toFixed(1) + '%' : '0.0%'}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {portfolio?.winRate?.toFixed(1) || '0.0'}%
            </div>
            <div className="metric-label">Win Rate</div>
            <div className="metric-change">
              <span>{portfolio?.wonBets || 0} / {(portfolio?.wonBets || 0) + (portfolio?.lostBets || 0)} bets</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              ${portfolio?.totalStaked?.toFixed(2) || '0.00'}
            </div>
            <div className="metric-label">Total Staked</div>
            <div className="metric-change">
              <span>{portfolio?.pendingBets || 0} pending</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {portfolio?.arbitrageSuccessRate?.toFixed(1) || '0.0'}%
            </div>
            <div className="metric-label">Arbitrage Success</div>
            <div className="metric-change">
              <span>{portfolio?.arbitrageGroups || 0} groups</span>
            </div>
          </div>
        </div>

        {/* Portfolio Status Banner */}
        {portfolio && portfolio.totalBets > 0 ? (
          <ModernCard variant="glass">
            <ModernCardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">📊</div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Portfolio Performance Summary</h3>
                    <div className="flex items-center gap-6 text-sm text-gray-300">
                      <span>Active Bets: <span className="text-yellow-400 font-medium">{portfolio.pendingBets}</span></span>
                      <span>Completed: <span className="text-green-400 font-medium">{portfolio.wonBets + portfolio.lostBets}</span></span>
                      <span>Success Rate: <span className="text-blue-400 font-medium">{portfolio.arbitrageSuccessRate.toFixed(1)}%</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href="/dashboard">
                    <ModernButton variant="secondary" size="md">
                      📡 Scanner
                    </ModernButton>
                  </Link>
                  <Link href="/arbitrage">
                    <GradientButton size="md">
                      🎯 Find Opportunities
                    </GradientButton>
                  </Link>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        ) : (
          <ModernCard variant="glass">
            <ModernCardBody>
              <div className="text-center py-8">
                <div className="text-6xl mb-6">📈</div>
                <h3 className="text-2xl font-semibold text-white mb-4">Start Building Your Portfolio</h3>
                <p className="text-gray-300 mb-8 max-w-md mx-auto">
                  Track your arbitrage opportunities and analyze your performance with our professional-grade portfolio tools.
                </p>
                <div className="flex justify-center gap-4">
                  <Link href="/dashboard">
                    <NeonButton size="lg">
                      🚀 Open Scanner
                    </NeonButton>
                  </Link>
                  <Link href="/arbitrage">
                    <ModernButton variant="primary" size="lg">
                      🎯 Calculator
                    </ModernButton>
                  </Link>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        )}

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
                <ModernButton 
                  variant="ghost" 
                  size="sm"
                  onClick={async () => {
                    try {
                      // Dynamic import to avoid bundle size issues
                      const jsPDF = (await import('jspdf')).default;
                      
                      const doc = new jsPDF();
                      const currentDate = new Date().toLocaleDateString();
                      
                      // Set background to dark gray
                      doc.setFillColor(17, 24, 39); // gray-900
                      doc.rect(0, 0, 210, 297, 'F'); // A4 size background
                      
                      // Header with gradient-like effect
                      doc.setFillColor(31, 41, 55); // gray-800
                      doc.rect(0, 0, 210, 50, 'F');
                      
                      // Main title with blue gradient color
                      doc.setFontSize(24);
                      doc.setTextColor(96, 165, 250); // blue-400
                      doc.text('SportsArb Professional', 20, 25);
                      
                      doc.setFontSize(16);
                      doc.setTextColor(156, 163, 175); // gray-400
                      doc.text('Portfolio Performance Report', 20, 35);
                      
                      doc.setFontSize(10);
                      doc.setTextColor(209, 213, 219); // gray-300
                      doc.text(`Generated: ${currentDate} | User: ${user?.username || 'Unknown User'}`, 20, 45);
                      
                      // Portfolio Summary with card-like background
                      let yPos = 65;
                      doc.setFillColor(55, 65, 81); // gray-700
                      doc.roundedRect(15, yPos - 5, 180, 50, 3, 3, 'F');
                      
                      doc.setFontSize(16);
                      doc.setTextColor(96, 165, 250); // blue-400
                      doc.text('Portfolio Summary', 20, yPos + 5);
                      yPos += 15;
                      
                      doc.setFontSize(11);
                      doc.setTextColor(255, 255, 255); // white
                      if (portfolio) {
                        doc.text(`Total Bets: ${portfolio.totalBets}`, 25, yPos);
                        yPos += 6;
                        
                        // Color code profit/loss
                        const profitColor = portfolio.netProfit >= 0 ? [34, 197, 94] : [239, 68, 68]; // green-500 or red-500
                        doc.setTextColor(...profitColor);
                        doc.text(`Net Profit: $${portfolio.netProfit.toFixed(2)}`, 25, yPos);
                        yPos += 6;
                        
                        doc.setTextColor(255, 255, 255); // white
                        doc.text(`Win Rate: ${portfolio.winRate.toFixed(1)}%`, 25, yPos);
                        yPos += 6;
                        doc.text(`Total Staked: $${portfolio.totalStaked.toFixed(2)}`, 25, yPos);
                        yPos += 6;
                        doc.text(`Arbitrage Success Rate: ${portfolio.arbitrageSuccessRate.toFixed(1)}%`, 25, yPos);
                        yPos += 20;
                      }
                      
                      // Bookmaker Performance with card background
                      if (portfolio?.bookmakerStats && Object.keys(portfolio.bookmakerStats).length > 0) {
                        const bookmakerEntries = Object.entries(portfolio.bookmakerStats);
                        const cardHeight = Math.min(bookmakerEntries.length * 6 + 20, 80);
                        
                        doc.setFillColor(55, 65, 81); // gray-700
                        doc.roundedRect(15, yPos - 5, 180, cardHeight, 3, 3, 'F');
                        
                        doc.setFontSize(16);
                        doc.setTextColor(96, 165, 250); // blue-400
                        doc.text('Bookmaker Performance', 20, yPos + 5);
                        yPos += 15;
                        
                        doc.setFontSize(9);
                        bookmakerEntries.forEach(([bookmaker, stats]) => {
                          if (yPos > 260) { // New page if needed
                            doc.addPage();
                            // Set dark background for new page
                            doc.setFillColor(17, 24, 39);
                            doc.rect(0, 0, 210, 297, 'F');
                            yPos = 20;
                          }
                          
                          doc.setTextColor(255, 255, 255); // white
                          doc.text(`${bookmaker}:`, 25, yPos);
                          
                          doc.setTextColor(209, 213, 219); // gray-300
                          doc.text(`${stats.bets} bets, `, 55, yPos);
                          
                          // Color code profit
                          const profitColor = stats.profit >= 0 ? [34, 197, 94] : [239, 68, 68];
                          doc.setTextColor(...profitColor);
                          doc.text(`$${stats.profit.toFixed(2)} profit, `, 85, yPos);
                          
                          doc.setTextColor(209, 213, 219); // gray-300
                          doc.text(`${stats.winRate.toFixed(1)}% win rate`, 125, yPos);
                          
                          yPos += 6;
                        });
                        yPos += 15;
                      }
                      
                      // Sport Performance with card background
                      if (portfolio?.sportStats && Object.keys(portfolio.sportStats).length > 0) {
                        const sportEntries = Object.entries(portfolio.sportStats);
                        const cardHeight = Math.min(sportEntries.length * 6 + 20, 80);
                        
                        doc.setFillColor(55, 65, 81); // gray-700
                        doc.roundedRect(15, yPos - 5, 180, cardHeight, 3, 3, 'F');
                        
                        doc.setFontSize(16);
                        doc.setTextColor(96, 165, 250); // blue-400
                        doc.text('Sport Performance', 20, yPos + 5);
                        yPos += 15;
                        
                        doc.setFontSize(9);
                        sportEntries.forEach(([sport, stats]) => {
                          if (yPos > 260) { // New page if needed
                            doc.addPage();
                            // Set dark background for new page
                            doc.setFillColor(17, 24, 39);
                            doc.rect(0, 0, 210, 297, 'F');
                            yPos = 20;
                          }
                          
                          doc.setTextColor(255, 255, 255); // white
                          doc.text(`${sport}:`, 25, yPos);
                          
                          doc.setTextColor(209, 213, 219); // gray-300
                          doc.text(`${stats.bets} bets, `, 55, yPos);
                          
                          // Color code profit
                          const profitColor = stats.profit >= 0 ? [34, 197, 94] : [239, 68, 68];
                          doc.setTextColor(...profitColor);
                          doc.text(`$${stats.profit.toFixed(2)} profit, `, 85, yPos);
                          
                          doc.setTextColor(209, 213, 219); // gray-300
                          doc.text(`${stats.winRate.toFixed(1)}% win rate`, 125, yPos);
                          
                          yPos += 6;
                        });
                        yPos += 15;
                      }
                      
                      // Recent Bets (last 10) with card background
                      const recentBets = betTracker.getAllBets().slice(0, 10);
                      if (recentBets.length > 0) {
                        if (yPos > 180) { // New page if needed
                          doc.addPage();
                          // Set dark background for new page
                          doc.setFillColor(17, 24, 39);
                          doc.rect(0, 0, 210, 297, 'F');
                          yPos = 20;
                        }
                        
                        const betsCardHeight = Math.min(recentBets.length * 5 + 25, 100);
                        doc.setFillColor(55, 65, 81); // gray-700
                        doc.roundedRect(15, yPos - 5, 180, betsCardHeight, 3, 3, 'F');
                        
                        doc.setFontSize(16);
                        doc.setTextColor(96, 165, 250); // blue-400
                        doc.text('Recent Bets (Last 10)', 20, yPos + 5);
                        yPos += 15;
                        
                        doc.setFontSize(8);
                        recentBets.forEach((bet, index) => {
                          if (yPos > 260) { // New page if needed
                            doc.addPage();
                            // Set dark background for new page
                            doc.setFillColor(17, 24, 39);
                            doc.rect(0, 0, 210, 297, 'F');
                            yPos = 20;
                          }
                          
                          const date = bet.timestamp.toLocaleDateString();
                          const profit = bet.profit !== undefined ? `$${bet.profit.toFixed(2)}` : 'Pending';
                          
                          doc.setTextColor(209, 213, 219); // gray-300
                          doc.text(`${index + 1}. ${bet.game} - ${bet.bookmaker} - $${bet.stake} - `, 25, yPos);
                          
                          // Color code status
                          const statusColor = bet.status === 'won' ? [34, 197, 94] : 
                                            bet.status === 'lost' ? [239, 68, 68] : 
                                            [234, 179, 8]; // green-500, red-500, yellow-500
                          doc.setTextColor(...statusColor);
                          doc.text(`${bet.status} - ${profit}`, 120, yPos);
                          
                          doc.setTextColor(156, 163, 175); // gray-400
                          doc.text(`(${date})`, 150, yPos);
                          
                          yPos += 5;
                        });
                      }
                      
                      // Footer with dark theme
                      const pageCount = doc.internal.getNumberOfPages();
                      for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        
                        // Footer background
                        doc.setFillColor(31, 41, 55); // gray-800
                        doc.rect(0, 285, 210, 12, 'F');
                        
                        doc.setFontSize(8);
                        doc.setTextColor(156, 163, 175); // gray-400
                        doc.text(`Page ${i} of ${pageCount} | SportsArb Professional | Generated ${currentDate}`, 20, 292);
                      }
                      
                      // Download PDF
                      doc.save(`sportsarb-portfolio-${new Date().toISOString().split('T')[0]}.pdf`);
                      
                    } catch (error) {
                      console.error('Failed to export PDF:', error);
                      alert('Failed to export PDF. Please try again.');
                    }
                  }}
                >
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
        {portfolio && portfolio.totalBets > 0 && (
          <ModernCard variant="glass">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Performance Analysis</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bookmaker Performance */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">🏦</span> Your Bookmaker Performance
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(portfolio.bookmakerStats).slice(0, 5).map(([bookmaker, stats]) => (
                      <div key={bookmaker} className="data-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{bookmaker}</p>
                            <p className="text-sm text-gray-300">
                              {stats.bets} bets • ${stats.staked.toFixed(0)} staked
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getPerformanceColor(stats.profit)}`}>
                              ${stats.profit.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {stats.winRate.toFixed(1)}% win rate
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
                    <span className="text-xl">📊</span> Your Bet Type Analysis
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(portfolio.betTypeStats)
                      .filter(([_, stats]) => stats.bets > 0)
                      .slice(0, 4)
                      .map(([betType, stats]) => (
                      <div key={betType} className="data-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white capitalize">{betType}</p>
                            <p className="text-sm text-gray-300">
                              {stats.bets} bets • ${stats.staked.toFixed(0)} staked
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getPerformanceColor(stats.profit)}`}>
                              ${stats.profit.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {stats.winRate.toFixed(1)}% win rate
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
                    <span className="text-xl">🏈</span> Your Sport Performance
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(portfolio.sportStats || {})
                      .filter(([_, stats]) => stats.bets > 0)
                      .slice(0, 5)
                      .map(([sport, stats]) => (
                      <div key={sport} className="data-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white capitalize">{sport}</p>
                            <p className="text-sm text-gray-300">
                              {stats.bets} bets • ${stats.staked.toFixed(0)} staked
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getPerformanceColor(stats.profit)}`}>
                              ${stats.profit.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {stats.winRate.toFixed(1)}% win rate
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
        )}

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
    </ProtectedRoute>
  );
}