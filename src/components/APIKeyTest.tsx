'use client';

import { useState } from 'react';

export function APIKeyTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPIKey = async () => {
    setLoading(true);
    setTestResult('Testing API key...');

    try {
      const apiKey = process.env.NEXT_PUBLIC_ODDS_API_KEY || '7f0bd24ef41d31ae6fd09082bc36d3bb'; // Fresh API key
      
      // Detailed debugging
      setTestResult(`Debug Info:
• API Key exists: ${!!apiKey}
• API Key length: ${apiKey?.length || 0}
• API Key preview: "${apiKey?.substring(0, 8)}..."
• Environment loaded: ${!!process.env.NEXT_PUBLIC_ODDS_API_KEY}`);
      
      // Basic validation
      if (!apiKey) {
        setTestResult('❌ No API key found in environment variables');
        return;
      }
      
      if (apiKey.includes('your-api-key-here')) {
        setTestResult('❌ API key is still the default placeholder');
        return;
      }
      
      // Test with a simple API call to get available sports
      const url = `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`;
      console.log('Testing API key with URL:', url.replace(apiKey, 'HIDDEN'));
      
      const response = await fetch(url);
      
      if (response.status === 401) {
        setTestResult('❌ Invalid API key - 401 Unauthorized');
        return;
      }
      
      if (response.status === 429) {
        setTestResult('⚠️ API rate limit exceeded - too many requests');
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        setTestResult(`❌ API Error: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      setTestResult(`✅ API key is valid! Found ${data.length} available sports.\n\nKey: ${apiKey.substring(0, 8)}...\nStatus: ${response.status}\nSample sports: ${data.slice(0, 5).map((s: any) => s.title).join(', ')}`);
      
    } catch (error: any) {
      console.error('API Key Test Error:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        🔑 API Key Validation Test
      </h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Current API key: {(process.env.NEXT_PUBLIC_ODDS_API_KEY || '7f0bd24ef41d31ae6fd09082bc36d3bb').substring(0, 8) + '...'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          From environment variable: NEXT_PUBLIC_ODDS_API_KEY
        </p>
      </div>
      
      <button
        onClick={testAPIKey}
        disabled={loading}
        className={`mb-4 px-4 py-2 rounded-lg font-medium transition-colors ${
          loading
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Testing...' : 'Test API Key'}
      </button>

      {testResult && (
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap">
          {testResult}
        </pre>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
          Troubleshooting Tips:
        </h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Make sure .env.local file exists in project root</li>
          <li>• Restart your development server after adding the API key</li>
          <li>• API key should be 32 characters long</li>
          <li>• Free tier: 500 requests/month</li>
        </ul>
      </div>
    </div>
  );
}