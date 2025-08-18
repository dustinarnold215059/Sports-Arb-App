'use client';

import { useState, useEffect, useCallback } from 'react';
import { arbitrageWorkerManager, CalculationProgress, WorkerFilters } from '@/lib/workers/arbitrageWorkerManager';
import { ArbitrageOpportunity } from '@/lib/arbitrage';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge, Alert } from '../shared/components/ui';

interface OddsInput {
  bookmaker: string;
  team1Odds: string;
  team2Odds: string;
  team1Name: string;
  team2Name: string;
}

export function EnhancedArbitrageCalculator() {
  const { user, isAuthenticated } = useAuth();
  const [gameName, setGameName] = useState('');
  const [oddsInputs, setOddsInputs] = useState<OddsInput[]>([
    { bookmaker: 'DraftKings', team1Odds: '', team2Odds: '', team1Name: 'Team 1', team2Name: 'Team 2' },
    { bookmaker: 'BetMGM', team1Odds: '', team2Odds: '', team1Name: 'Team 1', team2Name: 'Team 2' }
  ]);
  const [totalStake, setTotalStake] = useState(1000);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<CalculationProgress | null>(null);
  const [calculationTime, setCalculationTime] = useState<number | null>(null);
  const [workerStatus, setWorkerStatus] = useState<any>(null);
  const [filters, setFilters] = useState<WorkerFilters>({
    minProfitMargin: 0.5,
    minGuaranteedProfit: 5,
    maxStakePerBet: 10000
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    // Update worker status periodically
    const statusInterval = setInterval(() => {
      setWorkerStatus(arbitrageWorkerManager.getStatus());
    }, 2000);

    return () => clearInterval(statusInterval);
  }, []);

  const addBookmaker = () => {
    setOddsInputs(prev => [...prev, {
      bookmaker: '',
      team1Odds: '',
      team2Odds: '',
      team1Name: prev[0]?.team1Name || 'Team 1',
      team2Name: prev[0]?.team2Name || 'Team 2'
    }]);
  };

  const removeBookmaker = (index: number) => {
    if (oddsInputs.length <= 2) return; // Keep minimum 2 bookmakers
    setOddsInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateOddsInput = (index: number, field: keyof OddsInput, value: string) => {
    setOddsInputs(prev => prev.map((input, i) => 
      i === index ? { ...input, [field]: value } : input
    ));
  };

  const updateTeamNames = (team1Name: string, team2Name: string) => {
    setOddsInputs(prev => prev.map(input => ({
      ...input,
      team1Name,
      team2Name
    })));
  };

  const validateInputs = (): string | null => {
    if (!gameName.trim()) {
      return 'Please enter a game name';
    }

    if (oddsInputs.length < 2) {
      return 'At least 2 bookmakers are required';
    }

    for (let i = 0; i < oddsInputs.length; i++) {
      const input = oddsInputs[i];
      
      if (!input.bookmaker.trim()) {
        return `Please enter bookmaker name for entry ${i + 1}`;
      }
      
      if (!input.team1Odds || !input.team2Odds) {
        return `Please enter odds for both teams for ${input.bookmaker}`;
      }
      
      const team1Odds = parseFloat(input.team1Odds);
      const team2Odds = parseFloat(input.team2Odds);
      
      if (isNaN(team1Odds) || isNaN(team2Odds)) {
        return `Invalid odds format for ${input.bookmaker}`;
      }
      
      // Validate American odds format
      if (team1Odds === 0 || team2Odds === 0) {
        return `Odds cannot be zero for ${input.bookmaker}`;
      }
    }

    if (totalStake <= 0) {
      return 'Total stake must be greater than 0';
    }

    return null;
  };

  const handleCalculate = useCallback(async () => {
    const validationError = validateInputs();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsCalculating(true);
    setCalculationProgress(null);
    setCalculationTime(null);
    setOpportunities([]);

    try {
      // Convert inputs to the format expected by the worker
      const outcomes: { [bookmaker: string]: { [team: string]: number } } = {};
      
      oddsInputs.forEach(input => {
        outcomes[input.bookmaker] = {
          [input.team1Name]: parseFloat(input.team1Odds),
          [input.team2Name]: parseFloat(input.team2Odds)
        };
      });

      const oddsData = {
        game: gameName,
        outcomes
      };

      const startTime = performance.now();
      
      const result = await arbitrageWorkerManager.calculateArbitrage(
        oddsData,
        (progress) => setCalculationProgress(progress)
      );
      
      const endTime = performance.now();
      setCalculationTime(endTime - startTime);
      
      // Scale opportunities to the user's total stake
      const scaledOpportunities = result.opportunities.map(opportunity => {
        const scaleFactor = totalStake / opportunity.totalStake;
        return {
          ...opportunity,
          totalStake,
          guaranteedProfit: opportunity.guaranteedProfit * scaleFactor,
          bets: opportunity.bets.map(bet => ({
            ...bet,
            stake: bet.stake * scaleFactor,
            potentialPayout: bet.potentialPayout * scaleFactor
          }))
        };
      });

      setOpportunities(scaledOpportunities);
      
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
      setCalculationProgress(null);
    }
  }, [gameName, oddsInputs, totalStake]);

  const handleBatchCalculate = async () => {
    // Demo batch calculation with multiple games
    const demoGames = [
      {
        id: 'game1',
        game: 'Lakers vs Warriors',
        outcomes: {
          'DraftKings': { 'Lakers': 150, 'Warriors': -180 },
          'BetMGM': { 'Lakers': 140, 'Warriors': -160 },
          'FanDuel': { 'Lakers': 160, 'Warriors': -190 }
        }
      },
      {
        id: 'game2',
        game: 'Celtics vs Heat',
        outcomes: {
          'DraftKings': { 'Celtics': -120, 'Heat': 110 },
          'BetMGM': { 'Celtics': -115, 'Heat': 105 },
          'Caesars': { 'Celtics': -125, 'Heat': 115 }
        }
      },
      {
        id: 'game3',
        game: 'Nets vs 76ers',
        outcomes: {
          'FanDuel': { 'Nets': 130, '76ers': -150 },
          'BetMGM': { 'Nets': 125, '76ers': -145 },
          'DraftKings': { 'Nets': 135, '76ers': -155 }
        }
      }
    ];

    setIsCalculating(true);
    setCalculationProgress(null);

    try {
      const startTime = performance.now();
      
      const result = await arbitrageWorkerManager.batchCalculateArbitrage(
        demoGames,
        filters,
        3,
        (progress) => setCalculationProgress(progress)
      );
      
      const endTime = performance.now();
      setCalculationTime(endTime - startTime);
      
      setOpportunities(result.allOpportunities || []);
      
    } catch (error) {
      console.error('Batch calculation error:', error);
      alert(`Batch calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
      setCalculationProgress(null);
    }
  };

  const performanceTest = async () => {
    setIsCalculating(true);
    try {
      const result = await arbitrageWorkerManager.performanceTest();
      alert(`Performance Test Results:
Average calculation time: ${result.averageCalculationTime.toFixed(2)}ms
Total opportunities found: ${result.totalOpportunities}
Worker performance: ${result.workersPerformance.map(p => p.toFixed(2)).join(', ')}ms`);
    } catch (error) {
      alert(`Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const getProfitabilityColor = (profitMargin: number) => {
    if (profitMargin >= 5) return 'text-green-600';
    if (profitMargin >= 2) return 'text-blue-600';
    if (profitMargin >= 1) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ⚡ Enhanced Arbitrage Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            High-performance arbitrage detection with Web Workers
          </p>
        </div>

        {workerStatus && (
          <div className="text-right text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              Workers: {workerStatus.availableWorkers}/{workerStatus.totalWorkers} available
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Active calculations: {workerStatus.activeCalculations}
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Game Setup</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Game Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., Lakers vs Warriors"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Team Names */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Team 1 Name
                    </label>
                    <input
                      type="text"
                      value={oddsInputs[0]?.team1Name || ''}
                      onChange={(e) => updateTeamNames(e.target.value, oddsInputs[0]?.team2Name || '')}
                      placeholder="Team 1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Team 2 Name
                    </label>
                    <input
                      type="text"
                      value={oddsInputs[0]?.team2Name || ''}
                      onChange={(e) => updateTeamNames(oddsInputs[0]?.team1Name || '', e.target.value)}
                      placeholder="Team 2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Total Stake */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Stake Amount
                  </label>
                  <input
                    type="number"
                    value={totalStake}
                    onChange={(e) => setTotalStake(parseFloat(e.target.value) || 0)}
                    min="1"
                    step="10"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Bookmaker Odds */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Bookmaker Odds</h3>
                <Button onClick={addBookmaker} variant="secondary" size="sm">
                  + Add Bookmaker
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {oddsInputs.map((input, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Bookmaker {index + 1}
                      </h4>
                      {oddsInputs.length > 2 && (
                        <Button
                          onClick={() => removeBookmaker(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Bookmaker
                        </label>
                        <input
                          type="text"
                          value={input.bookmaker}
                          onChange={(e) => updateOddsInput(index, 'bookmaker', e.target.value)}
                          placeholder="e.g., DraftKings"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {input.team1Name} Odds
                        </label>
                        <input
                          type="number"
                          value={input.team1Odds}
                          onChange={(e) => updateOddsInput(index, 'team1Odds', e.target.value)}
                          placeholder="e.g., +150"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {input.team2Name} Odds
                        </label>
                        <input
                          type="number"
                          value={input.team2Odds}
                          onChange={(e) => updateOddsInput(index, 'team2Odds', e.target.value)}
                          placeholder="e.g., -180"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Controls and Advanced Settings */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Actions</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <Button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  variant="primary"
                  className="w-full"
                >
                  {isCalculating ? '⏳ Calculating...' : '🎯 Calculate Arbitrage'}
                </Button>

                <Button
                  onClick={handleBatchCalculate}
                  disabled={isCalculating}
                  variant="secondary"
                  className="w-full"
                >
                  📊 Demo Batch Calculate
                </Button>

                <Button
                  onClick={performanceTest}
                  disabled={isCalculating}
                  variant="ghost"
                  className="w-full text-sm"
                >
                  🚀 Performance Test
                </Button>
              </div>

              {/* Calculation Progress */}
              {calculationProgress && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <span>Processing...</span>
                    <span>{calculationProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculationProgress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {calculationProgress.processed} / {calculationProgress.total} processed
                  </div>
                </div>
              )}

              {calculationTime && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  ⏱️ Calculation completed in {calculationTime.toFixed(2)}ms
                </div>
              )}
            </CardBody>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold">Advanced Settings</h3>
                <span className="text-gray-500">
                  {showAdvancedSettings ? '−' : '+'}
                </span>
              </button>
            </CardHeader>
            {showAdvancedSettings && (
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Profit Margin (%)
                    </label>
                    <input
                      type="number"
                      value={filters.minProfitMargin || 0}
                      onChange={(e) => setFilters(prev => ({ ...prev, minProfitMargin: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Guaranteed Profit ($)
                    </label>
                    <input
                      type="number"
                      value={filters.minGuaranteedProfit || 0}
                      onChange={(e) => setFilters(prev => ({ ...prev, minGuaranteedProfit: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Stake Per Bet ($)
                    </label>
                    <input
                      type="number"
                      value={filters.maxStakePerBet || 10000}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxStakePerBet: parseFloat(e.target.value) || 10000 }))}
                      min="1"
                      step="100"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      {/* Results */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                🎯 Arbitrage Opportunities ({opportunities.length} found)
              </h3>
              <Badge variant="success">
                Best: {opportunities[0]?.profitMargin.toFixed(2)}% profit
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {opportunities.map((opportunity, index) => (
                <div key={index} className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {opportunity.game}
                      </h4>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="success" className="text-sm">
                          {formatCurrency(opportunity.guaranteedProfit)} guaranteed profit
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-sm ${getProfitabilityColor(opportunity.profitMargin)}`}
                        >
                          {opportunity.profitMargin.toFixed(2)}% margin
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {opportunity.bets.length} bets • {opportunity.totalBookmakers} bookmakers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {opportunity.bets.map((bet, betIndex) => (
                      <div key={betIndex} className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {bet.bookmaker}
                          </span>
                          <Badge variant="primary" className="text-xs">
                            {bet.team}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Odds:</span>
                            <span className="font-medium">{formatOdds(bet.odds)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Stake:</span>
                            <span className="font-medium">{formatCurrency(bet.stake)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Payout:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(bet.potentialPayout)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(opportunity.totalStake)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Total Stake</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(opportunity.guaranteedProfit)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Guaranteed Profit</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">
                          {opportunity.profitMargin.toFixed(2)}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Profit Margin</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* No Opportunities Found */}
      {!isCalculating && opportunities.length === 0 && gameName && (
        <Alert
          variant="info"
          title="No Arbitrage Opportunities Found"
          description="The current odds don't present any profitable arbitrage opportunities. Try adjusting the odds or adding more bookmakers."
        />
      )}
    </div>
  );
}