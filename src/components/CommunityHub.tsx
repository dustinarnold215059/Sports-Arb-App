'use client';

import { useState, useEffect } from 'react';
import { communityManager, CommunityPost, CommunityUser, Leaderboard, CommunityChallenge, formatRank, getRarityColor, getSubscriptionTierColor } from '@/lib/community';
import { useAuth } from '../shared/auth/authProvider';
import { Card, CardHeader, CardBody, Button, Badge, Alert } from '../shared/components/ui';

type TabType = 'feed' | 'leaderboards' | 'challenges' | 'profile';

export function CommunityHub() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [communityUser, setCommunityUser] = useState<CommunityUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<CommunityPost['type']>('discussion');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCommunityData();
    }
  }, [isAuthenticated, user]);

  const loadCommunityData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [communityUserData, postsData, leaderboardsData, challengesData] = await Promise.all([
        communityManager.getCommunityUser(user.id),
        communityManager.getPosts(20),
        communityManager.getAllLeaderboards(),
        communityManager.getChallenges()
      ]);

      setCommunityUser(communityUserData);
      setPosts(postsData);
      setLeaderboards(leaderboardsData);
      setChallenges(challengesData);
    } catch (error) {
      console.error('Failed to load community data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;

    try {
      const newPost = await communityManager.createPost(user.id, {
        type: newPostType,
        content: newPostContent.trim(),
        tags: extractTags(newPostContent),
        title: newPostType === 'tip' || newPostType === 'discussion' ? 
          newPostContent.split('\n')[0].slice(0, 100) : undefined
      });

      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      setNewPostType('discussion');
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      await communityManager.likePost(postId, user.id);
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      await communityManager.joinChallenge(challengeId, user.id);
      setChallenges(prev => prev.map(challenge =>
        challenge.id === challengeId 
          ? { ...challenge, participants: [...challenge.participants, user.id] }
          : challenge
      ));
    } catch (error) {
      console.error('Failed to join challenge:', error);
      alert('Failed to join challenge. Please try again.');
    }
  };

  const extractTags = (content: string): string[] => {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPostTypeIcon = (type: CommunityPost['type']) => {
    const icons = {
      bet_share: '🎲',
      tip: '💡',
      discussion: '💬',
      achievement: '🏆',
      arbitrage_alert: '🎯'
    };
    return icons[type];
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert
          variant="info"
          title="Join the Community"
          description="Sign in to connect with other sports bettors, share strategies, and compete in challenges."
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🏟️ Community Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect, compete, and learn from fellow bettors
          </p>
        </div>

        {communityUser && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {communityUser.displayName || communityUser.username}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ROI: {communityUser.stats.roi.toFixed(1)}% • 
                Rank: {formatRank(1)} {/* Would get actual rank from leaderboard */}
              </div>
            </div>
            <div className="flex gap-1">
              {communityUser.badges.slice(0, 3).map(badge => (
                <span key={badge.id} title={badge.description} className="text-2xl">
                  {badge.icon}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'feed', label: '📰 Feed', count: posts.length },
          { id: 'leaderboards', label: '🏆 Leaderboards', count: leaderboards.length },
          { id: 'challenges', label: '🎯 Challenges', count: challenges.filter(c => c.status === 'active').length },
          { id: 'profile', label: '👤 Profile', count: null }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <Badge variant="secondary" className="ml-2">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Create Post */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Share with the community</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[
                    { type: 'discussion', label: '💬 Discussion', desc: 'Start a conversation' },
                    { type: 'tip', label: '💡 Tip', desc: 'Share strategy advice' },
                    { type: 'achievement', label: '🏆 Achievement', desc: 'Celebrate a win' }
                  ].map(({ type, label, desc }) => (
                    <button
                      key={type}
                      onClick={() => setNewPostType(type as CommunityPost['type'])}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        newPostType === type
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={desc}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={`Share your ${newPostType === 'tip' ? 'betting tip' : newPostType === 'achievement' ? 'latest win' : 'thoughts'}...`}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={4}
                  maxLength={1000}
                />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {newPostContent.length}/1000 characters • Use #hashtags for better discovery
                  </span>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    variant="primary"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardBody className="p-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {post.displayName?.[0] || post.username[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {post.displayName || post.username}
                          </span>
                          {post.isVerified && <span title="Verified user">✅</span>}
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSubscriptionTierColor(post.subscriptionTier)}`}
                          >
                            {post.subscriptionTier}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{getPostTypeIcon(post.type)}</span>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                          {post.isPinned && <Badge variant="warning" className="text-xs">Pinned</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    {post.title && (
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {post.title}
                      </h4>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span>❤️</span>
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors">
                        <span>💬</span>
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors">
                        <span>🔄</span>
                        <span className="text-sm">{post.shares}</span>
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {leaderboards.map(leaderboard => (
            <Card key={leaderboard.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{leaderboard.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {leaderboard.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {leaderboard.period.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {leaderboard.entries.slice(0, 10).map((entry, index) => (
                    <div key={entry.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold min-w-[2rem]">
                          {formatRank(entry.rank)}
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {entry.displayName?.[0] || entry.username[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {entry.displayName || entry.username}
                            </span>
                            {entry.isVerified && <span>✅</span>}
                          </div>
                          <div className="flex gap-1">
                            {entry.badges.slice(0, 2).map(badge => (
                              <span key={badge.id} className="text-sm" title={badge.description}>
                                {badge.icon}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {leaderboard.metric === 'profit' ? `$${entry.value.toFixed(2)}` :
                           leaderboard.metric === 'roi' || leaderboard.metric === 'winrate' ? `${entry.value.toFixed(1)}%` :
                           entry.value.toString()}
                        </div>
                        {entry.change !== 0 && (
                          <div className={`text-xs ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.change > 0 ? '↗️' : '↘️'} {Math.abs(entry.change)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm">
                    View Full Leaderboard
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map(challenge => (
            <Card key={challenge.id} className={`${challenge.status === 'active' ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{challenge.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{challenge.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {challenge.description}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={challenge.status === 'active' ? 'success' : 
                            challenge.status === 'upcoming' ? 'warning' : 'secondary'}
                  >
                    {challenge.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Target:</span>
                      <div className="font-semibold">
                        {challenge.type === 'roi' ? `${challenge.target}% ROI` :
                         challenge.type === 'arbitrage' ? `${challenge.target} opportunities` :
                         challenge.target.toString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <div className="font-semibold">{challenge.duration} days</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Participants:</span>
                      <div className="font-semibold">{challenge.participants.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                      <div className="font-semibold">
                        {new Date(challenge.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">🏆 Prizes</h4>
                    <div className="space-y-1 text-sm">
                      <div>🥇 1st: {challenge.prizes.first}</div>
                      <div>🥈 2nd: {challenge.prizes.second}</div>
                      <div>🥉 3rd: {challenge.prizes.third}</div>
                      <div>🎖️ All: {challenge.prizes.participation}</div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {challenge.participants.includes(user?.id || '') ? (
                      <Badge variant="success" className="w-full justify-center py-2">
                        ✅ Participating
                      </Badge>
                    ) : challenge.status === 'active' ? (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => handleJoinChallenge(challenge.id)}
                      >
                        Join Challenge
                      </Button>
                    ) : challenge.status === 'upcoming' ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleJoinChallenge(challenge.id)}
                      >
                        Register Now
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        Challenge Ended
                      </Badge>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'profile' && communityUser && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardBody className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                  {communityUser.displayName?.[0] || communityUser.username[0]}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {communityUser.displayName || communityUser.username}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="secondary" className={getSubscriptionTierColor(communityUser.subscriptionTier)}>
                    {communityUser.subscriptionTier}
                  </Badge>
                  {communityUser.isVerified && <span title="Verified user">✅</span>}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {communityUser.followers.length}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {communityUser.following.length}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Following</div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Member since {new Date(communityUser.joinedAt).toLocaleDateString()}
                </div>
              </CardBody>
            </Card>

            {/* Badges */}
            <Card className="mt-6">
              <CardHeader>
                <h3 className="text-lg font-semibold">🏅 Badges</h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-3">
                  {communityUser.badges.map(badge => (
                    <div
                      key={badge.id}
                      className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      title={badge.description}
                    >
                      <div className="text-2xl mb-1">{badge.icon}</div>
                      <div className={`text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                        {badge.name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">📊 Performance Stats</h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Bets', value: communityUser.stats.totalBets.toString(), icon: '🎲' },
                    { label: 'Win Rate', value: `${communityUser.stats.winRate.toFixed(1)}%`, icon: '🎯' },
                    { label: 'ROI', value: `${communityUser.stats.roi.toFixed(1)}%`, icon: '📈' },
                    { label: 'Net Profit', value: `$${communityUser.stats.netProfit.toFixed(2)}`, icon: '💰' },
                    { label: 'Arbitrage Count', value: communityUser.stats.arbitrageCount.toString(), icon: '⚡' },
                    { label: 'Best Streak', value: communityUser.stats.streakBest.toString(), icon: '🔥' },
                    { label: 'Current Streak', value: communityUser.stats.streakCurrent.toString(), icon: '📊' },
                    { label: 'Months Active', value: communityUser.stats.monthsActive.toString(), icon: '📅' }
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Privacy Settings */}
            <Card className="mt-6">
              <CardHeader>
                <h3 className="text-lg font-semibold">🔒 Privacy Settings</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {[
                    { key: 'showStats', label: 'Show performance stats publicly', description: 'Allow others to see your betting statistics' },
                    { key: 'showBets', label: 'Show individual bets', description: 'Display your bet history to the community' },
                    { key: 'allowMessages', label: 'Allow direct messages', description: 'Let other users send you private messages' }
                  ].map(setting => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {setting.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {setting.description}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={communityUser.privacy[setting.key as keyof typeof communityUser.privacy]}
                          className="sr-only peer"
                          readOnly
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}