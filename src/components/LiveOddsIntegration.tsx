'use client';

import { useState, useEffect } from 'react';
import { fetchLiveOdds, transformOddsData, RateLimiter, SETUP_INSTRUCTIONS, SUPPORTED_SPORTS } from '@/lib/oddsAPI';
import { findBestArbitrageOpportunity } from '@/lib/arbitrage';

const rateLimiter = new RateLimiter();

export function LiveOddsIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveOdds, setLiveOdds] = useState<any[]>([]);
  const [arbitrageOpps, setArbitrageOpps] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState(SUPPORTED_SPORTS.NFL);
  const [apiKeyStatus, setApiKeyStatus] = useState<'missing' | 'testing' | 'valid' | 'invalid'>('missing');

  // Check if API key is configured
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ODDS_API_KEY || 'b8fe6dead67058775bb5ae595cc57b94'; // Fresh API key
    if (!apiKey || apiKey.includes('your-api-key-here')) {
      setApiKeyStatus('missing');
    } else {
      setApiKeyStatus('testing');
      testConnection();
    }
  }, []);

  const testConnection = async () => {
    if (!rateLimiter.canMakeRequest()) {
      setError(`API rate limit reached. ${rateLimiter.getRemainingRequests()} requests remaining.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      rateLimiter.recordRequest();
      
      // First, let's check what sports are available
      console.log('Testing API connection...');
      console.log('Selected sport:', selectedSport);
      
      const data = await fetchLiveOdds(selectedSport);
      
      if (data && data.length > 0) {
        setApiKeyStatus('valid');
        setIsConnected(true);
        
        const transformedData = transformOddsData(data);
        setLiveOdds(transformedData);
        
        // Find arbitrage opportunities
        const opportunities = transformedData
          .map(game => {
            if (Object.keys(game.odds).length >= 2) {
              return findBestArbitrageOpportunity(
                game.odds,
                game.team1,
                game.team2,
                game.game,
                1000
              );
            }
            return null;
          })
          .filter(opp => opp && opp.isArbitrage);
        
        setArbitrageOpps(opportunities);
      } else {
        // API connection is working but no games found
        setApiKeyStatus('valid');
        setIsConnected(true);
        
        // Try to get more info about why no games were found
        const sportName = Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === selectedSport)?.[0] || selectedSport;
        setError(`No games found for ${sportName}. This could be because:
        
1. It's currently off-season for ${sportName}
2. No games are scheduled today
3. Games haven't started yet (odds may not be available)
4. Try selecting a different sport

Check the browser console for more details.`);
      }
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setError(err.message || 'Failed to connect to odds API');
      setApiKeyStatus('invalid');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (isConnected) {
      testConnection();
    }
  };

  if (apiKeyStatus === 'missing') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            API Key Required for Live Data
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            To get live odds data from sportsbooks, you need an API key from The Odds API.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">
              {SETUP_INSTRUCTIONS.title}
            </h3>
            <div className="text-left space-y-3">
              {SETUP_INSTRUCTIONS.steps.map((step) => (
                <div key={step.step} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-300">{step.title}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Pricing Options</h4>
            <div className="text-sm text-green-800 dark:text-green-300 space-y-1">
              <div><strong>Free:</strong> {SETUP_INSTRUCTIONS.pricing.free}</div>
              <div><strong>Pro:</strong> {SETUP_INSTRUCTIONS.pricing.paid}</div>
              <div><strong>Enterprise:</strong> {SETUP_INSTRUCTIONS.pricing.enterprise}</div>
            </div>
          </div>

          <a
            href="https://the-odds-api.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Free API Key →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live Odds Integration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Real-time data from The Odds API • {rateLimiter.getRemainingRequests()} requests remaining
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(SUPPORTED_SPORTS).map(([name, key]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <button
            onClick={refreshData}
            disabled={loading || !rateLimiter.canMakeRequest()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              loading || !rateLimiter.canMakeRequest()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="text-red-500">⚠️</div>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Connection Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Fetching live odds data...</p>
        </div>
      )}

      {isConnected && !loading && (
        <>
          {/* Live Arbitrage Opportunities */}
          {arbitrageOpps.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
                🎯 Live Arbitrage Opportunities Found!
              </h3>
              <div className="space-y-4">
                {arbitrageOpps.map((opp, index) => (
                  <div key={index} className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{opp.game}</h4>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${opp.guaranteedProfit.toFixed(2)} profit
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {opp.profitMargin.toFixed(2)}% margin • ROI: {((opp.guaranteedProfit / opp.totalStake) * 100).toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Games Data */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Live Games ({liveOdds.length})
            </h3>
            {liveOdds.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                No games found for {Object.entries(SUPPORTED_SPORTS).find(([, value]) => value === selectedSport)?.[0] || selectedSport}
              </p>
            ) : (
              <div className="grid gap-4">
                {liveOdds.slice(0, 5).map((game, index) => (
                  <div key={index} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{game.game}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {Object.keys(game.odds).length} sportsbooks
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(game.odds).map(([bookmaker, odds]: [string, any]) => (
                        <div key={bookmaker} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <span className="font-medium">{bookmaker}:</span> {odds.team1 > 0 ? '+' : ''}{odds.team1} / {odds.team2 > 0 ? '+' : ''}{odds.team2}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}