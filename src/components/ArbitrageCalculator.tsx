'use client';

import { useState } from 'react';
import { findArbitrageOpportunity, formatAmericanOdds, ArbitrageOpportunity } from '@/lib/arbitrage';
import { sanitizeInput, validateBetAmount, validateOdds, ValidationError } from '../shared/utils/validation';

interface ArbitrageCalculatorProps {
  initialGame?: string;
  initialTeam1?: string;
  initialTeam2?: string;
}

export function ArbitrageCalculator({ 
  initialGame = "Lakers vs Warriors",
  initialTeam1 = "Lakers", 
  initialTeam2 = "Warriors" 
}: ArbitrageCalculatorProps) {
  const [gameName, setGameName] = useState(initialGame);
  const [team1Name, setTeam1Name] = useState(initialTeam1);
  const [team2Name, setTeam2Name] = useState(initialTeam2);
  const [totalStake, setTotalStake] = useState(1000);
  
  // Bookmaker 1 odds
  const [book1Name, setBook1Name] = useState("Bookmaker 1");
  const [book1Team1Odds, setBook1Team1Odds] = useState(-150);
  const [book1Team2Odds, setBook1Team2Odds] = useState(130);
  
  // Bookmaker 2 odds
  const [book2Name, setBook2Name] = useState("Bookmaker 2");
  const [book2Team1Odds, setBook2Team1Odds] = useState(-140);
  const [book2Team2Odds, setBook2Team2Odds] = useState(120);

  const [result, setResult] = useState<ArbitrageOpportunity | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // SECURITY: Input validation handlers
  const handleTeamNameChange = (setter: (value: string) => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    if (sanitized.length > 50) {
      setErrors(prev => ({ ...prev, [field]: 'Team name too long (max 50 characters)' }));
      return;
    }
    setErrors(prev => ({ ...prev, [field]: '' }));
    setter(sanitized);
  };

  const handleGameNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    if (sanitized.length > 100) {
      setErrors(prev => ({ ...prev, gameName: 'Game name too long (max 100 characters)' }));
      return;
    }
    setErrors(prev => ({ ...prev, gameName: '' }));
    setGameName(sanitized);
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const amount = validateBetAmount(e.target.value);
      setErrors(prev => ({ ...prev, totalStake: '' }));
      setTotalStake(amount);
    } catch (error) {
      setErrors(prev => ({ ...prev, totalStake: error.message }));
    }
  };

  const handleOddsChange = (setter: (value: number) => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const odds = validateOdds(e.target.value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      setter(odds);
    } catch (error) {
      setErrors(prev => ({ ...prev, [field]: error.message }));
    }
  };

  const calculateArbitrage = () => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};

    // Validate all inputs
    try {
      validateBetAmount(totalStake);
      validateOdds(book1Team1Odds);
      validateOdds(book1Team2Odds);
      validateOdds(book2Team1Odds);
      validateOdds(book2Team2Odds);
      
      if (!gameName.trim()) newErrors.gameName = 'Game name is required';
      if (!team1Name.trim()) newErrors.team1Name = 'Team 1 name is required';
      if (!team2Name.trim()) newErrors.team2Name = 'Team 2 name is required';
      if (!book1Name.trim()) newErrors.book1Name = 'Bookmaker 1 name is required';
      if (!book2Name.trim()) newErrors.book2Name = 'Bookmaker 2 name is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsValidating(false);
        return;
      }

      const opportunity = findArbitrageOpportunity(
        { team1: book1Team1Odds, team2: book1Team2Odds },
        { team1: book2Team1Odds, team2: book2Team2Odds },
        team1Name,
        team2Name,
        gameName,
        totalStake
      );
      
      // Update bookmaker names in the result to use custom names
      if (opportunity.isArbitrage) {
        opportunity.bets = opportunity.bets.map(bet => ({
          ...bet,
          bookmaker: bet.bookmaker === 'DraftKings' ? book1Name : book2Name
        }));
      }
      setResult(opportunity);
      setErrors({});
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-300 text-lg leading-relaxed">
          Calculate arbitrage opportunities between <span className="text-white font-semibold">any two sportsbooks</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Game Details */}
        <div className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Game Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Game
            </label>
            <input
              type="text"
              value={gameName}
              onChange={handleGameNameChange}
              className={`w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm ${
                errors.gameName ? 'border-red-500' : 'hover:border-gray-500/70'
              }`}
              maxLength={100}
              placeholder="Lakers vs Warriors"
            />
            {errors.gameName && (
              <p className="text-red-400 text-sm mt-1">{errors.gameName}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team 1
              </label>
              <input
                type="text"
                value={team1Name}
                onChange={handleTeamNameChange(setTeam1Name, 'team1Name')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm ${
                  errors.team1Name ? 'border-red-500' : 'hover:border-gray-500/70'
                }`}
                maxLength={50}
                placeholder="Lakers"
              />
              {errors.team1Name && (
                <p className="text-red-400 text-sm mt-1">{errors.team1Name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team 2
              </label>
              <input
                type="text"
                value={team2Name}
                onChange={handleTeamNameChange(setTeam2Name, 'team2Name')}
                className={`w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm ${
                  errors.team2Name ? 'border-red-500' : 'hover:border-gray-500/70'
                }`}
                maxLength={50}
                placeholder="Warriors"
              />
              {errors.team2Name && (
                <p className="text-red-400 text-sm mt-1">{errors.team2Name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Total Stake ($)
            </label>
            <input
              type="number"
              value={totalStake}
              onChange={handleStakeChange}
              className={`w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm ${
                errors.totalStake ? 'border-red-500' : 'hover:border-gray-500/70'
              }`}
              min="0.01"
              max="100000"
              step="0.01"
              placeholder="1000"
            />
            {errors.totalStake && (
              <p className="text-red-400 text-sm mt-1">{errors.totalStake}</p>
            )}
          </div>
        </div>

        {/* Odds Input */}
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🟦</span>
              <input
                type="text"
                value={book1Name}
                onChange={(e) => setBook1Name(sanitizeInput(e.target.value))}
                className="text-lg font-semibold text-blue-300 bg-transparent border-b border-blue-400/50 focus:border-blue-400 outline-none placeholder-blue-400"
                placeholder="Bookmaker 1"
                maxLength={30}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-blue-200 mb-2">
                  {team1Name}
                </label>
                <input
                  type="number"
                  value={book1Team1Odds}
                  onChange={handleOddsChange(setBook1Team1Odds, 'book1Team1Odds')}
                  className={`w-full px-4 py-3 bg-gray-700/50 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300 backdrop-blur-sm ${
                    errors.book1Team1Odds ? 'border-red-500' : 'hover:border-blue-400/70'
                  }`}
                  placeholder="-150"
                  min="-10000"
                  max="10000"
                />
                {errors.book1Team1Odds && (
                  <p className="text-red-400 text-sm mt-1">{errors.book1Team1Odds}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-blue-200 mb-2">
                  {team2Name}
                </label>
                <input
                  type="number"
                  value={book1Team2Odds}
                  onChange={handleOddsChange(setBook1Team2Odds, 'book1Team2Odds')}
                  className={`w-full px-4 py-3 bg-gray-700/50 border border-blue-400/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300 backdrop-blur-sm ${
                    errors.book1Team2Odds ? 'border-red-500' : 'hover:border-blue-400/70'
                  }`}
                  placeholder="+130"
                  min="-10000"
                  max="10000"
                />
                {errors.book1Team2Odds && (
                  <p className="text-red-400 text-sm mt-1">{errors.book1Team2Odds}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🟩</span>
              <input
                type="text"
                value={book2Name}
                onChange={(e) => setBook2Name(sanitizeInput(e.target.value))}
                className="text-lg font-semibold text-green-300 bg-transparent border-b border-green-400/50 focus:border-green-400 outline-none placeholder-green-400"
                placeholder="Bookmaker 2"
                maxLength={30}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-green-200 mb-2">
                  {team1Name}
                </label>
                <input
                  type="number"
                  value={book2Team1Odds}
                  onChange={handleOddsChange(setBook2Team1Odds, 'book2Team1Odds')}
                  className={`w-full px-4 py-3 bg-gray-700/50 border border-green-400/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-white placeholder-green-300 backdrop-blur-sm ${
                    errors.book2Team1Odds ? 'border-red-500' : 'hover:border-green-400/70'
                  }`}
                  placeholder="-140"
                  min="-10000"
                  max="10000"
                />
                {errors.book2Team1Odds && (
                  <p className="text-red-400 text-sm mt-1">{errors.book2Team1Odds}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-green-200 mb-2">
                  {team2Name}
                </label>
                <input
                  type="number"
                  value={book2Team2Odds}
                  onChange={handleOddsChange(setBook2Team2Odds, 'book2Team2Odds')}
                  className={`w-full px-4 py-3 bg-gray-700/50 border border-green-400/50 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-white placeholder-green-300 backdrop-blur-sm ${
                    errors.book2Team2Odds ? 'border-red-500' : 'hover:border-green-400/70'
                  }`}
                  placeholder="+120"
                  min="-10000"
                  max="10000"
                />
                {errors.book2Team2Odds && (
                  <p className="text-red-400 text-sm mt-1">{errors.book2Team2Odds}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* General Error Display */}
      {errors.general && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-xl border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-300 font-medium">{errors.general}</p>
          </div>
        </div>
      )}

      <button
        onClick={calculateArbitrage}
        disabled={isValidating || Object.values(errors).some(error => !!error)}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
          isValidating || Object.values(errors).some(error => !!error)
            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed backdrop-blur-sm'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl backdrop-blur-sm'
        }`}
      >
        {isValidating ? 'Validating...' : '🎯 Calculate Arbitrage Opportunity'}
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
            
            {result.isArbitrage && (
              <p className="text-green-700 dark:text-green-300">
                Profit Margin: {result.profitMargin.toFixed(2)}% • ROI: {((result.guaranteedProfit / result.totalStake) * 100).toFixed(2)}%
              </p>
            )}
            
            {!result.isArbitrage && (
              <p className="text-red-700 dark:text-red-300">
                The combined implied probability is {((1 - result.profitMargin/100) * 100).toFixed(2)}%, which means no arbitrage opportunity exists.
              </p>
            )}
          </div>

          {result.isArbitrage && (
            <div className="grid md:grid-cols-2 gap-4">
              {result.bets.map((bet, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  bet.bookmaker === book1Name 
                    ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30 backdrop-blur-sm'
                    : 'bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30 backdrop-blur-sm'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${
                      bet.bookmaker === book1Name 
                        ? 'text-blue-300' 
                        : 'text-green-300'
                    }`}>
                      {bet.bookmaker}
                    </h4>
                    <span className="text-sm font-medium text-gray-300">
                      {formatAmericanOdds(bet.odds)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Bet on:</span>
                      <span className="font-medium text-white">{bet.team}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Stake:</span>
                      <span className="font-medium text-white">${bet.stake.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Potential Payout:</span>
                      <span className="font-medium text-green-300">${bet.potentialPayout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-600/30 rounded-xl">
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong className="text-white">How it works:</strong> This calculator finds arbitrage opportunities by comparing odds from any two sportsbooks. When the combined implied probability is less than 100%, you can guarantee a profit by betting on different outcomes with different bookmakers.</p>
          <p><strong className="text-white">Note:</strong> Always verify odds are current before placing bets. Arbitrage opportunities are rare and may be limited by betting limits.</p>
        </div>
      </div>
    </div>
  );
}