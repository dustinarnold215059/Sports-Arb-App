import { betTracker } from './betTracking';


// Simple in-memory database for users (in production, use a real database)
export interface UserStats {
  totalBets: number;
  totalProfit: number;
  successRate: number;
  avgProfitPerBet: number;
  lastActivity: Date;
  arbitrageOpportunitiesFound: number;
  totalStakeAmount: number;
  bestArbitrageProfit: number;
  scansPerformed: number;
  apiRequestsUsed: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In production, this should be hashed
  role: 'admin' | 'premium' | 'basic' | 'pro';
  subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro';
  subscriptionExpiry: Date;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  stats: UserStats;
}

// In-memory user database (replace with real database in production)
const users: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@test.com',
    password: 'admin123', // In production: hash this
    role: 'admin',
    subscriptionStatus: 'premium',
    subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    isActive: true,
    stats: {} as UserStats // Will be calculated dynamically from betTracker
  },
  {
    id: '2',
    username: 'john_trader',
    email: 'john@email.com',
    password: 'user123', // In production: hash this
    role: 'premium',
    subscriptionStatus: 'premium',
    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date('2024-11-15'),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isActive: true,
    stats: {} as UserStats // Will be calculated dynamically from betTracker
  },
  {
    id: '3',
    username: 'sarah_sports',
    email: 'sarah@email.com',  
    password: 'user123', // In production: hash this
    role: 'basic',
    subscriptionStatus: 'basic',
    subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date('2025-01-20'),
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isActive: true,
    stats: {} as UserStats // Will be calculated dynamically from betTracker
  },
  {
    id: '4',
    username: 'mike_pro',
    email: 'mike@email.com',
    password: 'user123', // In production: hash this
    role: 'pro',
    subscriptionStatus: 'pro',
    subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    createdAt: new Date('2024-12-01'),
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    isActive: true,
    stats: {} as UserStats // Will be calculated dynamically from betTracker
  }
];

