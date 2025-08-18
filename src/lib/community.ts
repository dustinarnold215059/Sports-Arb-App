/**
 * Community Features System
 * Handles leaderboards, social features, and user interactions
 */

import { TrackedBet } from './betTracking';
import { AdvancedAnalytics } from './analytics';

export interface CommunityUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  joinedAt: string;
  isVerified: boolean;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
  privacy: {
    showStats: boolean;
    showBets: boolean;
    allowMessages: boolean;
  };
  stats: {
    totalBets: number;
    winRate: number;
    roi: number;
    netProfit: number;
    arbitrageCount: number;
    streakBest: number;
    streakCurrent: number;
    monthsActive: number;
  };
  badges: UserBadge[];
  following: string[];
  followers: string[];
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  progress?: {
    current: number;
    required: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
  rank: number;
  value: number;
  change: number; // Position change from previous period
  isVerified: boolean;
  badges: UserBadge[];
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  metric: 'roi' | 'profit' | 'winrate' | 'arbitrage_count' | 'streak' | 'volume';
  entries: LeaderboardEntry[];
  lastUpdated: string;
  nextUpdate: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
  type: 'bet_share' | 'tip' | 'discussion' | 'achievement' | 'arbitrage_alert';
  title?: string;
  content: string;
  attachments?: {
    betData?: TrackedBet;
    images?: string[];
    links?: string[];
  };
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  isVerified: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  content: string;
  likes: number;
  replies: CommunityComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'roi' | 'profit' | 'streak' | 'arbitrage' | 'volume';
  target: number;
  duration: number; // days
  startDate: string;
  endDate: string;
  participants: string[];
  winners: string[];
  prizes: {
    first: string;
    second: string;
    third: string;
    participation: string;
  };
  status: 'upcoming' | 'active' | 'completed';
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: {
    current: number;
    required: number;
  };
}

// Predefined achievements and badges
export const COMMUNITY_BADGES: Omit<UserBadge, 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_bet',
    name: 'First Steps',
    description: 'Placed your first bet',
    icon: '👶',
    rarity: 'common'
  },
  {
    id: 'first_arbitrage',
    name: 'Arbitrage Apprentice',
    description: 'Found your first arbitrage opportunity',
    icon: '🎯',
    rarity: 'common'
  },
  {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Won 5 bets in a row',
    icon: '🔥',
    rarity: 'uncommon'
  },
  {
    id: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Won 10 bets in a row',
    icon: '⚡',
    rarity: 'rare'
  },
  {
    id: 'profit_1000',
    name: 'Profit Pioneer',
    description: 'Earned $1,000 in total profit',
    icon: '💰',
    rarity: 'uncommon'
  },
  {
    id: 'profit_10000',
    name: 'Big Winner',
    description: 'Earned $10,000 in total profit',
    icon: '💎',
    rarity: 'rare'
  },
  {
    id: 'roi_master',
    name: 'ROI Master',
    description: 'Maintained 20%+ ROI over 100+ bets',
    icon: '📈',
    rarity: 'epic'
  },
  {
    id: 'arbitrage_expert',
    name: 'Arbitrage Expert',
    description: 'Successfully completed 50 arbitrage opportunities',
    icon: '🏆',
    rarity: 'epic'
  },
  {
    id: 'community_leader',
    name: 'Community Leader',
    description: 'Helped 100+ community members',
    icon: '👑',
    rarity: 'legendary'
  },
  {
    id: 'verified_user',
    name: 'Verified Expert',
    description: 'Verified by the community team',
    icon: '✅',
    rarity: 'epic'
  }
];

export class CommunityManager {
  private static instance: CommunityManager;
  private users: Map<string, CommunityUser> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private posts: Map<string, CommunityPost> = new Map();
  private comments: Map<string, CommunityComment[]> = new Map();
  private challenges: Map<string, CommunityChallenge> = new Map();
  private userAchievements: Map<string, UserAchievement[]> = new Map();

