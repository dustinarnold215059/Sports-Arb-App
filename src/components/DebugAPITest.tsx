'use client';

import { useState } from 'react';

export function DebugAPITest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sport, setSport] = useState('basketball_nba');
  const [markets, setMarkets] = useState('h2h');
  const [bookmakers, setBookmakers] = useState('draftkings,fanduel,betmgm');

  const testDebugAPI = async () => {
    setLoading(true);
    setTestResult('Testing debug API...');

    try {
      const params = new URLSearchParams({
        sport,
        markets,
        bookmakers
      });
      
      const response = await fetch(`/api/debug-odds?${params}`);
      const data = await response.json();
      
      let result = `🔍 Debug API Test Results:\n\n`;
      result += `Sport: ${data.debug.sport}\n`;
      result += `Markets: ${data.debug.markets}\n`;
      result += `Bookmakers: ${data.debug.bookmakers}\n`;
      result += `Status: ${data.debug.status}\n`;
      result += `Response Time: ${data.debug.responseTime}\n`;
      result += `Remaining Requests: ${data.debug.remaining || 'Unknown'}\n`;
      result += `Used Requests: ${data.debug.used || 'Unknown'}\n\n`;
      
      if (data.success) {
        result += `✅ SUCCESS!\n`;
        if (Array.isArray(data.data)) {
          result += `Games Found: ${data.data.length}\n\n`;
          
          if (data.data.length > 0) {
            result += `Sample Games:\n`;
            data.data.slice(0, 3).forEach((game: any, i: number) => {
              result += `${i + 1}. ${game.away_team} @ ${game.home_team}\n`;
              result += `   Starts: ${new Date(game.commence_time).toLocaleString()}\n`;
              result += `   Bookmakers: ${game.bookmakers?.length || 0}\n`;
            });
          }
        }
      } else {
        result += `❌ FAILED\n`;
        result += `Error: ${data.error?.message || 'Unknown error'}\n`;
      }
      
      result += `\n🌐 API URL (key hidden):\n${data.debug.url}`;
      
      setTestResult(result);

    } catch (error: any) {
      console.error('Debug API Test Error:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        🔍 Debug API Tester
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sport
          </label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="basketball_nba">NBA Basketball</option>
            <option value="americanfootball_nfl">NFL Football</option>
            <option value="soccer_epl">English Premier League</option>
            <option value="basketball_ncaab">College Basketball</option>
            <option value="americanfootball_ncaaf">College Football</option>
            <option value="baseball_mlb">MLB Baseball</option>
            <option value="icehockey_nhl">NHL Hockey</option>
            <option value="mma_mixed_martial_arts">MMA</option>
            <option value="soccer_spain_la_liga">La Liga</option>
            <option value="soccer_usa_mls">MLS</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Markets
          </label>
          <select
            value={markets}
            onChange={(e) => setMarkets(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="none">No markets (default)</option>
            <option value="h2h">Moneyline (h2h)</option>
            <option value="h2h,spreads">Moneyline + Spreads</option>
            <option value="h2h,spreads,totals">Basic 3 Markets</option>
            <option value="h2h,spreads,totals,btts">Soccer Markets</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bookmakers
          </label>
          <select
            value={bookmakers}
            onChange={(e) => setBookmakers(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="none">No bookmakers (all)</option>
            <option value="draftkings">DraftKings only</option>
            <option value="draftkings,fanduel">DK + FanDuel</option>
            <option value="draftkings,fanduel,betmgm">Top 3</option>
            <option value="draftkings,fanduel,betmgm,caesars,pointsbet,betrivers">All 6</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={testDebugAPI}
        disabled={loading}
        className={`mb-4 px-6 py-2 rounded-lg font-medium transition-colors ${
          loading
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {loading ? 'Testing...' : 'Run Debug Test'}
      </button>

      {testResult && (
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap font-mono">
          {testResult}
        </pre>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
          Debug Strategy:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Start with simplest parameters (no markets, single bookmaker)</li>
          <li>• Gradually add complexity to find what works</li>
          <li>• Check which sports are currently in season</li>
          <li>• Monitor remaining API requests</li>
        </ul>
      </div>
    </div>
  );
}