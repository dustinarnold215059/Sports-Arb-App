'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { ModernCard, ModernCardHeader, ModernCardBody } from "../shared/components/ui/ModernCard";
import { ModernButton, NeonButton, GradientButton } from "../shared/components/ui/ModernButton";
import { ModernBadge, StatusBadge, MetricBadge } from "../shared/components/ui/ModernBadge";
import { EnhancedArbitrageScanner } from '@/components/EnhancedArbitrageScanner';
import { APITest } from '@/components/APITest';
import { APIKeyTest } from '@/components/APIKeyTest';
import { SupportedSportsbooks } from '@/components/SupportedSportsbooks';
import { DemoNavigation } from '@/components/DemoNavigation';
import { SPORTSBOOKS } from '@/lib/arbitrage';
import { useDemo } from '@/context/DemoContext';
import Link from 'next/link';

export function DemoArbitrage() {
  const { fakeArbitrageOpportunities } = useDemo();
  const [activeTab, setActiveTab] = useState<'scanner' | 'api-test'>('scanner');
  const [liveStats, setLiveStats] = useState({
    opportunitiesFound: 12,
    averageMargin: 3.8,
    bestMargin: 7.2,
    activeSportsbooks: Object.keys(SPORTSBOOKS).length
  });

  useEffect(() => {
    // Update live stats periodically
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        opportunitiesFound: Math.floor(Math.random() * 15) + 8,
        averageMargin: 2.5 + Math.random() * 3,
        bestMargin: 5 + Math.random() * 5
      }));
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'scanner', name: '📡 Live Scanner', description: 'Real-time opportunity scanner' },
    { id: 'api-test', name: '🔧 API Testing', description: 'Test API connections' }
  ];

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
                <h1 className="text-2xl font-bold text-white">Arbitrage Suite</h1>
                <p className="text-gray-400 text-sm">
                  Professional arbitrage tools • {liveStats.activeSportsbooks} sportsbooks monitored
                </p>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex bg-gray-800/50 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title={tab.description}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Live Opportunities</div>
                <div className="text-lg font-bold text-green-400">{liveStats.opportunitiesFound}</div>
              </div>
              <div className="status-indicator status-active">
                <span>Markets Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Navigation */}
      <DemoNavigation />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="metric-card">
            <div className="metric-value profit-loss positive">
              {liveStats.opportunitiesFound}
            </div>
            <div className="metric-label">Live Opportunities</div>
            <div className="metric-change">
              <span>Real-time</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {liveStats.averageMargin.toFixed(1)}%
            </div>
            <div className="metric-label">Average Margin</div>
            <div className="metric-change profit-loss positive">
              <span>+0.3%</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {liveStats.bestMargin.toFixed(1)}%
            </div>
            <div className="metric-label">Best Margin</div>
            <div className="metric-change profit-loss positive">
              <span>Current</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {liveStats.activeSportsbooks}
            </div>
            <div className="metric-label">Active Sportsbooks</div>
            <div className="metric-change">
              <span>Connected</span>
            </div>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard variant="default">
            <ModernCardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                📡 <span>Live Scanner</span>
              </h3>
            </ModernCardHeader>
            <ModernCardBody>
              <p className="text-gray-300 mb-4">
                Real-time scanning across multiple sportsbooks and all 10 bet types.
              </p>
              <NeonButton 
                fullWidth
                onClick={() => setActiveTab('scanner')}
              >
                {activeTab === 'scanner' ? 'Scanner Active' : 'Start Scanning'}
              </NeonButton>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="glass">
            <ModernCardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🎯 <span>Calculator</span>
              </h3>
            </ModernCardHeader>
            <ModernCardBody>
              <p className="text-gray-300 mb-4">
                Simple betting calculator for any two-bet scenario.
              </p>
              <Link href="/demo">
                <ModernButton 
                  variant="secondary" 
                  fullWidth
                >
                  Open Calculator
                </ModernButton>
              </Link>
            </ModernCardBody>
          </ModernCard>
        </div>

        {/* Demo Data Warning - Only show for scanner tab */}
        {activeTab === 'scanner' && (
          <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-300 font-semibold">Demo Data Warning</p>
                <p className="text-red-200 text-sm">The arbitrage opportunities shown below are fake demo data. Do not place any real bets based on this information.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">
                  {tabs.find(tab => tab.id === activeTab)?.name || 'Tool'}
                </h2>
                <div className="status-indicator status-active">
                  <span>Active</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ModernButton variant="ghost" size="sm">
                  Reset
                </ModernButton>
                <ModernButton variant="secondary" size="sm">
                  Help
                </ModernButton>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardBody>
            {activeTab === 'scanner' && <EnhancedArbitrageScanner useMockData={true} />}
            {activeTab === 'api-test' && (
              <div className="space-y-6">
                <APIKeyTest />
                <APITest />
              </div>
            )}
          </ModernCardBody>
        </ModernCard>

        {/* Supported Sportsbooks */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              🏢 <span>Supported Sportsbooks</span>
            </h3>
          </ModernCardHeader>
          <ModernCardBody>
            <SupportedSportsbooks />
          </ModernCardBody>
        </ModernCard>

        {/* Pro Tips */}
        <ModernCard variant="default">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              💡 <span>Professional Tips</span>
            </h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="data-card border-l-4 border-l-blue-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <p className="font-semibold text-blue-400 mb-1">Optimal Margins</p>
                    <p className="text-sm text-gray-300">
                      Look for margins above 2.5% for best risk-adjusted returns. Current average: {liveStats.averageMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-green-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="font-semibold text-green-400 mb-1">Speed Matters</p>
                    <p className="text-sm text-gray-300">
                      Odds change rapidly. Act quickly on opportunities with margins above 5%.
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-purple-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-semibold text-purple-400 mb-1">Bankroll Management</p>
                    <p className="text-sm text-gray-300">
                      Never bet more than 5% of your bankroll on a single arbitrage opportunity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="data-card border-l-4 border-l-yellow-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔄</span>
                  <div>
                    <p className="font-semibold text-yellow-400 mb-1">Portfolio Tracking</p>
                    <p className="text-sm text-gray-300">
                      Use the "Record This Arbitrage" feature to track your performance over time.
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