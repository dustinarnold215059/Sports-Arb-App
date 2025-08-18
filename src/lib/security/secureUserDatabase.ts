import { betTracker } from '../betTracking';
import { PasswordService, InputSanitizer } from './auth';

// Enhanced user interface with security fields
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
  passwordHash: string; // Hashed password
  role: 'admin' | 'premium' | 'basic' | 'pro';
  subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro';
  subscriptionExpiry: Date;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  stats: UserStats;
  // Security fields
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  refreshTokenHash?: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: 'basic' | 'premium' | 'pro';
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash' | 'refreshTokenHash'>;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
}

// Initialize with hashed passwords for existing users
let users: User[] = [];

// Initialize secure users database
async function initializeSecureUsers() {
  if (users.length === 0) {
    try {
      const adminPasswordHash = await PasswordService.hashPassword('Admin123!');
      const userPasswordHash = await PasswordService.hashPassword('User123!');
      const traderPasswordHash = await PasswordService.hashPassword('Trader123!');

      users = [
        {
          id: '1',
          username: 'admin',
          email: 'admin@sportsarb.com',
          passwordHash: adminPasswordHash,
          role: 'admin',
          subscriptionStatus: 'premium',
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-01'),
          lastLogin: new Date(),
          isActive: true,
          stats: {} as UserStats,
          failedLoginAttempts: 0,
          emailVerified: true,
          twoFactorEnabled: false
        },
        {
          id: '2',
          username: 'john_trader',
          email: 'john@email.com',
          passwordHash: traderPasswordHash,
          role: 'premium',
          subscriptionStatus: 'premium',
          subscriptionExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date('2024-02-15'),
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          isActive: true,
          stats: {} as UserStats,
          failedLoginAttempts: 0,
          emailVerified: true,
          twoFactorEnabled: false
        },
        {
          id: '3',
          username: 'demo_user',
          email: 'demo@example.com',
          passwordHash: userPasswordHash,
          role: 'basic',
          subscriptionStatus: 'trial',
          subscriptionExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          lastLogin: new Date(),
          isActive: true,
          stats: {} as UserStats,
          failedLoginAttempts: 0,
          emailVerified: false,
          twoFactorEnabled: false
        }
      ];
    } catch (error) {
      console.error('Failed to initialize secure users:', error);
      throw error;
    }
  }
}

// Calculate real user stats
function calculateRealUserStats(userId: string): UserStats {
  const userBets = betTracker.getAllBets().filter(bet => bet.userId === userId);
  
  if (userBets.length === 0) {
    return {
      totalBets: 0,
      totalProfit: 0,
      successRate: 0,
      avgProfitPerBet: 0,
      lastActivity: new Date(),
      arbitrageOpportunitiesFound: 0,
      totalStakeAmount: 0,
      bestArbitrageProfit: 0,
      scansPerformed: 0,
      apiRequestsUsed: 0
    };
  }

  const totalProfit = userBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  const winningBets = userBets.filter(bet => bet.status === 'won').length;
  const totalStaked = userBets.reduce((sum, bet) => sum + bet.stake, 0);
  const arbitrageBets = userBets.filter(bet => bet.betType === 'arbitrage');
  
  return {
    totalBets: userBets.length,
    totalProfit: totalProfit,
    successRate: userBets.length > 0 ? (winningBets / userBets.length) * 100 : 0,
    avgProfitPerBet: userBets.length > 0 ? totalProfit / userBets.length : 0,
    lastActivity: userBets.length > 0 ? new Date(Math.max(...userBets.map(bet => bet.timestamp.getTime()))) : new Date(),
    arbitrageOpportunitiesFound: arbitrageBets.length,
    totalStakeAmount: totalStaked,
    bestArbitrageProfit: arbitrageBets.length > 0 ? Math.max(...arbitrageBets.map(bet => bet.profit || 0)) : 0,
    scansPerformed: Math.floor(Math.random() * 1000) + 100, // Mock data
    apiRequestsUsed: Math.floor(Math.random() * 5000) + 1000 // Mock data
  };
}

export class SecureUserDatabase {
  private static instance: SecureUserDatabase;
  private initialized = false;

  static getInstance(): SecureUserDatabase {
    if (!this.instance) {
      this.instance = new SecureUserDatabase();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await initializeSecureUsers();
      this.initialized = true;
    }
  }

