// Bet tracking and portfolio management system

export type BetStatus = 'pending' | 'won' | 'lost' | 'pushed' | 'cancelled';
export type BetType = 'normal' | 'plus_ev' | 'arbitrage' | 'middle';

export interface TrackedBet {
  id: string;
  userId: string; // Add user ID to separate portfolios
  timestamp: Date;
  
  // Game Information
  game: string;
  sport: string;
  league?: string; // New field for league/competition
  team1: string;
  team2: string;
  betType: BetType;
  
  // Bet Details
  bookmaker: string;
  profile?: string; // New field for account/profile
  selection: string; // What was bet on (team name, over/under, etc.)
  odds: number; // American odds
  stake: number;
  potentialPayout: number;
  isBonusBet?: boolean; // New field for bonus bet indicator
  
  // Status & Results
  status: BetStatus;
  actualPayout?: number;
  profit?: number; // Calculated: actualPayout - stake
  
  // Arbitrage Context
  isArbitrage: boolean;
  arbitrageId?: string; // Links bets that form an arbitrage opportunity
  arbitragePartner?: string; // The other bookmaker in the arbitrage
  expectedArbitrageProfit?: number;
  
  // Risk Information
  hasDrawRisk?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  
  // Metadata
  notes?: string;
  settledAt?: Date;
  gameStartTime?: Date;
}

export interface ArbitrageGroup {
  id: string;
  userId: string; // Add user ID to separate portfolios
  timestamp: Date;
  game: string;
  betType: BetType;
  totalStake: number;
  expectedProfit: number;
  actualProfit?: number;
  status: 'pending' | 'completed' | 'partial' | 'failed';
  bets: TrackedBet[];
  profitMargin: number;
  
  // Risk Assessment
  hasDrawRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  
  // Completion tracking
  completedBets: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
}

export interface BettingPortfolio {
  // Summary Stats
  totalStaked: number;
  totalReturned: number;
  netProfit: number;
  
  // Bet Counts
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  pushedBets: number;
  
  // Win Rates
  winRate: number; // Percentage of resolved bets that won
  profitRate: number; // Percentage of total stakes that are profit
  
  // Arbitrage Stats
  arbitrageGroups: number;
  successfulArbitrages: number;
  failedArbitrages: number;
  arbitrageSuccessRate: number;
  averageArbitrageProfit: number;
  
  // Risk Analysis
  drawRiskBets: number;
  highRiskBets: number;
  
  // Time-based Analysis
  lastBetDate?: Date;
  firstBetDate?: Date;
  activeDays: number;
  averageBetsPerDay: number;
  
  // Bookmaker Distribution
  bookmakerStats: Record<string, {
    bets: number;
    staked: number;
    returned: number;
    profit: number;
    winRate: number;
  }>;
  
  // Bet Type Distribution
  betTypeStats: Record<BetType, {
    bets: number;
    staked: number;
    returned: number;
    profit: number;
    winRate: number;
  }>;
  
  // Sport Distribution
  sportStats: Record<string, {
    bets: number;
    staked: number;
    returned: number;
    profit: number;
    winRate: number;
  }>;
}

// Utility functions for bet tracking
export class BetTracker {
  private bets: TrackedBet[] = [];
  private arbitrageGroups: ArbitrageGroup[] = [];
  private _currentUserId: string | null = null;
  
  constructor() {
    this.loadFromStorage();
  }

  // Set the current user for filtering data
  setCurrentUser(userId: string | null): void {
    this._currentUserId = userId;
    this.loadFromStorage(); // Reload data when user changes
  }

  // Get current user ID
  get currentUserId(): string | null {
    return this._currentUserId;
  }
  
