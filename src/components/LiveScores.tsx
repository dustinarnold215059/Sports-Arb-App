'use client';

import { useScores, Sport } from '@/hooks/useScores';
import { useState } from 'react';

interface LiveScoresProps {
  sport: Sport;
}

export function LiveScores({ sport }: LiveScoresProps) {
  const { scores, loading, error, refetch } = useScores(sport, { updateIntervalSeconds: 30 });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading && scores.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading scores: {error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {sport.toUpperCase()} Live Scores
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-2 rounded-lg border ${
            refreshing 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg 
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>

      {scores.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No games available for {sport.toUpperCase()}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {scores.map((game) => (
            <div 
              key={game.id} 
              className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {game.status === 'live' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 text-sm font-medium">LIVE</span>
                    </div>
                  )}
                  {game.status === 'final' && (
                    <span className="text-gray-600 text-sm font-medium">FINAL</span>
                  )}
                  {game.status === 'upcoming' && (
                    <span className="text-blue-600 text-sm font-medium">UPCOMING</span>
                  )}
                </div>
                
                {game.quarter && game.time && (
                  <span className="text-sm text-gray-600">
                    {game.quarter} • {game.time}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Away Team */}
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{game.awayTeam}</div>
                  <div className="text-sm text-gray-600">Away</div>
                </div>

                {/* Score */}
                <div className="text-center">
                  {game.status === 'upcoming' ? (
                    <div className="text-lg font-bold text-gray-400">VS</div>
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {game.awayScore} - {game.homeScore}
                    </div>
                  )}
                </div>

                {/* Home Team */}
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{game.homeTeam}</div>
                  <div className="text-sm text-gray-600">Home</div>
                </div>
              </div>

              {game.status === 'upcoming' && (
                <div className="mt-3 text-center text-sm text-gray-600">
                  {new Date(game.date).toLocaleDateString()} at 8:00 PM
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}