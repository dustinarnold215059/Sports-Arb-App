'use client';

import { useState } from 'react';
import { validateBetAmount, validateOdds } from '../shared/utils/validation';

export function SimpleCalculator() {
  // Bet 1 (left side)
  const [odds1, setOdds1] = useState<number | ''>('');
  const [stake1, setStake1] = useState<number | ''>('');
  
  // Bet 2 (right side)
  const [odds2, setOdds2] = useState<number | ''>('');
  const [stake2, setStake2] = useState<number | ''>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Convert American odds to decimal odds
  const americanToDecimal = (americanOdds: number): number => {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  };

  // Calculate potential payout for a bet
  const calculatePayout = (stake: number, odds: number): number => {
    return stake * americanToDecimal(odds);
  };

  // Calculate profit for a bet
  const calculateProfit = (stake: number, odds: number): number => {
    return calculatePayout(stake, odds) - stake;
  };

  const handleOddsChange = (setter: (value: number | '') => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setErrors(prev => ({ ...prev, [field]: '' }));
      setter('');
      return;
    }
    try {
      const odds = validateOdds(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      setter(odds);
    } catch (error) {
      setErrors(prev => ({ ...prev, [field]: error.message }));
    }
  };

  const handleStakeChange = (setter: (value: number | '') => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setErrors(prev => ({ ...prev, [field]: '' }));
      setter('');
      return;
    }
    try {
      const amount = validateBetAmount(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      setter(amount);
    } catch (error) {
      setErrors(prev => ({ ...prev, [field]: error.message }));
    }
  };

  // Calculate totals (handle empty values)
  const stake1Num = typeof stake1 === 'number' ? stake1 : 0;
  const stake2Num = typeof stake2 === 'number' ? stake2 : 0;
  const odds1Num = typeof odds1 === 'number' ? odds1 : 0;
  const odds2Num = typeof odds2 === 'number' ? odds2 : 0;
  
  const totalStake = stake1Num + stake2Num;
  const payout1 = stake1Num && odds1Num ? calculatePayout(stake1Num, odds1Num) : 0;
  const payout2 = stake2Num && odds2Num ? calculatePayout(stake2Num, odds2Num) : 0;
  const profit1 = stake1Num && odds1Num ? calculateProfit(stake1Num, odds1Num) : 0;
  const profit2 = stake2Num && odds2Num ? calculateProfit(stake2Num, odds2Num) : 0;
  
  // For arbitrage, we want to know the guaranteed outcome
  const totalPayout = payout1 && payout2 ? Math.min(payout1, payout2) : 0; // Worst case scenario
  const totalProfit = totalPayout - totalStake;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-300 text-lg leading-relaxed">
          Simple betting calculator for <span className="text-white font-semibold">any two bets</span>
        </p>
      </div>

      {/* Odds Input - Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🟦</span>
            <h3 className="text-lg font-semibold text-blue-300">Bet 1</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-blue-200 mb-2">
                Odds (e.g. 150 or -150)
              </label>
              <input
                type="number"
                value={odds1}
                onChange={handleOddsChange(setOdds1, 'odds1')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300 backdrop-blur-sm ${
                  errors.odds1 ? 'border-red-500' : 'hover:border-blue-400/70'
                }`}
                placeholder="Enter odds (e.g. 150 or -150)"
                min="-10000"
                max="10000"
              />
              {errors.odds1 && (
                <p className="text-red-400 text-sm mt-1">{errors.odds1}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm text-blue-200 mb-2">
                Stake ($)
              </label>
              <input
                type="number"
                value={stake1}
                onChange={handleStakeChange(setStake1, 'stake1')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300 backdrop-blur-sm ${
                  errors.stake1 ? 'border-red-500' : 'hover:border-blue-400/70'
                }`}
                placeholder="Enter stake amount"
                min="0.01"
                max="100000"
                step="0.01"
              />
              {errors.stake1 && (
                <p className="text-red-400 text-sm mt-1">{errors.stake1}</p>
              )}
            </div>
            
            {/* Bet 1 Profit */}
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
              <div className="text-sm text-blue-200 mb-1">Profit if this wins:</div>
              <div className="text-lg font-bold text-blue-300">
                ${profit1.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🟩</span>
            <h3 className="text-lg font-semibold text-green-300">Bet 2</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-green-200 mb-2">
                Odds (e.g. 130 or -110)
              </label>
              <input
                type="number"
                value={odds2}
                onChange={handleOddsChange(setOdds2, 'odds2')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-green-400/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-white placeholder-green-300 backdrop-blur-sm ${
                  errors.odds2 ? 'border-red-500' : 'hover:border-green-400/70'
                }`}
                placeholder="Enter odds (e.g. 130 or -110)"
                min="-10000"
                max="10000"
              />
              {errors.odds2 && (
                <p className="text-red-400 text-sm mt-1">{errors.odds2}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm text-green-200 mb-2">
                Stake ($)
              </label>
              <input
                type="number"
                value={stake2}
                onChange={handleStakeChange(setStake2, 'stake2')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-green-400/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-white placeholder-green-300 backdrop-blur-sm ${
                  errors.stake2 ? 'border-red-500' : 'hover:border-green-400/70'
                }`}
                placeholder="Enter stake amount"
                min="0.01"
                max="100000"
                step="0.01"
              />
              {errors.stake2 && (
                <p className="text-red-400 text-sm mt-1">{errors.stake2}</p>
              )}
            </div>
            
            {/* Bet 2 Profit */}
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
              <div className="text-sm text-green-200 mb-1">Profit if this wins:</div>
              <div className="text-lg font-bold text-green-300">
                ${profit2.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Totals - Side by Side */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Total Stake</div>
          <div className="text-xl font-bold text-white">
            ${totalStake.toFixed(2)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Total Payout</div>
          <div className="text-xl font-bold text-blue-300">
            ${totalPayout.toFixed(2)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Total Profit</div>
          <div className={`text-xl font-bold ${
            totalProfit > 0 ? 'text-green-300' : totalProfit < 0 ? 'text-red-300' : 'text-gray-300'
          }`}>
            ${totalProfit.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-600/30 rounded-xl">
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong className="text-white">How it works:</strong> Enter the odds and stake for each bet. The calculator shows your profit for each individual bet and the guaranteed outcome when both bets are placed.</p>
          <p><strong className="text-white">Note:</strong> Total payout shows the minimum guaranteed return (worst-case scenario). For arbitrage, this should exceed your total stake.</p>
        </div>
      </div>
    </div>
  );
}