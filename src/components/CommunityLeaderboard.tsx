'use client';

import { useState, useEffect } from 'react';
import { communityManager, Leaderboard, LeaderboardEntry, formatRank, getSubscriptionTierColor } from '@/lib/community';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge } from '../shared/components/ui';

export function CommunityLeaderboard() {
  const { user, isAuthenticated } = useAuth();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string>('monthly_roi');
  const [currentLeaderboard, setCurrentLeaderboard] = useState<Leaderboard | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  useEffect(() => {
    if (leaderboards.length > 0) {
      const selected = leaderboards.find(lb => lb.id === selectedLeaderboard) || leaderboards[0];
      setCurrentLeaderboard(selected);
      
      if (user && selected) {
        getUserRankInLeaderboard(selected.id);
      }
    }
  }, [selectedLeaderboard, leaderboards, user]);

  const loadLeaderboards = async () => {
    setIsLoading(true);
    try {
      const data = await communityManager.getAllLeaderboards();
      setLeaderboards(data);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRankInLeaderboard = async (leaderboardId: string) => {
    if (!user) return;
    
    try {
      const rank = await communityManager.getUserRank(user.id, leaderboardId);
      setUserRank(rank);
    } catch (error) {
      console.error('Failed to get user rank:', error);
      setUserRank(null);
    }
  };

  const formatValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'profit':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'roi':
      case 'winrate':
        return `${value.toFixed(1)}%`;
      case 'arbitrage_count':
      case 'streak':
      case 'volume':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getMetricIcon = (metric: string): string => {
    const icons = {
      roi: '📈',
      profit: '💰',
      winrate: '🎯',
      arbitrage_count: '⚡',
      streak: '🔥',
      volume: '📊'
    };
    return icons[metric as keyof typeof icons] || '📊';
  };

  const formatPeriod = (period: string): string => {
    return period.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeUntilUpdate = (nextUpdate: string): string => {
    const now = new Date();
    const updateTime = new Date(nextUpdate);
    const diffInMs = updateTime.getTime() - now.getTime();
    
    if (diffInMs <= 0) return 'Updating...';
    
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Updates in ${hours}h ${minutes}m`;
    }
    return `Updates in ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🏆 Community Leaderboards
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            See how you stack up against the competition
          </p>
        </div>
        
        {isAuthenticated && userRank && (
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">Your Rank</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatRank(userRank)}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {leaderboards.map(leaderboard => (
          <button
            key={leaderboard.id}
            onClick={() => setSelectedLeaderboard(leaderboard.id)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              selectedLeaderboard === leaderboard.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{getMetricIcon(leaderboard.metric)}</span>
            <span className="font-medium">{leaderboard.name}</span>
            <Badge variant="secondary" className="text-xs">
              {formatPeriod(leaderboard.period)}
            </Badge>
          </button>
        ))}
      </div>

      {/* Current Leaderboard */}
      {currentLeaderboard && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>{getMetricIcon(currentLeaderboard.metric)}</span>
                  {currentLeaderboard.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentLeaderboard.description}
                </p>
              </div>
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                <div>Last updated: {new Date(currentLeaderboard.lastUpdated).toLocaleString()}</div>
                <div className="font-medium text-blue-600">
                  {formatTimeUntilUpdate(currentLeaderboard.nextUpdate)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* Top 3 Podium */}
            {currentLeaderboard.entries.length >= 3 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-center">🏆 Top Performers</h3>
                <div className="flex justify-center items-end gap-4 mb-6">
                  {/* Second Place */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-lg font-bold relative">
                      {currentLeaderboard.entries[1].displayName?.[0] || currentLeaderboard.entries[1].username[0]}
                      <div className="absolute -top-2 -right-2 text-2xl">🥈</div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {currentLeaderboard.entries[1].displayName || currentLeaderboard.entries[1].username}
                    </div>
                    <div className="text-lg font-bold text-gray-600">
                      {formatValue(currentLeaderboard.entries[1].value, currentLeaderboard.metric)}
                    </div>
                  </div>

                  {/* First Place */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold relative">
                      {currentLeaderboard.entries[0].displayName?.[0] || currentLeaderboard.entries[0].username[0]}
                      <div className="absolute -top-3 -right-3 text-3xl">🥇</div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {currentLeaderboard.entries[0].displayName || currentLeaderboard.entries[0].username}
                    </div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatValue(currentLeaderboard.entries[0].value, currentLeaderboard.metric)}
                    </div>
                  </div>

                  {/* Third Place */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-lg font-bold relative">
                      {currentLeaderboard.entries[2].displayName?.[0] || currentLeaderboard.entries[2].username[0]}
                      <div className="absolute -top-2 -right-2 text-2xl">🥉</div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {currentLeaderboard.entries[2].displayName || currentLeaderboard.entries[2].username}
                    </div>
                    <div className="text-lg font-bold text-amber-600">
                      {formatValue(currentLeaderboard.entries[2].value, currentLeaderboard.metric)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Rank
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Value
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Change
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Badges
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeaderboard.entries.map((entry, index) => (
                    <tr 
                      key={entry.userId} 
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        user?.id === entry.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold min-w-[2rem]">
                            {formatRank(entry.rank)}
                          </span>
                          {entry.rank <= 3 && (
                            <div className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full">
                              TOP 3
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            entry.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                            entry.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                            'bg-gradient-to-br from-blue-500 to-purple-600'
                          }`}>
                            {entry.displayName?.[0] || entry.username[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {entry.displayName || entry.username}
                              </span>
                              {entry.isVerified && <span title="Verified user">✅</span>}
                              {user?.id === entry.userId && (
                                <Badge variant="primary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getSubscriptionTierColor(entry.subscriptionTier)}`}
                            >
                              {entry.subscriptionTier}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatValue(entry.value, currentLeaderboard.metric)}
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        {entry.change !== 0 ? (
                          <div className={`flex items-center gap-1 ${
                            entry.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{entry.change > 0 ? '↗️' : '↘️'}</span>
                            <span className="font-medium">{Math.abs(entry.change)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="flex gap-1">
                          {entry.badges.slice(0, 3).map(badge => (
                            <span 
                              key={badge.id} 
                              className="text-lg" 
                              title={`${badge.name}: ${badge.description}`}
                            >
                              {badge.icon}
                            </span>
                          ))}
                          {entry.badges.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              +{entry.badges.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentLeaderboard.entries.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No entries yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Be the first to appear on this leaderboard!
                </p>
              </div>
            )}

            {/* User's Position (if not in top entries) */}
            {isAuthenticated && userRank && userRank > 10 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-blue-600">
                        {formatRank(userRank)}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Your Position
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Keep climbing to reach the top 10!
                        </div>
                      </div>
                    </div>
                    <Button variant="primary" size="sm">
                      View Full Ranking
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Leaderboard Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">⏰</div>
            <div className="font-semibold text-gray-900 dark:text-white">Update Frequency</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentLeaderboard?.period === 'daily' ? 'Every 24 hours' :
               currentLeaderboard?.period === 'weekly' ? 'Every Sunday' :
               currentLeaderboard?.period === 'monthly' ? 'Monthly' : 'Real-time'}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold text-gray-900 dark:text-white">How to Climb</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentLeaderboard?.metric === 'roi' ? 'Improve your ROI' :
               currentLeaderboard?.metric === 'profit' ? 'Increase profits' :
               currentLeaderboard?.metric === 'arbitrage_count' ? 'Find more arbitrage' :
               'Boost your stats'}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="text-center p-4">
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-semibold text-gray-900 dark:text-white">Rewards</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Monthly winners get exclusive badges and recognition
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}