  // Authenticate user with security measures
  async authenticateUser(username: string, password: string): Promise<AuthResult> {
    try {
      await this.initialize();

      // Sanitize inputs
      const cleanUsername = InputSanitizer.sanitizeUsername(username);
      
      // Find user
      const user = users.find(u => u.username === cleanUsername || u.email === cleanUsername);
      
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return { 
          success: false, 
          error: `Account locked. Try again in ${minutesRemaining} minute(s)` 
        };
      }

      // Verify password
      const isValidPassword = await PasswordService.verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        // Increment failed attempts
        user.failedLoginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          return { 
            success: false, 
            error: 'Account locked due to too many failed attempts. Try again in 30 minutes.' 
          };
        }
        
        return { 
          success: false, 
          error: `Invalid credentials. ${5 - user.failedLoginAttempts} attempts remaining.` 
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLogin = new Date();

      // Return user without sensitive data
      const safeUser = {
        ...user,
        stats: calculateRealUserStats(user.id)
      };
      
      // Remove sensitive fields
      const { passwordHash, refreshTokenHash, ...userWithoutSensitiveData } = safeUser;

      return {
        success: true,
        user: userWithoutSensitiveData
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // Create new user
  async createUser(userData: CreateUserInput): Promise<AuthResult> {
    try {
      await this.initialize();

      // Sanitize inputs
      const cleanUsername = InputSanitizer.sanitizeUsername(userData.username);
      const cleanEmail = InputSanitizer.sanitizeEmail(userData.email);

      // Check if user already exists
      const existingUser = users.find(u => 
        u.username === cleanUsername || u.email === cleanEmail
      );

      if (existingUser) {
        return { 
          success: false, 
          error: 'Username or email already exists' 
        };
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(userData.password);

      // Create new user
      const newUser: User = {
        id: (users.length + 1).toString(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: userData.role || 'basic',
        subscriptionStatus: userData.role === 'premium' ? 'premium' : 'trial',
        subscriptionExpiry: new Date(Date.now() + (userData.role === 'premium' ? 365 : 14) * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        stats: {} as UserStats,
        failedLoginAttempts: 0,
        emailVerified: false,
        twoFactorEnabled: false
      };

      users.push(newUser);

      // Return user without sensitive data
      const { passwordHash: _, refreshTokenHash: __, ...userWithoutSensitiveData } = {
        ...newUser,
        stats: calculateRealUserStats(newUser.id)
      };

      return {
        success: true,
        user: userWithoutSensitiveData
      };

    } catch (error) {
      console.error('User creation error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'> | null> {
    await this.initialize();
    
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const { passwordHash, refreshTokenHash, ...userWithoutSensitiveData } = {
      ...user,
      stats: calculateRealUserStats(user.id)
    };

    return userWithoutSensitiveData;
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>[]> {
    await this.initialize();
    
    return users.map(user => {
      const { passwordHash, refreshTokenHash, ...userWithoutSensitiveData } = {
        ...user,
        stats: calculateRealUserStats(user.id)
      };
      return userWithoutSensitiveData;
    });
  }

  // Update user role
  async updateUserRole(
    userId: string, 
    role: 'admin' | 'premium' | 'basic' | 'pro', 
    subscriptionStatus: 'premium' | 'basic' | 'trial' | 'pro', 
    expiryDays: number
  ): Promise<boolean> {
    await this.initialize();
    
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    user.role = role;
    user.subscriptionStatus = subscriptionStatus;
    user.subscriptionExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    return true;
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      await this.initialize();
      
      const user = users.find(u => u.id === userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidCurrentPassword = await PasswordService.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await PasswordService.hashPassword(newPassword);
      user.passwordHash = newPasswordHash;

      return { success: true };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  // Deactivate user
  async deactivateUser(userId: string): Promise<boolean> {
    await this.initialize();
    
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    user.isActive = false;
    return true;
  }

  // Get platform stats
  getPlatformStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const premiumUsers = users.filter(u => u.subscriptionStatus === 'premium').length;
    const basicUsers = users.filter(u => u.subscriptionStatus === 'basic').length;
    const proUsers = users.filter(u => u.subscriptionStatus === 'pro').length;

    return {
      totalUsers,
      activeUsers,
      premiumUsers,
      basicUsers,
      proUsers,
      // Additional stats would come from bet tracking system
      totalProfit: users.reduce((sum, user) => sum + calculateRealUserStats(user.id).totalProfit, 0),
      totalBets: users.reduce((sum, user) => sum + calculateRealUserStats(user.id).totalBets, 0),
      avgSuccessRate: users.length > 0 
        ? users.reduce((sum, user) => sum + calculateRealUserStats(user.id).successRate, 0) / users.length 
        : 0
    };
  }
}

// Export singleton instance
export const secureUserDatabase = SecureUserDatabase.getInstance();