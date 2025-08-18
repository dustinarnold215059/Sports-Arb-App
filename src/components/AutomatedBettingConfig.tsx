'use client';

import React, { useState, useEffect } from 'react';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../shared/components/ui/ModernCard';
import { ModernButton, NeonButton, GradientButton } from '../shared/components/ui/ModernButton';
import { ModernBadge, StatusBadge, MetricBadge } from '../shared/components/ui/ModernBadge';
import { AutomationConfig, RiskManagement } from '../lib/automation/BettingAutomationEngine';

interface AutomatedBettingConfigProps {
  config: AutomationConfig;
  riskManagement: RiskManagement;
  onConfigUpdate: (config: Partial<AutomationConfig>) => void;
  onRiskUpdate: (risk: Partial<RiskManagement>) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function AutomatedBettingConfig({
  config,
  riskManagement,
  onConfigUpdate,
  onRiskUpdate,
  isRunning,
  onStart,
  onStop
}: AutomatedBettingConfigProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'risk' | 'bookmakers' | 'advanced'>('general');
  const [tempConfig, setTempConfig] = useState<AutomationConfig>(config);
  const [tempRisk, setTempRisk] = useState<RiskManagement>(riskManagement);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const configChanged = JSON.stringify(tempConfig) !== JSON.stringify(config);
    const riskChanged = JSON.stringify(tempRisk) !== JSON.stringify(riskManagement);
    setHasUnsavedChanges(configChanged || riskChanged);
  }, [tempConfig, tempRisk, config, riskManagement]);

  const handleSave = () => {
    onConfigUpdate(tempConfig);
    onRiskUpdate(tempRisk);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setTempConfig(config);
    setTempRisk(riskManagement);
    setHasUnsavedChanges(false);
  };

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    setTempConfig({ ...tempConfig, ...updates });
  };

  const updateRisk = (updates: Partial<RiskManagement>) => {
    setTempRisk({ ...tempRisk, ...updates });
  };

  const TabButton = ({ tab, label, icon }: { tab: string; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        activeTab === tab
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <ModernCard variant="gradient">
        <ModernCardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold text-white">Automated Betting Configuration</h1>
              <p className="text-gray-300">Configure automated arbitrage betting parameters and risk management</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={isRunning ? 'active' : 'inactive'} />
              {isRunning ? (
                <ModernButton variant="danger" onClick={onStop}>
                  🛑 Stop Automation
                </ModernButton>
              ) : (
                <NeonButton onClick={onStart} disabled={!tempConfig.enabled}>
                  ⚡ Start Automation
                </NeonButton>
              )}
            </div>
          </div>
        </ModernCardHeader>
      </ModernCard>

      {/* Navigation Tabs */}
      <ModernCard variant="default">
        <ModernCardBody padding="sm">
          <div className="flex flex-wrap gap-2">
            <TabButton tab="general" label="General" icon="⚙️" />
            <TabButton tab="risk" label="Risk Management" icon="🛡️" />
            <TabButton tab="bookmakers" label="Bookmakers" icon="🏟️" />
            <TabButton tab="advanced" label="Advanced" icon="🧬" />
          </div>
        </ModernCardBody>
      </ModernCard>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard variant="default">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Basic Configuration</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium">Automation Enabled</label>
                    <p className="text-gray-400 text-sm">Enable or disable automated betting</p>
                  </div>
                  <button
                    onClick={() => updateConfig({ enabled: !tempConfig.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempConfig.enabled ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        tempConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Minimum Margin */}
                <div>
                  <label className="block text-white font-medium mb-2">Minimum Margin (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={tempConfig.minMargin}
                    onChange={(e) => updateConfig({ minMargin: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Only consider opportunities above this margin</p>
                </div>

                {/* Max Stake Per Bet */}
                <div>
                  <label className="block text-white font-medium mb-2">Max Stake Per Bet ($)</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={tempConfig.maxStakePerBet}
                    onChange={(e) => updateConfig({ maxStakePerBet: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-white font-medium mb-2">Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateConfig({ riskLevel: level })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          tempConfig.riskLevel === level
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="neon">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Current Status</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      ${riskManagement.currentBankroll.toLocaleString()}
                    </div>
                    <div className="text-gray-300 text-sm">Current Bankroll</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ${riskManagement.dailyLimit - riskManagement.dailyUsed}
                    </div>
                    <div className="text-gray-300 text-sm">Daily Limit Remaining</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Daily Usage</span>
                    <span className="text-white">
                      ${riskManagement.dailyUsed} / ${riskManagement.dailyLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min((riskManagement.dailyUsed / riskManagement.dailyLimit) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <ModernBadge variant="info" size="sm">
                    {tempConfig.allowedSports.length} Sports Enabled
                  </ModernBadge>
                  <ModernBadge variant="success" size="sm" className="ml-2">
                    {tempConfig.allowedBookmakers.length} Bookmakers Connected
                  </ModernBadge>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>
      )}

      {/* Risk Management */}
      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard variant="default">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Daily & Weekly Limits</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Daily Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempRisk.dailyLimit}
                    onChange={(e) => updateRisk({ dailyLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Weekly Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempRisk.weeklyLimit}
                    onChange={(e) => updateRisk({ weeklyLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Monthly Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempRisk.monthlyLimit}
                    onChange={(e) => updateRisk({ monthlyLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Consecutive Loss Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tempRisk.consecutiveLossLimit}
                    onChange={(e) => updateRisk({ consecutiveLossLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Stop automation after this many consecutive losses</p>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="glass">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Risk Metrics</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                    <div className="text-xl font-bold text-red-400">{tempRisk.consecutiveLosses}</div>
                    <div className="text-gray-300 text-sm">Current Streak</div>
                  </div>
                  <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                    <div className="text-xl font-bold text-green-400">
                      ${tempRisk.minBankroll.toLocaleString()}
                    </div>
                    <div className="text-gray-300 text-sm">Min Bankroll</div>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Minimum Bankroll ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempRisk.minBankroll}
                    onChange={(e) => updateRisk({ minBankroll: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Stop automation if bankroll falls below this amount</p>
                </div>

                <div className="pt-4 space-y-2">
                  <MetricBadge 
                    value={`${((tempRisk.dailyUsed / tempRisk.dailyLimit) * 100).toFixed(1)}%`} 
                    label="Daily Used"
                    trend={tempRisk.dailyUsed > tempRisk.dailyLimit * 0.8 ? 'up' : 'neutral'}
                  />
                  <MetricBadge 
                    value={`${((tempRisk.weeklyUsed / tempRisk.weeklyLimit) * 100).toFixed(1)}%`} 
                    label="Weekly Used"
                    trend={tempRisk.weeklyUsed > tempRisk.weeklyLimit * 0.8 ? 'up' : 'neutral'}
                  />
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>
      )}

      {/* Bookmakers */}
      {activeTab === 'bookmakers' && (
        <ModernCard variant="default">
          <ModernCardHeader>
            <h3 className="text-xl font-semibold text-white">Bookmaker Configuration</h3>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">Allowed Bookmakers</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['DraftKings', 'BetMGM', 'FanDuel', 'Caesars', 'PointsBet', 'BetRivers'].map((bookmaker) => (
                    <div key={bookmaker} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{bookmaker}</span>
                        <StatusBadge status={tempConfig.allowedBookmakers.includes(bookmaker.toLowerCase()) ? 'active' : 'inactive'} />
                      </div>
                      <button
                        onClick={() => {
                          const bookmakers = tempConfig.allowedBookmakers.includes(bookmaker.toLowerCase())
                            ? tempConfig.allowedBookmakers.filter(b => b !== bookmaker.toLowerCase())
                            : [...tempConfig.allowedBookmakers, bookmaker.toLowerCase()];
                          updateConfig({ allowedBookmakers: bookmakers });
                        }}
                        className={`w-8 h-8 rounded-full text-sm ${
                          tempConfig.allowedBookmakers.includes(bookmaker.toLowerCase())
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {tempConfig.allowedBookmakers.includes(bookmaker.toLowerCase()) ? '✓' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">Allowed Sports</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Basketball', 'Football', 'Baseball', 'Hockey', 'Soccer', 'Tennis', 'Golf', 'MMA'].map((sport) => (
                    <button
                      key={sport}
                      onClick={() => {
                        const sports = tempConfig.allowedSports.includes(sport.toLowerCase())
                          ? tempConfig.allowedSports.filter(s => s !== sport.toLowerCase())
                          : [...tempConfig.allowedSports, sport.toLowerCase()];
                        updateConfig({ allowedSports: sports });
                      }}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        tempConfig.allowedSports.includes(sport.toLowerCase())
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      )}

      {/* Advanced Settings */}
      {activeTab === 'advanced' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard variant="gradient">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Advanced Parameters</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Minimum Confidence</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={tempConfig.minConfidence}
                    onChange={(e) => updateConfig({ minConfidence: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Minimum confidence score (0-1) for opportunities</p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Auto-Approve Below Margin (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={tempConfig.autoApproveBelow}
                    onChange={(e) => updateConfig({ autoApproveBelow: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Auto-approve bets with margin below this threshold</p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Cooldown Period (ms)</label>
                  <input
                    type="number"
                    min="0"
                    max="60000"
                    step="1000"
                    value={tempConfig.cooldownPeriod}
                    onChange={(e) => updateConfig({ cooldownPeriod: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Time between automation cycles</p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Max Total Stake ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempConfig.maxTotalStake}
                    onChange={(e) => updateConfig({ maxTotalStake: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <p className="text-gray-400 text-sm mt-1">Maximum total stake across all active bets</p>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>

          <ModernCard variant="neon">
            <ModernCardHeader>
              <h3 className="text-xl font-semibold text-white">Configuration Preview</h3>
            </ModernCardHeader>
            <ModernCardBody>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <StatusBadge status={tempConfig.enabled ? 'active' : 'inactive'} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Risk Level:</span>
                  <ModernBadge variant={tempConfig.riskLevel === 'aggressive' ? 'danger' : tempConfig.riskLevel === 'moderate' ? 'warning' : 'success'} size="xs">
                    {tempConfig.riskLevel}
                  </ModernBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Min Margin:</span>
                  <span className="text-white">{tempConfig.minMargin}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Max Stake:</span>
                  <span className="text-white">${tempConfig.maxStakePerBet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Sports:</span>
                  <span className="text-white">{tempConfig.allowedSports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Bookmakers:</span>
                  <span className="text-white">{tempConfig.allowedBookmakers.length}</span>
                </div>
              </div>
            </ModernCardBody>
          </ModernCard>
        </div>
      )}

      {/* Action Buttons */}
      {hasUnsavedChanges && (
        <ModernCard variant="neon">
          <ModernCardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">You have unsaved changes</p>
                <p className="text-gray-300 text-sm">Save your configuration to apply the changes</p>
              </div>
              <div className="flex gap-3">
                <ModernButton variant="ghost" onClick={handleReset}>
                  Reset Changes
                </ModernButton>
                <GradientButton onClick={handleSave}>
                  💾 Save Configuration
                </GradientButton>
              </div>
            </div>
          </ModernCardBody>
        </ModernCard>
      )}
    </div>
  );
}

export default AutomatedBettingConfig;