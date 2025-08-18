'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge, Button, Alert } from '../shared/components/ui';
import { AdvancedAnalytics, PerformanceMetrics, MonthlyPerformance, SportPerformance, BookmakerPerformance, ArbitrageOpportunityMetrics, RiskMetrics, PredictiveAnalytics } from '@/lib/analytics';
import { TrackedBet, loadBetsFromStorage } from '@/lib/betTracking';
import { useAuth } from '../shared/auth/authProvider';

export function AdvancedAnalyticsComponent() {
  const { user, isAuthenticated } = useAuth();
  const [bets, setBets] = useState<TrackedBet[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'sports' | 'bookmakers' | 'arbitrage' | 'risk' | 'predictions'>('overview');

  useEffect(() => {
    const loadedBets = loadBetsFromStorage();
    setBets(loadedBets);
  }, []);

  const filteredBets = useMemo(() => {
    if (selectedTimeframe === 'all') return bets;
    
    const now = new Date();
    const daysBack = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return bets.filter(bet => new Date(bet.createdAt) >= cutoffDate);
  }, [bets, selectedTimeframe]);

  const metrics = useMemo(() => AdvancedAnalytics.calculatePerformanceMetrics(filteredBets), [filteredBets]);
  const monthlyData = useMemo(() => AdvancedAnalytics.calculateMonthlyPerformance(filteredBets), [filteredBets]);
  const sportData = useMemo(() => AdvancedAnalytics.calculateSportPerformance(filteredBets), [filteredBets]);
  const bookmakerData = useMemo(() => AdvancedAnalytics.calculateBookmakerPerformance(filteredBets), [filteredBets]);
  const arbitrageMetrics = useMemo(() => AdvancedAnalytics.calculateArbitrageMetrics(filteredBets), [filteredBets]);
  const riskMetrics = useMemo(() => AdvancedAnalytics.calculateRiskMetrics(filteredBets), [filteredBets]);
  const predictions = useMemo(() => AdvancedAnalytics.generatePredictiveAnalytics(filteredBets), [filteredBets]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert
          variant="info"
          title="Authentication Required"
          description="Please log in to access advanced analytics features."
        />
      </div>
    );
  }

  const isPremium = user?.subscriptionStatus === 'premium';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 Advanced Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Comprehensive portfolio performance analysis
          </p>
        </div>
        
        {!isPremium && (
          <Badge variant="warning">
            Free Tier - Upgrade for full features
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe === 'all' ? 'All Time' : timeframe.toUpperCase()}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          {([
            { key: 'overview', label: '📊 Overview' },
            { key: 'sports', label: '🏀 Sports' },
            { key: 'bookmakers', label: '🏪 Bookmakers' },
            { key: 'arbitrage', label: '🎯 Arbitrage' },
            { key: 'risk', label: '⚠️ Risk' },
            { key: 'predictions', label: '🔮 Predictions' }
          ] as const).map(({ key, label }) => (
            <Button
              key={key}
              variant={selectedMetric === key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMetric(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      {selectedMetric === 'overview' && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total ROI"
              value={`${metrics.roi.toFixed(1)}%`}
              icon="📈"
              trend={metrics.roi > 0 ? 'positive' : metrics.roi < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              title="Net Profit"
              value={`$${metrics.netProfit.toFixed(2)}`}
              icon="💰"
              trend={metrics.netProfit > 0 ? 'positive' : metrics.netProfit < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              title="Win Rate"
              value={`${metrics.winRate.toFixed(1)}%`}
              icon="🎯"
              trend={metrics.winRate > 50 ? 'positive' : 'neutral'}
            />
            <MetricCard
              title="Profit Factor"
              value={metrics.profitFactor.toFixed(2)}
              icon="⚡"
              trend={metrics.profitFactor > 1 ? 'positive' : 'negative'}
            />
          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Performance Overview</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <MetricRow label="Total Bets" value={metrics.totalBets.toString()} />
                  <MetricRow label="Won Bets" value={`${metrics.wonBets} (${metrics.winRate.toFixed(1)}%)`} />
                  <MetricRow label="Lost Bets" value={`${metrics.lostBets}`} />
                  <MetricRow label="Pending Bets" value={metrics.pendingBets.toString()} />
                  <MetricRow label="Total Staked" value={`$${metrics.totalStaked.toFixed(2)}`} />
                  <MetricRow label="Total Return" value={`$${metrics.totalReturn.toFixed(2)}`} />
                  <MetricRow label="Average Bet Size" value={`$${metrics.averageBetSize.toFixed(2)}`} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Advanced Metrics</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <MetricRow label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} />
                  <MetricRow label="Max Drawdown" value={`${metrics.maxDrawdown.toFixed(1)}%`} />
                  <MetricRow label="Current Streak" value={`${metrics.currentStreak} ${metrics.streakType}`} />
                  <MetricRow label="Longest Win Streak" value={metrics.longestWinStreak.toString()} />
                  <MetricRow label="Longest Lose Streak" value={metrics.longestLoseStreak.toString()} />
                  <MetricRow label="Average Odds" value={metrics.averageOdds.toFixed(0)} />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Monthly Performance Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Monthly Performance</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {monthlyData.slice(-6).map((month, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium">{month.month} {month.year}</span>
                    <div className="flex gap-4 text-sm">
                      <span>Bets: {month.bets}</span>
                      <span>ROI: <span className={month.roi > 0 ? 'text-green-600' : 'text-red-600'}>{month.roi.toFixed(1)}%</span></span>
                      <span>Profit: <span className={month.profit > 0 ? 'text-green-600' : 'text-red-600'}>${month.profit.toFixed(2)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Sports Performance */}
      {selectedMetric === 'sports' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Performance by Sport</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {sportData.map((sport, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <span className="font-medium">{sport.sport}</span>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {sport.bets} bets • Win Rate: {sport.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${sport.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ROI: {sport.roi.toFixed(1)}%
                    </div>
                    <div className="text-sm">
                      Profit: ${sport.profit.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bookmaker Performance */}
      {selectedMetric === 'bookmakers' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Performance by Bookmaker</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {bookmakerData.map((bookmaker, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <span className="font-medium">{bookmaker.bookmaker}</span>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {bookmaker.bets} bets • Win Rate: {bookmaker.winRate.toFixed(1)}% • Avg Settlement: {bookmaker.averageSettlementTime.toFixed(1)}h
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${bookmaker.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ROI: {bookmaker.roi.toFixed(1)}%
                    </div>
                    <div className="text-sm">
                      Profit: ${bookmaker.profit.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Arbitrage Metrics */}
      {selectedMetric === 'arbitrage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard
            title="Total Opportunities"
            value={arbitrageMetrics.totalOpportunities.toString()}
            icon="🎯"
          />
          <MetricCard
            title="Success Rate"
            value={`${arbitrageMetrics.arbitrageSuccessRate.toFixed(1)}%`}
            icon="✅"
            trend={arbitrageMetrics.arbitrageSuccessRate > 80 ? 'positive' : 'neutral'}
          />
          <MetricCard
            title="Avg Profit Margin"
            value={`${arbitrageMetrics.averageProfitMargin.toFixed(2)}%`}
            icon="📈"
          />
          <MetricCard
            title="Total Arbitrage Profit"
            value={`$${arbitrageMetrics.totalArbitrageProfit.toFixed(2)}`}
            icon="💰"
            trend="positive"
          />
        </div>
      )}

      {/* Risk Metrics */}
      {selectedMetric === 'risk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Risk Assessment</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <MetricRow label="Value at Risk (95%)" value={`$${riskMetrics.valueAtRisk.toFixed(2)}`} />
                <MetricRow label="Expected Shortfall" value={`$${riskMetrics.expectedShortfall.toFixed(2)}`} />
                <MetricRow label="Portfolio Volatility" value={`${riskMetrics.portfolioVolatility.toFixed(2)}%`} />
                <MetricRow label="Max Risk per Bet" value={`$${riskMetrics.maxRiskPerBet.toFixed(2)}`} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Risk Factors</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <RiskIndicator label="Correlation Risk" value={riskMetrics.correlationRisk} />
                <RiskIndicator label="Liquidity Risk" value={riskMetrics.liquidityRisk} />
                <RiskIndicator label="Concentration Risk" value={riskMetrics.maxRiskPerBet / (metrics.averageBetSize || 1)} />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Predictive Analytics */}
      {selectedMetric === 'predictions' && (
        <div className="space-y-6">
          {!isPremium && (
            <Alert
              variant="warning"
              title="Premium Feature"
              description="Upgrade to Premium to unlock advanced predictive analytics and AI-powered insights."
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Projected Monthly ROI"
              value={`${predictions.projectedMonthlyROI.toFixed(1)}%`}
              icon="🔮"
              disabled={!isPremium}
            />
            <MetricCard
              title="Projected Monthly Profit"
              value={`$${predictions.projectedMonthlyProfit.toFixed(2)}`}
              icon="💫"
              disabled={!isPremium}
            />
            <MetricCard
              title="Recommended Bankroll"
              value={`$${predictions.recommendedBankroll.toFixed(2)}`}
              icon="🏦"
              disabled={!isPremium}
            />
            <MetricCard
              title="Optimal Bet Size"
              value={`$${predictions.optimalBetSize.toFixed(2)}`}
              icon="🎯"
              disabled={!isPremium}
            />
            <MetricCard
              title="Risk Score"
              value={`${predictions.riskScore.toFixed(1)}/10`}
              icon="⚠️"
              trend={predictions.riskScore > 7 ? 'negative' : predictions.riskScore < 4 ? 'positive' : 'neutral'}
              disabled={!isPremium}
            />
            <MetricCard
              title="Growth Trend"
              value={predictions.growthTrend}
              icon="📊"
              trend={predictions.growthTrend === 'bullish' ? 'positive' : predictions.growthTrend === 'bearish' ? 'negative' : 'neutral'}
              disabled={!isPremium}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  disabled = false 
}: { 
  title: string; 
  value: string; 
  icon: string; 
  trend?: 'positive' | 'negative' | 'neutral';
  disabled?: boolean;
}) {
  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
            <p className={`text-2xl font-bold ${
              trend === 'positive' ? 'text-green-600' :
              trend === 'negative' ? 'text-red-600' :
              'text-gray-900 dark:text-white'
            }`}>
              {disabled ? '***' : value}
            </p>
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
      </CardBody>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RiskIndicator({ label, value }: { label: string; value: number }) {
  const getRiskLevel = (val: number) => {
    if (val < 30) return { level: 'Low', color: 'text-green-600' };
    if (val < 70) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'High', color: 'text-red-600' };
  };

  const risk = getRiskLevel(value);

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              risk.level === 'Low' ? 'bg-green-500' :
              risk.level === 'Medium' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${risk.color}`}>
          {risk.level}
        </span>
      </div>
    </div>
  );
}