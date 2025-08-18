'use client';

import { useState, useEffect } from 'react';
import { 
  betTracker, 
  TrackedBet, 
  ArbitrageGroup, 
  BettingPortfolio,
  BetStatus,
  BetType,
  formatCurrency,
  formatPercentage,
  formatDate,
  getBetTypeIcon,
  getStatusColor
} from '@/lib/betTracking';
import { ArbitrageOpportunity } from '@/lib/arbitrage';
import { useAuth } from '../shared/auth/authProvider';

interface BetTrackerProps {
  opportunity?: ArbitrageOpportunity;
  onBetRecorded?: () => void;
}

export function BetTracker({ opportunity, onBetRecorded }: BetTrackerProps) {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'portfolio'>('record');
  const [bets, setBets] = useState<TrackedBet[]>([]);
  const [arbitrageGroups, setArbitrageGroups] = useState<ArbitrageGroup[]>([]);
  const [portfolio, setPortfolio] = useState<BettingPortfolio | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Single bet form
  const [singleBetForm, setSingleBetForm] = useState({
    bookmaker: '',
    profile: '',
    eventTime: '',
    sport: '',
    league: '',
    eventName: '',
    bet: '',
    amount: 100,
    odds: 0,
    status: 'pending' as BetStatus,
    betType: 'normal' as BetType,
    notes: '',
    isBonusBet: false
  });

  // Supported sportsbooks only
  const sportsbooks = [
    'DraftKings', 'BetMGM', 'FanDuel', 'Caesars', 'PointsBet', 'BetRivers',
    'Four Winds Casino', 'ESPN BET', 'Fanatics Sportsbook', 'Eagle Casino',
    'FireKeepers', 'BetPARX', 'Golden Nugget'
  ];

  // Sports list in exact order specified with emojis
  const sports = [
    { name: 'Soccer', emoji: '⚽' },
    { name: 'Basketball', emoji: '🏀' },
    { name: 'Baseball', emoji: '⚾' },
    { name: 'Ice Hockey', emoji: '🏒' },
    { name: 'Football', emoji: '🏈' },
    { name: 'Tennis', emoji: '🎾' },
    { name: 'Table Tennis', emoji: '🏓' },
    { name: 'Volleyball', emoji: '🏐' },
    { name: 'Boxing', emoji: '🥊' },
    { name: 'Handball', emoji: '🤾' },
    { name: 'Cricket', emoji: '🏏' },
    { name: 'Darts', emoji: '🎯' },
    { name: 'MMA', emoji: '🥋' },
    { name: 'Badminton', emoji: '🏸' },
    { name: 'E-Sports', emoji: '🎮' },
    { name: 'Netball', emoji: '🥅' },
    { name: 'Futsal', emoji: '⚽' },
    { name: 'Snooker', emoji: '🎱' },
    { name: 'Australian Rugby', emoji: '🏉' },
    { name: 'Rugby', emoji: '🏉' },
    { name: 'Floorball', emoji: '🏒' },
    { name: 'Waterpolo', emoji: '🤽' }
  ];
  

  useEffect(() => {
    // Set current user in bet tracker when component mounts or user changes
    if (isAuthenticated && user) {
      betTracker.setCurrentUser(user.id);
    } else {
      betTracker.setCurrentUser(null);
    }
    refreshData();
  }, [user, isAuthenticated]);

  // Pre-populate form if opportunity is provided
  useEffect(() => {
    if (opportunity) {
      setSingleBetForm(prev => ({
        ...prev,
        eventName: opportunity.game,
        sport: opportunity.betType || 'moneyline'
      }));
    }
  }, [opportunity]);

  const refreshData = () => {
    setBets(betTracker.getAllBets());
    setArbitrageGroups(betTracker.getArbitrageGroups());
    setPortfolio(betTracker.getPortfolioStats());
  };

  const handleRecordSingleBet = () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      alert('Please login to record bets. You must be signed in to use the bet tracking system.');
      return;
    }

    if (!singleBetForm.eventName || !singleBetForm.bookmaker || !singleBetForm.bet || !singleBetForm.amount || !singleBetForm.odds) {
      alert('Please fill in all required fields (Book, Event Name, Bet, Amount, and Odds)');
      return;
    }

    // Ensure user is set in bet tracker (redundant safety check)
    if (!betTracker.currentUserId) {
      betTracker.setCurrentUser(user.id);
    }

    const potentialPayout = singleBetForm.odds > 0 
      ? singleBetForm.amount * (1 + singleBetForm.odds / 100)
      : singleBetForm.amount * (1 + 100 / Math.abs(singleBetForm.odds));

    try {
      betTracker.addBet({
        game: singleBetForm.eventName,
        sport: singleBetForm.sport || 'Unknown',
        league: singleBetForm.league,
        team1: 'Team 1', // Keep for compatibility
        team2: 'Team 2', // Keep for compatibility
        betType: singleBetForm.betType,
        bookmaker: singleBetForm.bookmaker,
        profile: singleBetForm.profile,
        selection: singleBetForm.bet,
        odds: singleBetForm.odds,
        stake: singleBetForm.amount,
        potentialPayout,
        status: singleBetForm.status,
        isArbitrage: singleBetForm.betType === 'arbitrage',
        isBonusBet: singleBetForm.isBonusBet,
        hasDrawRisk: false,
        riskLevel: 'low',
        notes: singleBetForm.notes,
        gameStartTime: singleBetForm.eventTime ? new Date(singleBetForm.eventTime) : undefined
      });

      // Show confirmation message
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);

      // Reset form
      setSingleBetForm({
        bookmaker: '',
        profile: '',
        eventTime: '',
        sport: '',
        league: '',
        eventName: '',
        bet: '',
        amount: 100,
        odds: 0,
        status: 'pending' as BetStatus,
        betType: 'normal' as BetType,
        notes: '',
        isBonusBet: false
      });

      refreshData();
      onBetRecorded?.();
    } catch (error) {
      console.error('Error recording bet:', error);
      alert(`Failed to record bet: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };


  const updateBetStatus = (betId: string, status: BetStatus, actualPayout?: number) => {
    betTracker.updateBetStatus(betId, status, actualPayout);
    refreshData();
  };


  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-xl">
      {/* Tabs */}
      <div className="border-b border-gray-700/50">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'record', name: 'Record Bets', icon: '📝' },
            { id: 'history', name: 'Bet History', icon: '📋' },
            { id: 'portfolio', name: 'Portfolio', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'record' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Record New Bets
              </h3>
              
              {/* Authentication Warning */}
              {(!isAuthenticated || !user) && (
                <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-yellow-400">⚠️</div>
                    <div>
                      <h4 className="font-medium text-yellow-300">Authentication Required</h4>
                      <p className="text-sm text-yellow-200">
                        Please log in to record bets. You must be signed in to use the bet tracking system.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Single Bet Form Only */}
              <div className="mb-6">
                <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium inline-flex items-center gap-2">
                  📝 Single Bet Tracker
                </div>
              </div>

              {/* New Form Layout with Requested Fields */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Book *
                  </label>
                  <select
                    value={singleBetForm.bookmaker}
                    onChange={(e) => setSingleBetForm({...singleBetForm, bookmaker: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  >
                    <option value="" className="bg-gray-900 text-gray-400">📚 Select Sportsbook</option>
                    {sportsbooks.map(book => (
                      <option key={book} value={book} className="bg-gray-900 text-white">{book}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile
                  </label>
                  <input
                    type="text"
                    value={singleBetForm.profile}
                    onChange={(e) => setSingleBetForm({...singleBetForm, profile: e.target.value})}
                    placeholder="e.g. Main Account"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Time
                  </label>
                  <input
                    type="datetime-local"
                    value={singleBetForm.eventTime}
                    onChange={(e) => setSingleBetForm({...singleBetForm, eventTime: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sport
                  </label>
                  <select
                    value={singleBetForm.sport}
                    onChange={(e) => setSingleBetForm({...singleBetForm, sport: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  >
                    <option value="" className="bg-gray-900 text-gray-400">🏆 Select Sport</option>
                    {sports.map(sport => (
                      <option key={sport.name} value={sport.name} className="bg-gray-900 text-white">
                        {sport.emoji} {sport.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    League
                  </label>
                  <input
                    type="text"
                    value={singleBetForm.league}
                    onChange={(e) => setSingleBetForm({...singleBetForm, league: e.target.value})}
                    placeholder="e.g. Premier League, Big Ten"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={singleBetForm.eventName}
                    onChange={(e) => setSingleBetForm({...singleBetForm, eventName: e.target.value})}
                    placeholder="e.g. Lakers vs Warriors"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bet *
                  </label>
                  <input
                    type="text"
                    value={singleBetForm.bet}
                    onChange={(e) => setSingleBetForm({...singleBetForm, bet: e.target.value})}
                    placeholder="e.g. Lakers ML, Over 220.5"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={singleBetForm.amount}
                    onChange={(e) => setSingleBetForm({...singleBetForm, amount: Number(e.target.value)})}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Odds (American) *
                  </label>
                  <input
                    type="number"
                    value={singleBetForm.odds === 0 ? '' : singleBetForm.odds}
                    onChange={(e) => setSingleBetForm({...singleBetForm, odds: Number(e.target.value) || 0})}
                    placeholder="e.g. -110, +150"
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={singleBetForm.status}
                    onChange={(e) => setSingleBetForm({...singleBetForm, status: e.target.value as BetStatus})}
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  >
                    <option value="pending" className="bg-gray-900 text-white">⏳ Pending</option>
                    <option value="won" className="bg-gray-900 text-white">✅ Won</option>
                    <option value="lost" className="bg-gray-900 text-white">❌ Lost</option>
                    <option value="pushed" className="bg-gray-900 text-white">🤝 Push</option>
                    <option value="cancelled" className="bg-gray-900 text-white">🚫 Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bet Type
                  </label>
                  <select
                    value={singleBetForm.betType}
                    onChange={(e) => setSingleBetForm({...singleBetForm, betType: e.target.value as BetType})}
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  >
                    <option value="normal" className="bg-gray-900 text-white">📋 Normal</option>
                    <option value="plus_ev" className="bg-gray-900 text-white">💰 +EV</option>
                    <option value="arbitrage" className="bg-gray-900 text-white">🎯 Arbitrage</option>
                    <option value="middle" className="bg-gray-900 text-white">📊 Middle</option>
                  </select>
                </div>
              </div>

              {/* Bonus Bet Toggle and Notes */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bonus Bet
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={singleBetForm.isBonusBet}
                        onChange={(e) => setSingleBetForm({...singleBetForm, isBonusBet: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700/80 backdrop-blur-xl peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-lg peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 shadow-lg shadow-black/10"></div>
                    </label>
                    <span className="text-sm text-gray-300">
                      {singleBetForm.isBonusBet ? '🎁 Bonus Bet' : '💵 Regular Bet'}
                    </span>
                  </div>
                  {singleBetForm.isBonusBet && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Bonus bets: No stake loss on losing bets
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={singleBetForm.notes}
                    onChange={(e) => setSingleBetForm({...singleBetForm, notes: e.target.value})}
                    rows={3}
                    placeholder="Any additional notes about this bet..."
                    className="w-full px-4 py-3 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-600 shadow-lg shadow-black/10"
                  />
                </div>
              </div>

              {/* Record Button */}
              <button
                onClick={handleRecordSingleBet}
                disabled={!isAuthenticated || !user}
                className={`w-full font-medium py-3 px-4 rounded-lg transition-colors shadow-lg ${
                  !isAuthenticated || !user
                    ? 'bg-gray-600 cursor-not-allowed text-gray-300 shadow-gray-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-blue-600/40'
                }`}
              >
                {!isAuthenticated || !user ? '🔒 Login Required' : '📝 Record Bet'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                📋 <span>Bet History</span>
                <span className="text-blue-400">({bets.length})</span>
              </h3>
              <div className="flex gap-2">
                <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-1 rounded-lg">
                  Showing latest 20 bets
                </div>
              </div>
            </div>
            
            {bets.length === 0 ? (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl p-12 text-center">
                <div className="text-6xl mb-6">📋</div>
                <h4 className="text-xl font-semibold text-white mb-3">No Bets Recorded Yet</h4>
                <p className="text-gray-300 mb-6">Start tracking your betting performance with our advanced analytics</p>
                <div className="flex justify-center">
                  <button 
                    onClick={() => setActiveTab('record')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/30"
                  >
                    📝 Record Your First Bet
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bets.slice(0, 20).map((bet) => {
                  const colors = getStatusColor(bet.status);
                  return (
                    <div key={bet.id} className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all duration-200 shadow-lg shadow-black/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center text-lg">
                            {getBetTypeIcon(bet.betType)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-lg">{bet.game}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {bet.isArbitrage && <span className="text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-1 rounded-lg font-medium">ARB</span>}
                              {bet.isBonusBet && <span className="text-xs bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-2 py-1 rounded-lg font-medium">🎁 BONUS</span>}
                              {bet.hasDrawRisk && <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg font-medium">⚠️ RISK</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium px-3 py-2 rounded-xl ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {bet.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Sportsbook</div>
                          <div className="font-semibold text-white">{bet.bookmaker}</div>
                          {bet.profile && (
                            <div className="text-xs text-gray-500 mt-1">Profile: {bet.profile}</div>
                          )}
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Sport & League</div>
                          <div className="font-semibold text-white">{bet.sport}</div>
                          {bet.league && (
                            <div className="text-xs text-gray-500 mt-1">{bet.league}</div>
                          )}
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Selection</div>
                          <div className="font-semibold text-white">{bet.selection}</div>
                          <div className="text-xs text-gray-500 mt-1">{getBetTypeIcon(bet.betType)} {bet.betType}</div>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Odds & Stake</div>
                          <div className="font-semibold text-white">{bet.odds > 0 ? '+' : ''}{bet.odds}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatCurrency(bet.stake)} staked</div>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Profit/Loss</div>
                          <div className={`font-semibold text-lg ${
                            bet.profit === undefined ? 'text-gray-400' :
                            bet.profit > 0 ? 'text-green-400' :
                            bet.profit < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {bet.profit !== undefined ? formatCurrency(bet.profit) : 'Pending'}
                          </div>
                        </div>
                        {bet.gameStartTime && (
                          <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                            <div className="text-sm text-gray-400 mb-2">Event Time</div>
                            <div className="font-semibold text-white text-sm">{formatDate(bet.gameStartTime)}</div>
                          </div>
                        )}
                      </div>

                      {bet.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <div className="text-sm text-gray-400 mb-3">Update Bet Status:</div>
                          <div className="flex gap-3 flex-wrap">
                            <button
                              onClick={() => {
                                // Calculate payout automatically based on odds and stake
                                const calculatedPayout = bet.odds > 0 
                                  ? bet.stake * (1 + bet.odds / 100)
                                  : bet.stake * (1 + 100 / Math.abs(bet.odds));
                                updateBetStatus(bet.id, 'won', calculatedPayout);
                              }}
                              className="bg-blue-600/80 backdrop-blur-xl hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
                            >
                              ✅ Won
                            </button>
                            <button
                              onClick={() => updateBetStatus(bet.id, 'lost')}
                              className="bg-gray-700/80 backdrop-blur-xl hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-gray-700/20 hover:shadow-gray-700/30"
                            >
                              ❌ Lost
                            </button>
                            <button
                              onClick={() => updateBetStatus(bet.id, 'pushed')}
                              className="bg-gray-600/80 backdrop-blur-xl hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-gray-600/20 hover:shadow-gray-600/30"
                            >
                              🤝 Push
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400">
                            📅 {formatDate(bet.timestamp)}
                          </div>
                          {bet.notes && (
                            <div className="text-xs text-gray-400 max-w-md">
                              💬 <span className="italic">{bet.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {activeTab === 'portfolio' && portfolio && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                📊 <span>Portfolio Analytics</span>
              </h3>
              <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-1 rounded-lg">
                Performance Overview
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl hover:border-gray-600/50 transition-all duration-200 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-blue-400">💰</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {formatCurrency(portfolio.totalStaked)}
                </div>
                <div className="text-sm text-gray-300">Total Staked</div>
              </div>
              
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl hover:border-gray-600/50 transition-all duration-200 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-blue-400">📈</span>
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  portfolio.netProfit > 0 ? 'text-blue-400' : 
                  portfolio.netProfit < 0 ? 'text-gray-400' : 'text-gray-400'
                }`}>
                  {formatCurrency(portfolio.netProfit)}
                </div>
                <div className="text-sm text-gray-300">Net Profit</div>
              </div>
              
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl hover:border-gray-600/50 transition-all duration-200 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-blue-400">🎯</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {formatPercentage(portfolio.winRate)}
                </div>
                <div className="text-sm text-gray-300">Win Rate</div>
              </div>
              
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl hover:border-gray-600/50 transition-all duration-200 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-blue-400">📋</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {portfolio.totalBets}
                </div>
                <div className="text-sm text-gray-300">Total Bets</div>
              </div>
            </div>

            {/* Arbitrage Performance */}
            {portfolio.arbitrageGroups > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl shadow-lg shadow-black/10">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  🎯 <span>Arbitrage Performance</span>
                </h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Success Rate</div>
                    <div className="text-xl font-bold text-blue-400">{formatPercentage(portfolio.arbitrageSuccessRate)}</div>
                  </div>
                  <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Avg Profit</div>
                    <div className="text-xl font-bold text-blue-400">{formatCurrency(portfolio.averageArbitrageProfit)}</div>
                  </div>
                  <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Groups</div>
                    <div className="text-xl font-bold text-blue-400">{portfolio.successfulArbitrages}/{portfolio.arbitrageGroups}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bookmaker Performance */}
            {Object.keys(portfolio.bookmakerStats).length > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl shadow-lg shadow-black/10">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  📊 <span>Bookmaker Performance</span>
                </h4>
                <div className="space-y-3">
                  {Object.entries(portfolio.bookmakerStats).map(([bookmaker, stats]) => (
                    <div key={bookmaker} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 hover:border-gray-600/50 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white">{bookmaker}</div>
                        <div className="text-right">
                          <div className="text-sm text-gray-300">{stats.bets} bets • <span className={`font-medium ${
                            stats.profit > 0 ? 'text-blue-400' : 
                            stats.profit < 0 ? 'text-gray-400' : 'text-gray-400'
                          }`}>{formatCurrency(stats.profit)}</span></div>
                          <div className="text-xs text-gray-400">
                            {formatPercentage(stats.winRate)} win rate
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bet Type Performance */}
            {Object.values(portfolio.betTypeStats).some(stats => stats.bets > 0) && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl shadow-lg shadow-black/10">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  🎲 <span>Bet Type Performance</span>
                </h4>
                <div className="space-y-3">
                  {Object.entries(portfolio.betTypeStats)
                    .filter(([, stats]) => stats.bets > 0)
                    .map(([betType, stats]) => (
                      <div key={betType} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 hover:border-gray-600/50 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white">
                            {getBetTypeIcon(betType as BetType)} {betType.toUpperCase()}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-300">{stats.bets} bets • <span className={`font-medium ${
                              stats.profit > 0 ? 'text-blue-400' : 
                              stats.profit < 0 ? 'text-gray-400' : 'text-gray-400'
                            }`}>{formatCurrency(stats.profit)}</span></div>
                            <div className="text-xs text-gray-400">
                              {formatPercentage(stats.winRate)} win rate
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Export/Import */}
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-xl shadow-lg shadow-black/10">
              <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                🔧 <span>Data Management</span>
              </h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const data = betTracker.exportData();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `arbitrage-bets-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  }}
                  className="bg-blue-600/80 backdrop-blur-xl hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
                >
                  📤 Export Data
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const data = e.target?.result as string;
                          if (betTracker.importData(data)) {
                            refreshData();
                            alert('Data imported successfully!');
                          } else {
                            alert('Failed to import data. Please check the file format.');
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="bg-blue-600/80 backdrop-blur-xl hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
                >
                  📥 Import Data
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all bet data? This cannot be undone.')) {
                      betTracker.clearAllData();
                      refreshData();
                    }
                  }}
                  className="bg-gray-700/80 backdrop-blur-xl hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-gray-700/20 hover:shadow-gray-700/30"
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Toast */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="font-medium">Bet Confirmed!</span>
          </div>
        </div>
      )}
    </div>
  );
}