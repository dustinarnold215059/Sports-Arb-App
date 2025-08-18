'use client';

import { useState } from 'react';
import { 
  findBestArbitrageOpportunity, 
  formatAmericanOdds, 
  ArbitrageOpportunity, 
  MultiBookmakerOdds,
  SPORTSBOOKS,
  getBookmakerColor
} from '@/lib/arbitrage';

interface MultiBookmakerArbitrageCalculatorProps {
  initialGame?: string;
  initialTeam1?: string;
  initialTeam2?: string;
}

export function MultiBookmakerArbitrageCalculator({ 
  initialGame = "Lakers vs Warriors",
  initialTeam1 = "Lakers", 
  initialTeam2 = "Warriors" 
}: MultiBookmakerArbitrageCalculatorProps) {
  const [gameName, setGameName] = useState(initialGame);
  const [team1Name, setTeam1Name] = useState(initialTeam1);
  const [team2Name, setTeam2Name] = useState(initialTeam2);
  const [totalStake, setTotalStake] = useState(1000);
  
  // Initialize odds for all sportsbooks
  const [bookmakerOdds, setBookmakerOdds] = useState<MultiBookmakerOdds>({
    [SPORTSBOOKS.DRAFTKINGS]: { team1: -150, team2: 130 },
    [SPORTSBOOKS.BETMGM]: { team1: -140, team2: 135 },
    [SPORTSBOOKS.FANDUEL]: { team1: -145, team2: 125 },
    [SPORTSBOOKS.CAESARS]: { team1: -155, team2: 140 },
    [SPORTSBOOKS.POINTSBET]: { team1: -135, team2: 120 },
    [SPORTSBOOKS.BETRIVERS]: { team1: -160, team2: 145 },
    [SPORTSBOOKS.FOURWINDS]: { team1: -148, team2: 128 }
  });

  const [result, setResult] = useState<ArbitrageOpportunity | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>(Object.values(SPORTSBOOKS));

  const updateOdds = (bookmaker: string, team: 'team1' | 'team2', odds: number) => {
    setBookmakerOdds(prev => ({
      ...prev,
      [bookmaker]: {
        ...prev[bookmaker],
        [team]: odds
      }
    }));
  };

  const toggleBookmaker = (bookmaker: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookmaker) 
        ? prev.filter(book => book !== bookmaker)
        : [...prev, bookmaker]
    );
  };

  const calculateArbitrage = () => {
    // Filter to only selected bookmakers
    const filteredOdds: MultiBookmakerOdds = {};
    selectedBooks.forEach(book => {
      if (bookmakerOdds[book]) {
        filteredOdds[book] = bookmakerOdds[book];
      }
    });

    if (Object.keys(filteredOdds).length < 2) {
      alert('Please select at least 2 sportsbooks to compare');
      return;
    }

    const opportunity = findBestArbitrageOpportunity(
      filteredOdds,
      team1Name,
      team2Name,
      gameName,
      totalStake
    );
    setResult(opportunity);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Multi-Sportsbook Arbitrage Calculator
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Find the best arbitrage opportunities across {Object.keys(SPORTSBOOKS).length} sportsbooks
          </p>
        </div>
      </div>

      {/* Game Details */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Game
          </label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team 1
          </label>
          <input
            type="text"
            value={team1Name}
            onChange={(e) => setTeam1Name(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team 2
          </label>
          <input
            type="text"
            value={team2Name}
            onChange={(e) => setTeam2Name(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Stake Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Total Stake Amount ($)
        </label>
        <input
          type="number"
          value={totalStake}
          onChange={(e) => setTotalStake(Number(e.target.value))}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Sportsbook Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Select Sportsbooks to Compare
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.values(SPORTSBOOKS).map(bookmaker => (
            <button
              key={bookmaker}
              onClick={() => toggleBookmaker(bookmaker)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedBooks.includes(bookmaker)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {bookmaker}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Selected: {selectedBooks.length} sportsbooks
        </p>
      </div>

      {/* Odds Input Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Enter Odds for Each Sportsbook
        </h3>
        <div className="grid lg:grid-cols-2 gap-4">
          {Object.values(SPORTSBOOKS).map(bookmaker => {
            const colors = getBookmakerColor(bookmaker);
            const isSelected = selectedBooks.includes(bookmaker);
            
            return (
              <div 
                key={bookmaker}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? `${colors.bg} ${colors.border}` 
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-semibold ${isSelected ? colors.text : 'text-gray-500 dark:text-gray-400'}`}>
                    {bookmaker}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isSelected ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm mb-1 ${isSelected ? colors.text : 'text-gray-400'}`}>
                      {team1Name}
                    </label>
                    <input
                      type="number"
                      value={bookmakerOdds[bookmaker]?.team1 || 0}
                      onChange={(e) => updateOdds(bookmaker, 'team1', Number(e.target.value))}
                      disabled={!isSelected}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                        !isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="-150"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${isSelected ? colors.text : 'text-gray-400'}`}>
                      {team2Name}
                    </label>
                    <input
                      type="number"
                      value={bookmakerOdds[bookmaker]?.team2 || 0}
                      onChange={(e) => updateOdds(bookmaker, 'team2', Number(e.target.value))}
                      disabled={!isSelected}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                        !isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="+130"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={calculateArbitrage}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Find Best Arbitrage Opportunity
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 border-t dark:border-gray-700 pt-6">
          <div className={`p-4 rounded-lg mb-4 ${
            result.isArbitrage 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold text-lg ${
                result.isArbitrage ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                {result.isArbitrage ? '✅ Arbitrage Opportunity Found!' : '❌ No Arbitrage Opportunity'}
              </h3>
              {result.isArbitrage && (
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${result.guaranteedProfit.toFixed(2)} profit
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Compared {result.totalBookmakers} sportsbooks
            </div>
            
            {result.isArbitrage && (
              <p className="text-green-700 dark:text-green-300">
                Profit Margin: {result.profitMargin.toFixed(2)}% • ROI: {((result.guaranteedProfit / result.totalStake) * 100).toFixed(2)}%
              </p>
            )}
            
            {!result.isArbitrage && (
              <p className="text-red-700 dark:text-red-300">
                No arbitrage opportunity found across the selected sportsbooks. Try adjusting the odds or selecting different bookmakers.
              </p>
            )}
          </div>

          {result.isArbitrage && result.bets.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {result.bets.map((bet, index) => {
                const colors = getBookmakerColor(bet.bookmaker);
                return (
                  <div key={index} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${colors.text}`}>
                        {bet.bookmaker}
                      </h4>
                      <span className="text-sm font-mono">
                        {formatAmericanOdds(bet.odds)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Bet on:</span>
                        <span className="font-medium">{bet.team}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Stake:</span>
                        <span className="font-medium">${bet.stake.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Potential Payout:</span>
                        <span className="font-medium">${bet.potentialPayout.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p><strong>Multi-Sportsbook Advantage:</strong> This calculator finds the absolute best odds across all selected sportsbooks, maximizing your arbitrage opportunities and potential profits.</p>
        <p className="mt-1"><strong>Note:</strong> More sportsbooks = better chances of finding profitable arbitrage opportunities. Always verify odds before placing bets.</p>
      </div>
    </div>
  );
}