  // Generate unique ID for tracking
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  
  // Add a single bet
  addBet(bet: Omit<TrackedBet, 'id' | 'timestamp' | 'profit' | 'userId'>): TrackedBet {
    if (!this._currentUserId) {
      throw new Error('No user set. Please login to record bets.');
    }

    const newBet: TrackedBet = {
      ...bet,
      id: this.generateId(),
      userId: this._currentUserId,
      timestamp: new Date(),
      profit: bet.status === 'won' ? (bet.actualPayout || bet.potentialPayout) - (bet.isBonusBet ? 0 : bet.stake) : 
             bet.status === 'lost' ? (bet.isBonusBet ? 0 : -bet.stake) :
             bet.status === 'pushed' ? 0 : undefined
    };
    
    this.bets.push(newBet);
    this.saveToStorage();
    return newBet;
  }
  
  // Add an arbitrage group (multiple related bets)
  addArbitrageGroup(
    opportunity: any, // ArbitrageOpportunity
    actualBets: Array<Omit<TrackedBet, 'id' | 'timestamp' | 'profit' | 'arbitrageId' | 'userId'>>
  ): ArbitrageGroup {
    if (!this._currentUserId) {
      throw new Error('No user set. Please login to record arbitrage groups.');
    }

    const arbitrageId = this.generateId();
    
    // Add individual bets with arbitrage linking
    const trackedBets = actualBets.map(bet => this.addBet({
      ...bet,
      isArbitrage: true,
      arbitrageId,
      expectedArbitrageProfit: opportunity.guaranteedProfit
    }));
    
    // Create arbitrage group
    const group: ArbitrageGroup = {
      id: arbitrageId,
      userId: this._currentUserId,
      timestamp: new Date(),
      game: opportunity.game,
      betType: opportunity.betType || 'moneyline',
      totalStake: opportunity.totalStake,
      expectedProfit: opportunity.guaranteedProfit,
      status: 'pending',
      bets: trackedBets,
      profitMargin: opportunity.profitMargin,
      hasDrawRisk: opportunity.hasDrawRisk || false,
      riskLevel: opportunity.hasDrawRisk ? 'high' : 'low',
      completedBets: 0,
      pendingBets: trackedBets.length,
      wonBets: 0,
      lostBets: 0
    };
    
    this.arbitrageGroups.push(group);
    this.saveToStorage();
    return group;
  }
  
  // Update bet status
  updateBetStatus(betId: string, status: BetStatus, actualPayout?: number): boolean {
    const bet = this.bets.find(b => b.id === betId);
    if (!bet) return false;
    
    bet.status = status;
    bet.settledAt = new Date();
    
    if (actualPayout !== undefined) {
      bet.actualPayout = actualPayout;
    }
    
    // Calculate profit - handle bonus bets differently
    if (status === 'won') {
      bet.profit = (bet.actualPayout || bet.potentialPayout) - (bet.isBonusBet ? 0 : bet.stake);
    } else if (status === 'lost') {
      bet.profit = bet.isBonusBet ? 0 : -bet.stake;
    } else if (status === 'pushed') {
      bet.profit = 0;
    }
    
    // Update arbitrage group if applicable
    if (bet.arbitrageId) {
      this.updateArbitrageGroupStatus(bet.arbitrageId);
    }
    
    this.saveToStorage();
    return true;
  }
  
  // Update arbitrage group status based on individual bet results
  private updateArbitrageGroupStatus(arbitrageId: string): void {
    const group = this.arbitrageGroups.find(g => g.id === arbitrageId);
    if (!group) return;
    
    const groupBets = this.bets.filter(b => b.arbitrageId === arbitrageId);
    
    group.completedBets = groupBets.filter(b => ['won', 'lost', 'pushed'].includes(b.status)).length;
    group.pendingBets = groupBets.filter(b => b.status === 'pending').length;
    group.wonBets = groupBets.filter(b => b.status === 'won').length;
    group.lostBets = groupBets.filter(b => b.status === 'lost').length;
    
    // Calculate actual profit
    const settledBets = groupBets.filter(b => b.profit !== undefined);
    if (settledBets.length === groupBets.length) {
      group.actualProfit = settledBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
      group.status = group.actualProfit > 0 ? 'completed' : 'failed';
    } else if (settledBets.length > 0) {
      group.status = 'partial';
      group.actualProfit = settledBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    }
    
    group.bets = groupBets;
  }
  
