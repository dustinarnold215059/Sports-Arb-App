import { prisma } from './database';
import { cacheUtils } from './redis';
import type { User, Bet, Portfolio } from '@prisma/client';

export interface UserWithStats extends User {
  stats: {
    apiRequestsUsed: number;
    apiRequestsLimit: number;
    lastActivity: Date;
  };
}

export interface BettingPortfolio {
  netProfit: number;
  totalStaked: number;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  pendingBets: number;
  winRate: number;
  profitRate: number;
  arbitrageGroups: number;
  arbitrageSuccessRate: number;
}

export class DatabaseUserService {
  private currentUserId: string | null = null;

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'basic',
      },
    });

    // Create initial portfolio
    await prisma.portfolio.create({
      data: {
        userId: user.id,
      },
    });

    // Clear related caches
    await cacheUtils.del(`user:${user.id}`);
    await cacheUtils.del('users:all');
    await cacheUtils.del('platform:stats');

    return user;
  }

  async getUserById(id: string): Promise<UserWithStats | null> {
    return await cacheUtils.getOrSet(
      `user:${id}`,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id },
        });

        if (!user) return null;

        return {
          ...user,
          stats: {
            apiRequestsUsed: user.apiRequestsUsed,
            apiRequestsLimit: user.apiRequestsLimit,
            lastActivity: user.lastActivity,
          },
        };
      },
      300 // 5 minutes cache
    );
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
        lastActivity: new Date(),
      },
    });

    // Clear caches
    await cacheUtils.del(`user:${id}`);
    await cacheUtils.del('users:all');
    await cacheUtils.del('platform:stats');

    return user;
  }

  async updateUserRole(id: string, role: string, subscriptionStatus?: string): Promise<User> {
    const updateData: any = {
      role,
      updatedAt: new Date(),
      lastActivity: new Date(),
    };

    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus;
      if (subscriptionStatus === 'active') {
        updateData.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Clear caches
    await cacheUtils.del(`user:${id}`);
    await cacheUtils.del('users:all');
    await cacheUtils.del('platform:stats');

    return user;
  }

  async getAllUsers(): Promise<UserWithStats[]> {
    return await cacheUtils.getOrSet(
      'users:all',
      async () => {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
        });

        return users.map(user => ({
          ...user,
          stats: {
            apiRequestsUsed: user.apiRequestsUsed,
            apiRequestsLimit: user.apiRequestsLimit,
            lastActivity: user.lastActivity,
          },
        }));
      },
      600 // 10 minutes cache
    );
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });

      // Clear caches
      await cacheUtils.del(`user:${id}`);
      await cacheUtils.del('users:all');
      await cacheUtils.del('platform:stats');

      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  async getPlatformStats() {
    return await cacheUtils.getOrSet(
      'platform:stats',
      async () => {
        const [totalUsers, activeUsers, premiumUsers, proUsers, basicUsers] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({
            where: {
              lastActivity: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
          }),
          prisma.user.count({ where: { role: 'premium' } }),
          prisma.user.count({ where: { role: 'pro' } }),
          prisma.user.count({ where: { role: 'basic' } }),
        ]);

        return {
          totalUsers,
          activeUsers,
          premiumUsers,
          proUsers,
          basicUsers,
          adminUsers: 1, // Assuming 1 admin
        };
      },
      300 // 5 minutes cache
    );
  }

  async addBet(betData: {
    game: string;
    bookmaker: string;
    betType: string;
    odds: string;
    stake: number;
    potentialWin: number;
    arbitrageGroup?: string;
    sport?: string;
    league?: string;
    homeTeam?: string;
    awayTeam?: string;
    commenceTime?: Date;
    notes?: string;
  }): Promise<Bet | null> {
    if (!this.currentUserId) {
      console.error('No current user set for adding bet');
      return null;
    }

    const bet = await prisma.bet.create({
      data: {
        ...betData,
        userId: this.currentUserId,
      },
    });

    // Update portfolio
    await this.updatePortfolioStats(this.currentUserId);

    // Clear caches
    await cacheUtils.del(`bets:${this.currentUserId}`);
    await cacheUtils.del(`portfolio:${this.currentUserId}`);

    return bet;
  }

  async getAllBets(): Promise<Bet[]> {
    if (!this.currentUserId) return [];

    return await cacheUtils.getOrSet(
      `bets:${this.currentUserId}`,
      async () => {
        return await prisma.bet.findMany({
          where: { userId: this.currentUserId! },
          orderBy: { timestamp: 'desc' },
        });
      },
      300 // 5 minutes cache
    );
  }

  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet | null> {
    if (!this.currentUserId) return null;

    const bet = await prisma.bet.update({
      where: { id, userId: this.currentUserId },
      data: updates,
    });

    // Update portfolio
    await this.updatePortfolioStats(this.currentUserId);

    // Clear caches
    await cacheUtils.del(`bets:${this.currentUserId}`);
    await cacheUtils.del(`portfolio:${this.currentUserId}`);

    return bet;
  }

  async getPortfolioStats(): Promise<BettingPortfolio | null> {
    if (!this.currentUserId) return null;

    return await cacheUtils.getOrSet(
      `portfolio:${this.currentUserId}`,
      async () => {
        const portfolio = await prisma.portfolio.findUnique({
          where: { userId: this.currentUserId! },
        });

        if (!portfolio) return null;

        return {
          netProfit: portfolio.netProfit,
          totalStaked: portfolio.totalStaked,
          totalBets: portfolio.totalBets,
          winningBets: portfolio.winningBets,
          losingBets: portfolio.losingBets,
          pendingBets: portfolio.pendingBets,
          winRate: portfolio.winRate,
          profitRate: portfolio.profitRate,
          arbitrageGroups: portfolio.arbitrageGroups,
          arbitrageSuccessRate: portfolio.arbitrageSuccessRate,
        };
      },
      300 // 5 minutes cache
    );
  }

  private async updatePortfolioStats(userId: string): Promise<void> {
    const bets = await prisma.bet.findMany({
      where: { userId },
    });

    const stats = {
      totalBets: bets.length,
      winningBets: bets.filter(bet => bet.status === 'won').length,
      losingBets: bets.filter(bet => bet.status === 'lost').length,
      pendingBets: bets.filter(bet => bet.status === 'pending').length,
      totalStaked: bets.reduce((sum, bet) => sum + bet.stake, 0),
      netProfit: bets.reduce((sum, bet) => sum + (bet.profit || 0), 0),
    };

    const winRate = stats.totalBets > 0 ? (stats.winningBets / stats.totalBets) * 100 : 0;
    const profitRate = stats.totalStaked > 0 ? (stats.netProfit / stats.totalStaked) * 100 : 0;

    const arbitrageGroups = new Set(
      bets.filter(bet => bet.arbitrageGroup).map(bet => bet.arbitrageGroup)
    ).size;

    const arbitrageSuccessRate = arbitrageGroups > 0 ? 
      (bets.filter(bet => bet.arbitrageGroup && bet.status === 'won').length / arbitrageGroups) * 100 : 0;

    await prisma.portfolio.upsert({
      where: { userId },
      update: {
        ...stats,
        winRate,
        profitRate,
        arbitrageGroups,
        arbitrageSuccessRate,
        lastUpdated: new Date(),
      },
      create: {
        userId,
        ...stats,
        winRate,
        profitRate,
        arbitrageGroups,
        arbitrageSuccessRate,
      },
    });
  }

  async getGlobalPlatformStats() {
    return await cacheUtils.getOrSet(
      'global:platform:stats',
      async () => {
        const [portfolios, totalBets] = await Promise.all([
          prisma.portfolio.findMany(),
          prisma.bet.count(),
        ]);

        const globalStats = portfolios.reduce(
          (acc, portfolio) => ({
            netProfit: acc.netProfit + portfolio.netProfit,
            totalStaked: acc.totalStaked + portfolio.totalStaked,
            totalBets: acc.totalBets + portfolio.totalBets,
            winningBets: acc.winningBets + portfolio.winningBets,
            arbitrageGroups: acc.arbitrageGroups + portfolio.arbitrageGroups,
          }),
          { netProfit: 0, totalStaked: 0, totalBets: 0, winningBets: 0, arbitrageGroups: 0 }
        );

        const winRate = globalStats.totalBets > 0 ? 
          (globalStats.winningBets / globalStats.totalBets) * 100 : 0;

        const arbitrageSuccessRate = globalStats.arbitrageGroups > 0 ? 75 : 0; // Estimated

        return {
          ...globalStats,
          winRate,
          arbitrageSuccessRate,
        };
      },
      600 // 10 minutes cache
    );
  }
}

export const databaseUserService = new DatabaseUserService();