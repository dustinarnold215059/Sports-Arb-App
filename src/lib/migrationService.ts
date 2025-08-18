import { prisma } from './database';
import { userDatabase } from './userDatabase';
import { betTracker } from './betTracking';

export interface MigrationResult {
  success: boolean;
  usersmigrated: number;
  betsMigrated: number;
  portfoliosMigrated: number;
  errors: string[];
}

export class DatabaseMigrationService {
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      usersmigrated: 0,
      betsMigrated: 0,
      portfoliosMigrated: 0,
      errors: []
    };

    try {
      // 1. Migrate Users
      const users = userDatabase.getAllUsers();
      for (const user of users) {
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              username: user.username,
              email: user.email,
              password: user.password,
              role: user.role,
              subscriptionStatus: user.subscriptionStatus || 'inactive',
              subscriptionExpiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null,
              apiRequestsUsed: user.stats?.apiRequestsUsed || 0,
              apiRequestsLimit: user.stats?.apiRequestsLimit || 100,
              lastActivity: user.stats?.lastActivity ? new Date(user.stats.lastActivity) : new Date(),
              updatedAt: new Date()
            },
            create: {
              id: user.id,
              username: user.username,
              email: user.email,
              password: user.password,
              role: user.role,
              subscriptionStatus: user.subscriptionStatus || 'inactive',
              subscriptionExpiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null,
              apiRequestsUsed: user.stats?.apiRequestsUsed || 0,
              apiRequestsLimit: user.stats?.apiRequestsLimit || 100,
              lastActivity: user.stats?.lastActivity ? new Date(user.stats.lastActivity) : new Date()
            }
          });
          result.usersmigrated++;
        } catch (error) {
          result.errors.push(`Failed to migrate user ${user.username}: ${error.message}`);
        }
      }

      // 2. Migrate Bets for all users
      for (const user of users) {
        try {
          // Set current user for bet tracker
          betTracker.setCurrentUser(user.id);
          const userBets = betTracker.getAllBets();

          for (const bet of userBets) {
            try {
              await prisma.bet.upsert({
                where: { id: bet.id },
                update: {
                  game: bet.game || 'Unknown Game',
                  bookmaker: bet.bookmaker,
                  betType: bet.betType,
                  odds: bet.odds,
                  stake: bet.stake,
                  potentialWin: bet.potentialWin,
                  status: bet.status,
                  profit: bet.profit,
                  timestamp: new Date(bet.timestamp),
                  arbitrageGroup: bet.arbitrageGroup,
                  sport: bet.sport,
                  league: bet.league,
                  homeTeam: bet.homeTeam,
                  awayTeam: bet.awayTeam,
                  commenceTime: bet.commenceTime ? new Date(bet.commenceTime) : null,
                  notes: bet.notes
                },
                create: {
                  id: bet.id,
                  userId: user.id,
                  game: bet.game || 'Unknown Game',
                  bookmaker: bet.bookmaker,
                  betType: bet.betType,
                  odds: bet.odds,
                  stake: bet.stake,
                  potentialWin: bet.potentialWin,
                  status: bet.status,
                  profit: bet.profit,
                  timestamp: new Date(bet.timestamp),
                  arbitrageGroup: bet.arbitrageGroup,
                  sport: bet.sport,
                  league: bet.league,
                  homeTeam: bet.homeTeam,
                  awayTeam: bet.awayTeam,
                  commenceTime: bet.commenceTime ? new Date(bet.commenceTime) : null,
                  notes: bet.notes
                }
              });
              result.betsMigrated++;
            } catch (error) {
              result.errors.push(`Failed to migrate bet ${bet.id}: ${error.message}`);
            }
          }

          // 3. Migrate Portfolio for this user
          const portfolio = betTracker.getPortfolioStats();
          if (portfolio) {
            try {
              await prisma.portfolio.upsert({
                where: { userId: user.id },
                update: {
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
                  lastUpdated: new Date()
                },
                create: {
                  userId: user.id,
                  netProfit: portfolio.netProfit,
                  totalStaked: portfolio.totalStaked,
                  totalBets: portfolio.totalBets,
                  winningBets: portfolio.winningBets,
                  losingBets: portfolio.losingBets,
                  pendingBets: portfolio.pendingBets,
                  winRate: portfolio.winRate,
                  profitRate: portfolio.profitRate,
                  arbitrageGroups: portfolio.arbitrageGroups,
                  arbitrageSuccessRate: portfolio.arbitrageSuccessRate
                }
              });
              result.portfoliosMigrated++;
            } catch (error) {
              result.errors.push(`Failed to migrate portfolio for user ${user.username}: ${error.message}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to process user ${user.username} bets: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
      result.success = false;
      return result;
    }
  }

  async verifyMigration(): Promise<{
    usersInDB: number;
    betsInDB: number;
    portfoliosInDB: number;
    usersInLocalStorage: number;
    betsInLocalStorage: number;
  }> {
    try {
      const [usersInDB, betsInDB, portfoliosInDB] = await Promise.all([
        prisma.user.count(),
        prisma.bet.count(),
        prisma.portfolio.count()
      ]);

      // Count localStorage data
      const usersInLocalStorage = userDatabase.getAllUsers().length;
      
      // Count total bets across all users in localStorage
      let betsInLocalStorage = 0;
      const users = userDatabase.getAllUsers();
      for (const user of users) {
        betTracker.setCurrentUser(user.id);
        betsInLocalStorage += betTracker.getAllBets().length;
      }

      return {
        usersInDB,
        betsInDB,
        portfoliosInDB,
        usersInLocalStorage,
        betsInLocalStorage
      };
    } catch (error) {
      console.error('Migration verification failed:', error);
      return {
        usersInDB: 0,
        betsInDB: 0,
        portfoliosInDB: 0,
        usersInLocalStorage: 0,
        betsInLocalStorage: 0
      };
    }
  }

  async clearLocalStorageData(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        // Clear all localStorage data related to our app
        localStorage.removeItem('sports_betting_auth');
        localStorage.removeItem('bet_tracking_data');
        localStorage.removeItem('user_database');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }
}

export const migrationService = new DatabaseMigrationService();