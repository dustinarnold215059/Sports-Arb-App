'use client';

import { useState } from 'react';

export function APITest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setTestResult('Testing API connection...');

    try {
      // Test the raw API endpoint
      const apiKey = '7f0bd24ef41d31ae6fd09082bc36d3bb'; // Fresh API key
      console.log('API Key (first 10 chars):', apiKey?.substring(0, 10) + '...');

      // First, test available sports
      const sportsUrl = `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`;
      console.log('Testing sports endpoint:', sportsUrl);
      
      const sportsResponse = await fetch(sportsUrl);
      const sportsData = await sportsResponse.json();
      
      console.log('Sports API Response:', sportsResponse.status);
      console.log('Available sports:', sportsData);

      if (!sportsResponse.ok) {
        setTestResult(`Sports API Error: ${sportsResponse.status} - ${JSON.stringify(sportsData)}`);
        return;
      }

      // Test NBA odds
      const nbaUrl = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=h2h&bookmakers=draftkings,betmgm,fanduel&oddsFormat=american`;
      console.log('Testing NBA endpoint:', nbaUrl);
      
      const nbaResponse = await fetch(nbaUrl);
      const nbaData = await nbaResponse.json();
      
      console.log('NBA API Response:', nbaResponse.status);
      console.log('NBA games:', nbaData);

      // Test NFL odds
      const nflUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=h2h&bookmakers=draftkings,betmgm,fanduel&oddsFormat=american`;
      console.log('Testing NFL endpoint:', nflUrl);
      
      const nflResponse = await fetch(nflUrl);
      const nflData = await nflResponse.json();
      
      console.log('NFL API Response:', nflResponse.status);
      console.log('NFL games:', nflData);

      // Compile results
      let result = `API Test Results:\n\n`;
      result += `✅ Sports API: ${sportsResponse.status} - Found ${sportsData.length} sports\n`;
      result += `📊 NBA Games: ${nbaResponse.status} - Found ${nbaData.length} games\n`;
      result += `🏈 NFL Games: ${nflResponse.status} - Found ${nflData.length} games\n\n`;
      
      result += `Available Sports:\n`;
      sportsData.slice(0, 10).forEach((sport: any) => {
        result += `- ${sport.title} (${sport.key})\n`;
      });

      if (nbaData.length > 0) {
        result += `\nNBA Games Found:\n`;
        nbaData.slice(0, 3).forEach((game: any) => {
          result += `- ${game.away_team} @ ${game.home_team}\n`;
        });
      }

      if (nflData.length > 0) {
        result += `\nNFL Games Found:\n`;
        nflData.slice(0, 3).forEach((game: any) => {
          result += `- ${game.away_team} @ ${game.home_team}\n`;
        });
      }

      setTestResult(result);

    } catch (error: any) {
      console.error('API Test Error:', error);
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        🔧 API Connection Test
      </h2>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className={`mb-4 px-4 py-2 rounded-lg font-medium transition-colors ${
          loading
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>

      {testResult && (
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {testResult}
        </pre>
      )}
    </div>
  );
}