  // Get all bets for current user
  getAllBets(): TrackedBet[] {
    const userBets = this._currentUserId 
      ? this.bets.filter(bet => bet.userId === this._currentUserId)
      : [];
    return [...userBets].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  // Get arbitrage groups for current user
  getArbitrageGroups(): ArbitrageGroup[] {
    const userGroups = this._currentUserId 
      ? this.arbitrageGroups.filter(group => group.userId === this._currentUserId)
      : [];
    return [...userGroups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  // Get global platform statistics (all users)
  getGlobalPlatformStats(): BettingPortfolio {
    const allBets = [...this.bets]; // All bets regardless of user
    const allGroups = [...this.arbitrageGroups]; // All groups regardless of user
    const settledBets = allBets.filter(b => b.profit !== undefined);

    // Use same calculation logic as getPortfolioStats but with all data
    return this.calculatePortfolioStats(allBets, allGroups);
  }

  // Calculate portfolio statistics for current user
  getPortfolioStats(): BettingPortfolio {
    const bets = this.getAllBets(); // Use user-filtered bets
    const userArbitrageGroups = this.getArbitrageGroups(); // Use user-filtered groups
    return this.calculatePortfolioStats(bets, userArbitrageGroups);
  }

  // Shared calculation logic
  private calculatePortfolioStats(bets: TrackedBet[], arbitrageGroups: ArbitrageGroup[]): BettingPortfolio {
    const settledBets = bets.filter(b => b.profit !== undefined);
    
    // Basic stats
    const totalStaked = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const totalReturned = settledBets.reduce((sum, bet) => sum + (bet.actualPayout || 0), 0);
    const netProfit = settledBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    
    // Bet counts
    const wonBets = bets.filter(b => b.status === 'won').length;
    const lostBets = bets.filter(b => b.status === 'lost').length;
    const pendingBets = bets.filter(b => b.status === 'pending').length;
    const pushedBets = bets.filter(b => b.status === 'pushed').length;
    
    // Rates
    const resolvedBets = wonBets + lostBets + pushedBets;
    const winRate = resolvedBets > 0 ? (wonBets / resolvedBets) * 100 : 0;
    const profitRate = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
    
    // Arbitrage stats
    const completedArbitrages = arbitrageGroups.filter(g => g.status === 'completed').length;
    const failedArbitrages = arbitrageGroups.filter(g => g.status === 'failed').length;
    const arbitrageSuccessRate = arbitrageGroups.length > 0 ? 
      (completedArbitrages / arbitrageGroups.length) * 100 : 0;
    const averageArbitrageProfit = arbitrageGroups.length > 0 ?
      arbitrageGroups.reduce((sum, g) => sum + (g.actualProfit || g.expectedProfit), 0) / arbitrageGroups.length : 0;
    
    // Risk analysis
    const drawRiskBets = bets.filter(b => b.hasDrawRisk).length;
    const highRiskBets = bets.filter(b => b.riskLevel === 'high').length;
    
    // Time analysis
    const betDates = bets.map(b => b.timestamp.toDateString());
    const uniqueDates = new Set(betDates);
    const activeDays = uniqueDates.size;
    const averageBetsPerDay = activeDays > 0 ? bets.length / activeDays : 0;
    
    // Bookmaker stats
    const bookmakerStats: Record<string, any> = {};
    bets.forEach(bet => {
      if (!bookmakerStats[bet.bookmaker]) {
        bookmakerStats[bet.bookmaker] = {
          bets: 0,
          staked: 0,
          returned: 0,
          profit: 0,
          won: 0,
          resolved: 0
        };
      }
      const stats = bookmakerStats[bet.bookmaker];
      stats.bets++;
      stats.staked += bet.stake;
      if (bet.actualPayout) stats.returned += bet.actualPayout;
      if (bet.profit !== undefined) {
        stats.profit += bet.profit;
        stats.resolved++;
        if (bet.status === 'won') stats.won++;
      }
    });
    
    // Calculate win rates for bookmakers
    Object.keys(bookmakerStats).forEach(bookmaker => {
      const stats = bookmakerStats[bookmaker];
      stats.winRate = stats.resolved > 0 ? (stats.won / stats.resolved) * 100 : 0;
    });
    
    // Bet type stats
    const betTypeStats: Record<BetType, any> = {
      normal: { bets: 0, staked: 0, returned: 0, profit: 0, won: 0, resolved: 0, winRate: 0 },
      plus_ev: { bets: 0, staked: 0, returned: 0, profit: 0, won: 0, resolved: 0, winRate: 0 },
      arbitrage: { bets: 0, staked: 0, returned: 0, profit: 0, won: 0, resolved: 0, winRate: 0 },
      middle: { bets: 0, staked: 0, returned: 0, profit: 0, won: 0, resolved: 0, winRate: 0 }
    };
    
    bets.forEach(bet => {
      const stats = betTypeStats[bet.betType];
      // Skip if bet type doesn't exist (for backward compatibility with old data)
      if (!stats) return;
      
      stats.bets++;
      stats.staked += bet.stake;
      if (bet.actualPayout) stats.returned += bet.actualPayout;
      if (bet.profit !== undefined) {
        stats.profit += bet.profit;
        stats.resolved++;
        if (bet.status === 'won') stats.won++;
      }
    });
    
    // Calculate win rates for bet types
    Object.keys(betTypeStats).forEach(betType => {
      const stats = betTypeStats[betType as BetType];
      stats.winRate = stats.resolved > 0 ? (stats.won / stats.resolved) * 100 : 0;
    });
    
    // Sport stats
    const sportStats: Record<string, any> = {};
    bets.forEach(bet => {
      if (!sportStats[bet.sport]) {
        sportStats[bet.sport] = {
          bets: 0,
          staked: 0,
          returned: 0,
          profit: 0,
          won: 0,
          resolved: 0
        };
      }
      const stats = sportStats[bet.sport];
      stats.bets++;
      stats.staked += bet.stake;
      if (bet.actualPayout) stats.returned += bet.actualPayout;
      if (bet.profit !== undefined) {
        stats.profit += bet.profit;
        stats.resolved++;
        if (bet.status === 'won') stats.won++;
      }
    });
    
    // Calculate win rates for sports
    Object.keys(sportStats).forEach(sport => {
      const stats = sportStats[sport];
      stats.winRate = stats.resolved > 0 ? (stats.won / stats.resolved) * 100 : 0;
    });
    
    return {
      totalStaked,
      totalReturned,
      netProfit,
      totalBets: bets.length,
      wonBets,
      lostBets,
      pendingBets,
      pushedBets,
      winRate,
      profitRate,
      arbitrageGroups: arbitrageGroups.length,
      successfulArbitrages: completedArbitrages,
      failedArbitrages,
      arbitrageSuccessRate,
      averageArbitrageProfit,
      drawRiskBets,
      highRiskBets,
      lastBetDate: bets.length > 0 ? bets[0].timestamp : undefined,
      firstBetDate: bets.length > 0 ? bets[bets.length - 1].timestamp : undefined,
      activeDays,
      averageBetsPerDay,
      bookmakerStats,
      betTypeStats,
      sportStats
    };
  }
  
  // Local storage functions
  private saveToStorage(): void {
    try {
      localStorage.setItem('arbitrageBets', JSON.stringify(this.bets));
      localStorage.setItem('arbitrageGroups', JSON.stringify(this.arbitrageGroups));
    } catch (error) {
      console.warn('Failed to save bet data to localStorage:', error);
    }
  }
  
  // Migration function to convert old bet types to new ones
  private migrateBetType(oldBetType: string): BetType {
    switch (oldBetType) {
      case 'moneyline':
      case 'spread':
      case 'total':
      case 'outright':
      case 'prop':
        return 'normal';
      default:
        return oldBetType as BetType;
    }
  }

  private loadFromStorage(): void {
    try {
      const betsData = localStorage.getItem('arbitrageBets');
      const groupsData = localStorage.getItem('arbitrageGroups');
      
      if (betsData) {
        this.bets = JSON.parse(betsData).map((bet: any) => ({
          ...bet,
          betType: this.migrateBetType(bet.betType), // Migrate old bet types
          timestamp: new Date(bet.timestamp),
          settledAt: bet.settledAt ? new Date(bet.settledAt) : undefined,
          gameStartTime: bet.gameStartTime ? new Date(bet.gameStartTime) : undefined
        }));
      }
      
      if (groupsData) {
        this.arbitrageGroups = JSON.parse(groupsData).map((group: any) => ({
          ...group,
          timestamp: new Date(group.timestamp),
          bets: group.bets.map((bet: any) => ({
            ...bet,
            betType: this.migrateBetType(bet.betType), // Migrate old bet types
            timestamp: new Date(bet.timestamp),
            settledAt: bet.settledAt ? new Date(bet.settledAt) : undefined,
            gameStartTime: bet.gameStartTime ? new Date(bet.gameStartTime) : undefined
          }))
        }));
      }
    } catch (error) {
      console.warn('Failed to load bet data from localStorage:', error);
      this.bets = [];
      this.arbitrageGroups = [];
    }
  }
  
  // Export data for backup
  exportData(): string {
    return JSON.stringify({
      bets: this.bets,
      arbitrageGroups: this.arbitrageGroups,
      exportDate: new Date(),
      version: '1.0'
    }, null, 2);
  }
  
  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.bets && data.arbitrageGroups) {
        this.bets = data.bets.map((bet: any) => ({
          ...bet,
          betType: this.migrateBetType(bet.betType), // Migrate old bet types
          timestamp: new Date(bet.timestamp),
          settledAt: bet.settledAt ? new Date(bet.settledAt) : undefined,
          gameStartTime: bet.gameStartTime ? new Date(bet.gameStartTime) : undefined
        }));
        
        this.arbitrageGroups = data.arbitrageGroups.map((group: any) => ({
          ...group,
          timestamp: new Date(group.timestamp),
          bets: group.bets.map((bet: any) => ({
            ...bet,
            betType: this.migrateBetType(bet.betType), // Migrate old bet types
            timestamp: new Date(bet.timestamp),
            settledAt: bet.settledAt ? new Date(bet.settledAt) : undefined,
            gameStartTime: bet.gameStartTime ? new Date(bet.gameStartTime) : undefined
          }))
        }));
        
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import bet data:', error);
      return false;
    }
  }
  
  // Clear all data
  clearAllData(): void {
    this.bets = [];
    this.arbitrageGroups = [];
    localStorage.removeItem('arbitrageBets');
    localStorage.removeItem('arbitrageGroups');
  }
}

// Singleton instance
export const betTracker = new BetTracker();

// Helper function to load bets from storage (for components)
export function loadBetsFromStorage(): TrackedBet[] {
  return betTracker.getAllBets();
}

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getBetTypeIcon(betType: BetType): string {
  switch (betType) {
    case 'normal': return '📋';
    case 'plus_ev': return '💰';
    case 'arbitrage': return '🎯';
    case 'middle': return '📊';
    default: return '📋';
  }
}

export function getStatusColor(status: BetStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'won':
      return { bg: 'bg-blue-900/20 backdrop-blur-xl', text: 'text-blue-300', border: 'border-blue-700/50' };
    case 'lost':
      return { bg: 'bg-gray-800/20 backdrop-blur-xl', text: 'text-gray-300', border: 'border-gray-600/50' };
    case 'pending':
      return { bg: 'bg-yellow-900/20 backdrop-blur-xl', text: 'text-yellow-300', border: 'border-yellow-700/50' };
    case 'pushed':
      return { bg: 'bg-gray-900/20 backdrop-blur-xl', text: 'text-gray-300', border: 'border-gray-700/50' };
    case 'cancelled':
      return { bg: 'bg-gray-900/20 backdrop-blur-xl', text: 'text-gray-400', border: 'border-gray-700/50' };
    default:
      return { bg: 'bg-gray-900/20 backdrop-blur-xl', text: 'text-gray-300', border: 'border-gray-700/50' };
  }
}