  static getInstance(): CommunityManager {
    if (!CommunityManager.instance) {
      CommunityManager.instance = new CommunityManager();
    }
    return CommunityManager.instance;
  }

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create demo community users
    const demoUsers: CommunityUser[] = [
      {
        id: 'demo-user',
        username: 'demo_bettor',
        displayName: 'Demo Bettor',
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        isVerified: true,
        subscriptionTier: 'premium',
        privacy: {
          showStats: true,
          showBets: true,
          allowMessages: true
        },
        stats: {
          totalBets: 45,
          winRate: 68.9,
          roi: 12.4,
          netProfit: 2340.50,
          arbitrageCount: 8,
          streakBest: 7,
          streakCurrent: 3,
          monthsActive: 1
        },
        badges: [
          { ...COMMUNITY_BADGES[0], unlockedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[1], unlockedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[2], unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        following: ['arbitrage_king', 'bet_master'],
        followers: ['newbie_bettor']
      },
      {
        id: 'arbitrage_king',
        username: 'arbitrage_king',
        displayName: 'The Arbitrage King',
        joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        isVerified: true,
        subscriptionTier: 'pro',
        privacy: {
          showStats: true,
          showBets: false,
          allowMessages: true
        },
        stats: {
          totalBets: 1250,
          winRate: 78.4,
          roi: 18.7,
          netProfit: 45230.75,
          arbitrageCount: 156,
          streakBest: 15,
          streakCurrent: 4,
          monthsActive: 6
        },
        badges: [
          { ...COMMUNITY_BADGES[7], unlockedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[6], unlockedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[9], unlockedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        following: ['bet_master'],
        followers: ['demo-user', 'profit_hunter', 'newbie_bettor']
      },
      {
        id: 'bet_master',
        username: 'bet_master',
        displayName: 'Bet Master Pro',
        joinedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        isVerified: true,
        subscriptionTier: 'enterprise',
        privacy: {
          showStats: true,
          showBets: true,
          allowMessages: false
        },
        stats: {
          totalBets: 2847,
          winRate: 72.1,
          roi: 15.2,
          netProfit: 67890.25,
          arbitrageCount: 89,
          streakBest: 12,
          streakCurrent: 1,
          monthsActive: 12
        },
        badges: [
          { ...COMMUNITY_BADGES[8], unlockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[5], unlockedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() },
          { ...COMMUNITY_BADGES[9], unlockedAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        following: [],
        followers: ['demo-user', 'arbitrage_king', 'profit_hunter']
      }
    ];

    demoUsers.forEach(user => this.users.set(user.id, user));

    // Create leaderboards
    this.createLeaderboards();

    // Create demo posts
    this.createDemoPosts();

    // Create demo challenges
    this.createDemoChallenges();
  }

  private createLeaderboards() {
    const users = Array.from(this.users.values());
    
    const leaderboards: Leaderboard[] = [
      {
        id: 'monthly_roi',
        name: 'Monthly ROI Leaders',
        description: 'Top performers by ROI this month',
        period: 'monthly',
        metric: 'roi',
        entries: users
          .filter(u => u.privacy.showStats)
          .map((user, index) => ({
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            subscriptionTier: user.subscriptionTier,
            rank: index + 1,
            value: user.stats.roi,
            change: Math.floor(Math.random() * 6) - 3,
            isVerified: user.isVerified,
            badges: user.badges.slice(0, 3)
          }))
          .sort((a, b) => b.value - a.value),
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'monthly_profit',
        name: 'Monthly Profit Leaders',
        description: 'Highest earners this month',
        period: 'monthly',
        metric: 'profit',
        entries: users
          .filter(u => u.privacy.showStats)
          .map((user, index) => ({
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            subscriptionTier: user.subscriptionTier,
            rank: index + 1,
            value: user.stats.netProfit,
            change: Math.floor(Math.random() * 6) - 3,
            isVerified: user.isVerified,
            badges: user.badges.slice(0, 3)
          }))
          .sort((a, b) => b.value - a.value),
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'arbitrage_masters',
        name: 'Arbitrage Masters',
        description: 'Most successful arbitrage opportunities',
        period: 'all_time',
        metric: 'arbitrage_count',
        entries: users
          .filter(u => u.privacy.showStats && u.stats.arbitrageCount > 0)
          .map((user, index) => ({
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            subscriptionTier: user.subscriptionTier,
            rank: index + 1,
            value: user.stats.arbitrageCount,
            change: Math.floor(Math.random() * 3),
            isVerified: user.isVerified,
            badges: user.badges.slice(0, 3)
          }))
          .sort((a, b) => b.value - a.value),
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    leaderboards.forEach(lb => {
      lb.entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      this.leaderboards.set(lb.id, lb);
    });
  }

  private createDemoPosts() {
    const posts: CommunityPost[] = [
      {
        id: 'post_1',
        userId: 'arbitrage_king',
        username: 'arbitrage_king',
        displayName: 'The Arbitrage King',
        subscriptionTier: 'pro',
        type: 'tip',
        title: '🎯 Pro Tip: Finding Arbitrage Opportunities',
        content: 'Always check for line movements 15-30 minutes before game time. That\'s when you\'ll find the best arbitrage opportunities as books adjust their odds differently. Made 4.2% profit today using this strategy!',
        tags: ['arbitrage', 'tips', 'strategy'],
        likes: 23,
        comments: 7,
        shares: 12,
        isVerified: true,
        isPinned: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'post_2',
        userId: 'demo-user',
        username: 'demo_bettor',
        displayName: 'Demo Bettor',
        subscriptionTier: 'premium',
        type: 'achievement',
        content: '🎉 Just hit my first 5-game win streak! The analytics feature really helped me identify better betting patterns. Thanks to this community for all the tips!',
        tags: ['achievement', 'winstreak'],
        likes: 15,
        comments: 4,
        shares: 3,
        isVerified: true,
        isPinned: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'post_3',
        userId: 'bet_master',
        username: 'bet_master',
        displayName: 'Bet Master Pro',
        subscriptionTier: 'enterprise',
        type: 'discussion',
        title: '📊 Market Analysis: NBA Playoffs Impact',
        content: 'Interesting trend I\'ve noticed: playoff games tend to have higher arbitrage opportunities due to emotional betting. The lines move more dramatically. Anyone else seeing this pattern?',
        tags: ['analysis', 'nba', 'playoffs', 'discussion'],
        likes: 31,
        comments: 12,
        shares: 8,
        isVerified: true,
        isPinned: true,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];

    posts.forEach(post => this.posts.set(post.id, post));

    // Create demo comments
    const comments: { [key: string]: CommunityComment[] } = {
      'post_1': [
        {
          id: 'comment_1',
          postId: 'post_1',
          userId: 'demo-user',
          username: 'demo_bettor',
          displayName: 'Demo Bettor',
          content: 'Great tip! I tried this yesterday and found a 3.8% opportunity. Thanks for sharing!',
          likes: 5,
          replies: [],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ],
      'post_3': [
        {
          id: 'comment_2',
          postId: 'post_3',
          userId: 'arbitrage_king',
          username: 'arbitrage_king',
          displayName: 'The Arbitrage King',
          content: 'Absolutely! I\'ve been tracking this for months. Playoff games have 40% more arbitrage opportunities on average.',
          likes: 8,
          replies: [],
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    Object.entries(comments).forEach(([postId, commentList]) => {
      this.comments.set(postId, commentList);
    });
  }

  private createDemoChallenges() {
    const challenges: CommunityChallenge[] = [
      {
        id: 'april_roi_challenge',
        name: 'April ROI Challenge',
        description: 'Achieve the highest ROI this month with minimum 20 bets',
        icon: '🏆',
        type: 'roi',
        target: 20, // 20% ROI
        duration: 30,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        participants: ['demo-user', 'arbitrage_king', 'bet_master'],
        winners: [],
        prizes: {
          first: '3 months Premium subscription',
          second: '1 month Premium subscription',
          third: 'Exclusive badge',
          participation: 'Community badge'
        },
        status: 'active'
      },
      {
        id: 'arbitrage_master_may',
        name: 'Arbitrage Master Challenge',
        description: 'Find and complete the most arbitrage opportunities in May',
        icon: '🎯',
        type: 'arbitrage',
        target: 10,
        duration: 31,
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toISOString(),
        participants: [],
        winners: [],
        prizes: {
          first: 'Pro subscription upgrade',
          second: '2 months Premium',
          third: '1 month Premium',
          participation: 'Arbitrage Explorer badge'
        },
        status: 'upcoming'
      }
    ];

    challenges.forEach(challenge => this.challenges.set(challenge.id, challenge));
  }

  // User Management
  async getCommunityUser(userId: string): Promise<CommunityUser | null> {
    return this.users.get(userId) || null;
  }

  async updateCommunityProfile(userId: string, updates: Partial<CommunityUser>): Promise<CommunityUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updated = { ...user, ...updates };
    this.users.set(userId, updated);
    return updated;
  }

  async followUser(followerId: string, followedId: string): Promise<void> {
    const follower = this.users.get(followerId);
    const followed = this.users.get(followedId);
    
    if (!follower || !followed) {
      throw new Error('User not found');
    }

    if (!follower.following.includes(followedId)) {
      follower.following.push(followedId);
    }
    
    if (!followed.followers.includes(followerId)) {
      followed.followers.push(followerId);
    }

    this.users.set(followerId, follower);
    this.users.set(followedId, followed);
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    const follower = this.users.get(followerId);
    const followed = this.users.get(followedId);
    
    if (!follower || !followed) {
      throw new Error('User not found');
    }

    follower.following = follower.following.filter(id => id !== followedId);
    followed.followers = followed.followers.filter(id => id !== followerId);

    this.users.set(followerId, follower);
    this.users.set(followedId, followed);
  }

  // Leaderboards
  async getLeaderboard(leaderboardId: string): Promise<Leaderboard | null> {
    return this.leaderboards.get(leaderboardId) || null;
  }

  async getAllLeaderboards(): Promise<Leaderboard[]> {
    return Array.from(this.leaderboards.values());
  }

  async getUserRank(userId: string, leaderboardId: string): Promise<number | null> {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const entry = leaderboard.entries.find(e => e.userId === userId);
    return entry?.rank || null;
  }

  // Posts and Comments
  async createPost(userId: string, postData: Omit<CommunityPost, 'id' | 'userId' | 'username' | 'displayName' | 'subscriptionTier' | 'likes' | 'comments' | 'shares' | 'isVerified' | 'isPinned' | 'createdAt' | 'updatedAt'>): Promise<CommunityPost> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const post: CommunityPost = {
      id: `post_${Date.now()}`,
      userId,
      username: user.username,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
      ...postData,
      likes: 0,
      comments: 0,
      shares: 0,
      isVerified: user.isVerified,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.posts.set(post.id, post);
    return post;
  }

  async getPosts(limit: number = 20, offset: number = 0): Promise<CommunityPost[]> {
    const allPosts = Array.from(this.posts.values())
      .sort((a, b) => {
        // Pinned posts first, then by creation date
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return allPosts.slice(offset, offset + limit);
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    post.likes += 1;
    post.updatedAt = new Date().toISOString();
    this.posts.set(postId, post);
  }

  async addComment(postId: string, userId: string, content: string): Promise<CommunityComment> {
    const user = this.users.get(userId);
    const post = this.posts.get(postId);
    
    if (!user || !post) {
      throw new Error('User or post not found');
    }

    const comment: CommunityComment = {
      id: `comment_${Date.now()}`,
      postId,
      userId,
      username: user.username,
      displayName: user.displayName,
      content,
      likes: 0,
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const comments = this.comments.get(postId) || [];
    comments.push(comment);
    this.comments.set(postId, comments);

    // Update post comment count
    post.comments += 1;
    this.posts.set(postId, post);

    return comment;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    return this.comments.get(postId) || [];
  }

  // Achievements and Badges
  async checkAndAwardAchievements(userId: string, bets: TrackedBet[]): Promise<UserBadge[]> {
    const user = this.users.get(userId);
    if (!user) return [];

    const newBadges: UserBadge[] = [];
    const currentBadgeIds = user.badges.map(b => b.id);

    // Check various achievement conditions
    const achievements = [
      {
        id: 'first_bet',
        condition: () => bets.length >= 1 && !currentBadgeIds.includes('first_bet')
      },
      {
        id: 'first_arbitrage',
        condition: () => bets.some(b => b.isArbitrage) && !currentBadgeIds.includes('first_arbitrage')
      },
      {
        id: 'win_streak_5',
        condition: () => this.getWinStreak(bets) >= 5 && !currentBadgeIds.includes('win_streak_5')
      },
      {
        id: 'win_streak_10',
        condition: () => this.getWinStreak(bets) >= 10 && !currentBadgeIds.includes('win_streak_10')
      },
      {
        id: 'profit_1000',
        condition: () => user.stats.netProfit >= 1000 && !currentBadgeIds.includes('profit_1000')
      },
      {
        id: 'profit_10000',
        condition: () => user.stats.netProfit >= 10000 && !currentBadgeIds.includes('profit_10000')
      }
    ];

    for (const achievement of achievements) {
      if (achievement.condition()) {
        const badgeTemplate = COMMUNITY_BADGES.find(b => b.id === achievement.id);
        if (badgeTemplate) {
          const newBadge: UserBadge = {
            ...badgeTemplate,
            unlockedAt: new Date().toISOString()
          };
          newBadges.push(newBadge);
          user.badges.push(newBadge);
        }
      }
    }

    if (newBadges.length > 0) {
      this.users.set(userId, user);
    }

    return newBadges;
  }

  private getWinStreak(bets: TrackedBet[]): number {
    const settledBets = bets
      .filter(b => b.status === 'won' || b.status === 'lost')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let streak = 0;
    for (const bet of settledBets) {
      if (bet.status === 'won') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Challenges
  async getChallenges(): Promise<CommunityChallenge[]> {
    return Array.from(this.challenges.values());
  }

  async joinChallenge(challengeId: string, userId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      this.challenges.set(challengeId, challenge);
    }
  }

  async leaveChallenge(challengeId: string, userId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    challenge.participants = challenge.participants.filter(id => id !== userId);
    this.challenges.set(challengeId, challenge);
  }

  // Statistics and Analytics
  async updateUserStats(userId: string, bets: TrackedBet[]): Promise<CommunityUser> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const metrics = AdvancedAnalytics.calculatePerformanceMetrics(bets);
    
    user.stats = {
      totalBets: metrics.totalBets,
      winRate: metrics.winRate,
      roi: metrics.roi,
      netProfit: metrics.netProfit,
      arbitrageCount: bets.filter(b => b.isArbitrage && b.status === 'won').length,
      streakBest: metrics.longestWinStreak,
      streakCurrent: metrics.currentStreak,
      monthsActive: Math.max(1, Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)))
    };

    this.users.set(userId, user);
    
    // Update leaderboards
    this.updateLeaderboards();
    
    return user;
  }

  private updateLeaderboards(): void {
    // Recalculate leaderboard rankings
    const users = Array.from(this.users.values()).filter(u => u.privacy.showStats);
    
    this.leaderboards.forEach((leaderboard, id) => {
      const entries = users.map(user => {
        let value = 0;
        switch (leaderboard.metric) {
          case 'roi':
            value = user.stats.roi;
            break;
          case 'profit':
            value = user.stats.netProfit;
            break;
          case 'winrate':
            value = user.stats.winRate;
            break;
          case 'arbitrage_count':
            value = user.stats.arbitrageCount;
            break;
          case 'streak':
            value = user.stats.streakBest;
            break;
          case 'volume':
            value = user.stats.totalBets;
            break;
        }

        return {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          subscriptionTier: user.subscriptionTier,
          rank: 0, // Will be set after sorting
          value,
          change: Math.floor(Math.random() * 6) - 3,
          isVerified: user.isVerified,
          badges: user.badges.slice(0, 3)
        };
      }).sort((a, b) => b.value - a.value);

      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      leaderboard.entries = entries;
      leaderboard.lastUpdated = new Date().toISOString();
      this.leaderboards.set(id, leaderboard);
    });
  }
}

// Export singleton instance
export const communityManager = CommunityManager.getInstance();

// Utility functions
export function getRarityColor(rarity: UserBadge['rarity']): string {
  const colors = {
    common: 'text-gray-600',
    uncommon: 'text-green-600',
    rare: 'text-blue-600',
    epic: 'text-purple-600',
    legendary: 'text-yellow-600'
  };
  return colors[rarity];
}

export function formatRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function getSubscriptionTierColor(tier: CommunityUser['subscriptionTier']): string {
  const colors = {
    free: 'text-gray-600',
    premium: 'text-blue-600',
    pro: 'text-purple-600',
    enterprise: 'text-yellow-600'
  };
  return colors[tier];
}