// Function to calculate real user stats from their actual portfolio data
function calculateRealUserStats(userId: string): UserStats {
  try {
    // Store current user to restore later
    const currentUser = betTracker.currentUserId;
    
    // Set current user exactly like portfolio page does
    betTracker.setCurrentUser(userId);
    
    // Get portfolio stats exactly like portfolio page does
    const portfolioStats = betTracker.getPortfolioStats();
    const userBets = betTracker.getAllBets();
    const userGroups = betTracker.getArbitrageGroups();
    
    // Debug: Log what we found for this user
    console.log(`User ${userId} portfolio stats:`, {
      totalBets: portfolioStats.totalBets,
      netProfit: portfolioStats.netProfit,
      winRate: portfolioStats.winRate,
      betsCount: userBets.length,
      groupsCount: userGroups.length
    });
    
    // Restore original user
    betTracker.setCurrentUser(currentUser);
    
    // Calculate additional stats from the user's actual betting data
    const lastBet = userBets.length > 0 ? userBets[0] : null; // getAllBets returns sorted by newest first
    const bestProfit = userBets.length > 0 ? 
      Math.max(...userBets.filter(bet => bet.profit !== undefined && bet.profit > 0).map(bet => bet.profit || 0), 0) : 0;
    
    const lastActivity = lastBet ? new Date(lastBet.timestamp) : 
      (userGroups.length > 0 ? new Date(userGroups[0].timestamp) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    return {
      totalBets: portfolioStats.totalBets,
      totalProfit: portfolioStats.netProfit,
      successRate: portfolioStats.winRate,
      avgProfitPerBet: portfolioStats.totalBets > 0 ? portfolioStats.netProfit / portfolioStats.totalBets : 0,
      lastActivity: lastActivity,
      arbitrageOpportunitiesFound: userGroups.length,
      totalStakeAmount: portfolioStats.totalStaked,
      bestArbitrageProfit: bestProfit,
      scansPerformed: Math.floor(userBets.length * 3 + userGroups.length * 5),
      apiRequestsUsed: Math.floor(userBets.length * 12 + userGroups.length * 25)
    };
  } catch (error) {
    console.warn(`Error calculating stats for user ${userId}:`, error);
    // Return default stats if there's an error
    return {
      totalBets: 0,
      totalProfit: 0,
      successRate: 0,
      avgProfitPerBet: 0,
      lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      arbitrageOpportunitiesFound: 0,
      totalStakeAmount: 0,
      bestArbitrageProfit: 0,
      scansPerformed: 0,
      apiRequestsUsed: 0
    };
  }
}

// Add sample data for testing (call this once to populate data)
function addSampleBettingData() {
  // Sample data for john_trader (user id: '2')
  const johnBets = [
    {
      game: "Lakers vs Warriors",
      sport: "basketball",
      team1: "Lakers",
      team2: "Warriors",
      betType: "arbitrage" as const,
      bookmaker: "DraftKings",
      selection: "Lakers +5.5",
      odds: -110,
      stake: 100,
      potentialPayout: 190.91,
      status: "won" as const,
      actualPayout: 190.91,
      isArbitrage: true,
      hasDrawRisk: false,
      riskLevel: "low" as const
    },
    {
      game: "Celtics vs Heat",
      sport: "basketball", 
      team1: "Celtics",
      team2: "Heat",
      betType: "normal" as const,
      bookmaker: "FanDuel",
      selection: "Over 210.5",
      odds: -105,
      stake: 50,
      potentialPayout: 97.62,
      status: "lost" as const,
      actualPayout: 0,
      isArbitrage: false,
      hasDrawRisk: false,
      riskLevel: "low" as const
    },
    {
      game: "Chiefs vs Bills",
      sport: "football",
      team1: "Chiefs", 
      team2: "Bills",
      betType: "arbitrage" as const,
      bookmaker: "BetMGM",
      selection: "Chiefs -3",
      odds: +110,
      stake: 75,
      potentialPayout: 157.5,
      status: "won" as const,
      actualPayout: 157.5,
      isArbitrage: true,
      hasDrawRisk: false,
      riskLevel: "low" as const
    }
  ];

  // Sample data for sarah_sports (user id: '3')
  const sarahBets = [
    {
      game: "Yankees vs Red Sox",
      sport: "baseball",
      team1: "Yankees",
      team2: "Red Sox", 
      betType: "plus_ev" as const,
      bookmaker: "Caesars",
      selection: "Yankees ML",
      odds: +150,
      stake: 25,
      potentialPayout: 62.5,
      status: "won" as const,
      actualPayout: 62.5,
      isArbitrage: false,
      hasDrawRisk: false,
      riskLevel: "medium" as const
    },
    {
      game: "Dodgers vs Padres",
      sport: "baseball",
      team1: "Dodgers",
      team2: "Padres",
      betType: "normal" as const,
      bookmaker: "PointsBet",
      selection: "Under 8.5",
      odds: -115,
      stake: 30,
      potentialPayout: 56.09,
      status: "pending" as const,
      isArbitrage: false,
      hasDrawRisk: false,
      riskLevel: "low" as const
    }
  ];

  // Add bets for john_trader
  betTracker.setCurrentUser('2');
  johnBets.forEach(bet => {
    betTracker.addBet(bet);
  });

  // Add bets for sarah_sports  
  betTracker.setCurrentUser('3');
  sarahBets.forEach(bet => {
    betTracker.addBet(bet);
  });

  // Reset to no user
  betTracker.setCurrentUser(null);
  
  console.log('Sample betting data added successfully!');
}

// Export the function so it can be called from API
export { addSampleBettingData };

// Database operations
export const userDatabase = {
  // Get all users
  getAllUsers(): User[] {
    // Debug: Check what data exists overall
    const currentUser = betTracker.currentUserId;
    betTracker.setCurrentUser(null);
    const allBets = betTracker.getAllBets();
    const allGroups = betTracker.getArbitrageGroups();
    betTracker.setCurrentUser(currentUser);
    
    console.log('Total data in betTracker:', {
      totalBets: allBets.length,
      totalGroups: allGroups.length,
      betUserIds: [...new Set(allBets.map(bet => bet.userId))],
      groupUserIds: [...new Set(allGroups.map(group => group.userId))]
    });
    
    return users.map(user => ({
      ...user,
      password: '[PROTECTED]', // Don't expose passwords
      stats: calculateRealUserStats(user.id) // Use real stats from betTracker
    }));
  },

  // Get user by ID
  getUserById(id: string): User | null {
    const user = users.find(u => u.id === id);
    return user ? { 
      ...user, 
      stats: calculateRealUserStats(user.id) 
    } : null;
  },

  // Get user by username
  getUserByUsername(username: string): User | null {
    const user = users.find(u => u.username === username);
    return user ? { 
      ...user, 
      stats: calculateRealUserStats(user.id) 
    } : null;
  },

  // Authenticate user
  authenticateUser(username: string, password: string): User | null {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      return { 
        ...user, 
        password: '[PROTECTED]',
        stats: calculateRealUserStats(user.id)
      };
    }
    return null;
  },

  // Update user stats
  updateUserStats(userId: string, stats: Partial<UserStats>): boolean {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].stats = { ...users[userIndex].stats, ...stats };
      users[userIndex].stats.lastActivity = new Date();
      return true;
    }
    return false;
  },

  // Update user subscription
  updateUserSubscription(userId: string, subscriptionStatus: 'premium' | 'basic' | 'trial', expiryDays: number): boolean {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].subscriptionStatus = subscriptionStatus;
      users[userIndex].subscriptionExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      return true;
    }
    return false;
  },

  // Update user role and subscription
  updateUserRole(userId: string, role: 'admin' | 'premium' | 'basic' | 'pro', subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro', expiryDays: number): boolean {
    console.log('Looking for user with ID:', userId);
    console.log('Available users:', users.map(u => ({ id: u.id, username: u.username, role: u.role })));
    
    const userIndex = users.findIndex(u => u.id === userId);
    console.log('Found user index:', userIndex);
    
    if (userIndex !== -1) {
      users[userIndex].role = role;
      users[userIndex].subscriptionStatus = subscriptionStatus;
      users[userIndex].subscriptionExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      
      // Update localStorage if running in browser
      if (typeof window !== 'undefined') {
        try {
          const updatedUser = users[userIndex];
          localStorage.setItem('sports_betting_auth', JSON.stringify(updatedUser));
          console.log('Updated user in localStorage:', updatedUser.role, updatedUser.subscriptionStatus);
        } catch (error) {
          console.error('Failed to update localStorage:', error);
        }
      }
      
      return true;
    }
    return false;
  },

  // Deactivate user
  toggleUserStatus(userId: string): boolean {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].isActive = !users[userIndex].isActive;
      return true;
    }
    return false;
  },

  // Get platform statistics using real data from all users
  getPlatformStats() {
    const activeUsers = users.filter(u => u.isActive).length;
    const totalUsers = users.length;
    const premiumUsers = users.filter(u => u.subscriptionStatus === 'premium').length;
    const basicUsers = users.filter(u => u.role === 'basic').length;
    const proUsers = users.filter(u => u.role === 'pro').length;
    
    // Use the same approach as homepage to get global platform stats
    const currentUser = betTracker.currentUserId;
    
    // Get global data for platform stats (same as homepage)
    betTracker.setCurrentUser(null);
    const globalStats = betTracker.getGlobalPlatformStats();
    
    // Restore original user
    betTracker.setCurrentUser(currentUser);

    return {
      activeUsers,
      totalUsers,
      premiumUsers,
      basicUsers,
      proUsers,
      totalProfit: globalStats.netProfit,
      totalBets: globalStats.totalBets,
      totalApiRequests: globalStats.totalBets * 15, // Estimate based on bets
      avgSuccessRate: globalStats.winRate
    };
  },

  // Get all users with real portfolio data from client
  getAllUsersWithPortfolioData(portfolioData: { [userId: string]: any }): User[] {
    return users.map(user => ({
      ...user,
      password: '[PROTECTED]', // Don't expose passwords
      stats: this.calculateStatsFromPortfolioData(user.id, portfolioData[user.id])
    }));
  },

  // Get platform stats using real portfolio data from client
  getPlatformStatsWithData(portfolioData: { [userId: string]: any }) {
    const activeUsers = users.filter(u => u.isActive).length;
    const totalUsers = users.length;
    const premiumUsers = users.filter(u => u.subscriptionStatus === 'premium').length;
    const basicUsers = users.filter(u => u.role === 'basic').length;
    const proUsers = users.filter(u => u.role === 'pro').length;
    
    // Calculate combined stats from all users' portfolio data
    let totalProfit = 0;
    let totalBets = 0;
    let totalApiRequests = 0;
    let totalWinRate = 0;
    let usersWithData = 0;

    Object.values(portfolioData).forEach((data: any) => {
      if (data && data.portfolioStats) {
        totalProfit += data.portfolioStats.netProfit || 0;
        totalBets += data.portfolioStats.totalBets || 0;
        totalApiRequests += (data.portfolioStats.totalBets || 0) * 15;
        totalWinRate += data.portfolioStats.winRate || 0;
        usersWithData++;
      }
    });

    return {
      activeUsers,
      totalUsers,
      premiumUsers,
      basicUsers,
      proUsers,
      totalProfit,
      totalBets,
      totalApiRequests,
      avgSuccessRate: usersWithData > 0 ? totalWinRate / usersWithData : 0
    };
  },

  // Calculate user stats from portfolio data
  calculateStatsFromPortfolioData(userId: string, portfolioData: any): UserStats {
    if (!portfolioData || !portfolioData.portfolioStats) {
      return {
        totalBets: 0,
        totalProfit: 0,
        successRate: 0,
        avgProfitPerBet: 0,
        lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        arbitrageOpportunitiesFound: 0,
        totalStakeAmount: 0,
        bestArbitrageProfit: 0,
        scansPerformed: 0,
        apiRequestsUsed: 0
      };
    }

    const stats = portfolioData.portfolioStats;
    const userBetsCount = portfolioData.userBets || 0;
    const userGroupsCount = portfolioData.userGroups || 0;

    return {
      totalBets: stats.totalBets || 0,
      totalProfit: stats.netProfit || 0,
      successRate: stats.winRate || 0,
      avgProfitPerBet: stats.totalBets > 0 ? (stats.netProfit || 0) / stats.totalBets : 0,
      lastActivity: stats.lastBetDate ? new Date(stats.lastBetDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      arbitrageOpportunitiesFound: userGroupsCount,
      totalStakeAmount: stats.totalStaked || 0,
      bestArbitrageProfit: stats.averageArbitrageProfit || 0,
      scansPerformed: Math.floor(userBetsCount * 3 + userGroupsCount * 5),
      apiRequestsUsed: Math.floor(userBetsCount * 12 + userGroupsCount * 25)
    };
  }
};