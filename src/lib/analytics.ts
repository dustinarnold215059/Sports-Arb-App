/**
 * Advanced Portfolio Analytics & ROI Tracking System
 * Comprehensive betting performance analysis and metrics
 */

import { TrackedBet } from './betTracking';

export interface PerformanceMetrics {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  winRate: number;
  totalStaked: number;
  totalReturn: number;
  netProfit: number;
  roi: number;
  averageBetSize: number;
  averageOdds: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  bets: number;
  staked: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface SportPerformance {
  sport: string;
  bets: number;
  staked: number;
  profit: number;
  roi: number;
  winRate: number;
  averageOdds: number;
}

export interface BookmakerPerformance {
  bookmaker: string;
  bets: number;
  staked: number;
  profit: number;
  roi: number;
  winRate: number;
  averageSettlementTime: number; // hours
}

export interface ArbitrageOpportunityMetrics {
  totalOpportunities: number;
  successfulArbitrages: number;
  missedOpportunities: number;
  averageProfitMargin: number;
  bestProfitMargin: number;
  totalArbitrageProfit: number;
  averageArbitrageSize: number;
  arbitrageSuccessRate: number;
}

export interface RiskMetrics {
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number; // Conditional VaR
  maxRiskPerBet: number;
  portfolioVolatility: number;
  correlationRisk: number;
  liquidityRisk: number;
}

export interface PredictiveAnalytics {
  projectedMonthlyROI: number;
  projectedMonthlyProfit: number;
  recommendedBankroll: number;
  optimalBetSize: number;
  riskScore: number; // 1-10 scale
  growthTrend: 'bullish' | 'bearish' | 'neutral';
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export class AdvancedAnalytics {
  /**
   * Calculate comprehensive performance metrics
   */
  static calculatePerformanceMetrics(bets: TrackedBet[]): PerformanceMetrics {
    if (bets.length === 0) {
      return this.getEmptyMetrics();
    }

    const settledBets = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');
    const wonBets = bets.filter(bet => bet.status === 'won');
    const lostBets = bets.filter(bet => bet.status === 'lost');
    const pendingBets = bets.filter(bet => bet.status === 'pending');

    const totalStaked = settledBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalReturn = wonBets.reduce((sum, bet) => sum + (bet.potentialPayout || 0), 0);
    const netProfit = totalReturn - totalStaked;
    const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;

    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
    const averageBetSize = settledBets.length > 0 ? totalStaked / settledBets.length : 0;
    const averageOdds = settledBets.length > 0 
      ? settledBets.reduce((sum, bet) => sum + Math.abs(bet.odds), 0) / settledBets.length 
      : 0;

    // Calculate profit factor (gross profit / gross loss)
    const grossProfit = wonBets.reduce((sum, bet) => sum + ((bet.potentialPayout || 0) - bet.amount), 0);
    const grossLoss = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Calculate streaks
    const streakData = this.calculateStreaks(settledBets);

    // Calculate Sharpe ratio (simplified)
    const returns = this.calculateDailyReturns(settledBets);
    const sharpeRatio = this.calculateSharpeRatio(returns);

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(settledBets);

    return {
      totalBets: bets.length,
      wonBets: wonBets.length,
      lostBets: lostBets.length,
      pendingBets: pendingBets.length,
      winRate,
      totalStaked,
      totalReturn,
      netProfit,
      roi,
      averageBetSize,
      averageOdds,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      longestWinStreak: streakData.longestWinStreak,
      longestLoseStreak: streakData.longestLoseStreak,
      currentStreak: streakData.currentStreak,
      streakType: streakData.streakType
    };
  }

  /**
   * Calculate monthly performance breakdown
   */
  static calculateMonthlyPerformance(bets: TrackedBet[]): MonthlyPerformance[] {
    const monthlyData = bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .reduce((acc, bet) => {
        const date = new Date(bet.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!acc[key]) {
          acc[key] = {
            month: date.toLocaleString('default', { month: 'long' }),
            year: date.getFullYear(),
            bets: 0,
            staked: 0,
            profit: 0,
            wonBets: 0
          };
        }
        
        acc[key].bets++;
        acc[key].staked += bet.amount;
        
        if (bet.status === 'won') {
          acc[key].profit += (bet.potentialPayout || 0) - bet.amount;
          acc[key].wonBets++;
        } else {
          acc[key].profit -= bet.amount;
        }
        
        return acc;
      }, {} as Record<string, any>);

    return Object.values(monthlyData).map((data: any) => ({
      ...data,
      roi: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      winRate: data.bets > 0 ? (data.wonBets / data.bets) * 100 : 0
    })).sort((a, b) => new Date(`${a.year}-${a.month}`).getTime() - new Date(`${b.year}-${b.month}`).getTime());
  }

  /**
   * Calculate performance by sport
   */
  static calculateSportPerformance(bets: TrackedBet[]): SportPerformance[] {
    const sportData = bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .reduce((acc, bet) => {
        const sport = bet.sport || 'Unknown';
        
        if (!acc[sport]) {
          acc[sport] = {
            sport,
            bets: 0,
            staked: 0,
            profit: 0,
            wonBets: 0,
            totalOdds: 0
          };
        }
        
        acc[sport].bets++;
        acc[sport].staked += bet.amount;
        acc[sport].totalOdds += Math.abs(bet.odds);
        
        if (bet.status === 'won') {
          acc[sport].profit += (bet.potentialPayout || 0) - bet.amount;
          acc[sport].wonBets++;
        } else {
          acc[sport].profit -= bet.amount;
        }
        
        return acc;
      }, {} as Record<string, any>);

    return Object.values(sportData).map((data: any) => ({
      sport: data.sport,
      bets: data.bets,
      staked: data.staked,
      profit: data.profit,
      roi: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      winRate: data.bets > 0 ? (data.wonBets / data.bets) * 100 : 0,
      averageOdds: data.bets > 0 ? data.totalOdds / data.bets : 0
    })).sort((a, b) => b.profit - a.profit);
  }

  /**
   * Calculate bookmaker performance analysis
   */
  static calculateBookmakerPerformance(bets: TrackedBet[]): BookmakerPerformance[] {
    const bookmakerData = bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .reduce((acc, bet) => {
        const bookmaker = bet.bookmaker || 'Unknown';
        
        if (!acc[bookmaker]) {
          acc[bookmaker] = {
            bookmaker,
            bets: 0,
            staked: 0,
            profit: 0,
            wonBets: 0,
            totalSettlementTime: 0
          };
        }
        
        acc[bookmaker].bets++;
        acc[bookmaker].staked += bet.amount;
        
        if (bet.status === 'won') {
          acc[bookmaker].profit += (bet.potentialPayout || 0) - bet.amount;
          acc[bookmaker].wonBets++;
        } else {
          acc[bookmaker].profit -= bet.amount;
        }
        
        // Calculate settlement time (mock data for now)
        acc[bookmaker].totalSettlementTime += Math.random() * 24 + 1; // 1-25 hours
        
        return acc;
      }, {} as Record<string, any>);

    return Object.values(bookmakerData).map((data: any) => ({
      bookmaker: data.bookmaker,
      bets: data.bets,
      staked: data.staked,
      profit: data.profit,
      roi: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      winRate: data.bets > 0 ? (data.wonBets / data.bets) * 100 : 0,
      averageSettlementTime: data.bets > 0 ? data.totalSettlementTime / data.bets : 0
    })).sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate arbitrage opportunity metrics
   */
  static calculateArbitrageMetrics(bets: TrackedBet[]): ArbitrageOpportunityMetrics {
    const arbitrageBets = bets.filter(bet => bet.isArbitrage);
    const successfulArbitrages = arbitrageBets.filter(bet => bet.status === 'won');
    
    const totalOpportunities = arbitrageBets.length;
    const missedOpportunities = arbitrageBets.filter(bet => bet.status === 'lost').length;
    
    const profitMargins = arbitrageBets
      .filter(bet => bet.arbitrageData?.profitMargin)
      .map(bet => bet.arbitrageData!.profitMargin);
    
    const averageProfitMargin = profitMargins.length > 0 
      ? profitMargins.reduce((sum, margin) => sum + margin, 0) / profitMargins.length 
      : 0;
    
    const bestProfitMargin = profitMargins.length > 0 ? Math.max(...profitMargins) : 0;
    
    const totalArbitrageProfit = successfulArbitrages.reduce((sum, bet) => 
      sum + ((bet.potentialPayout || 0) - bet.amount), 0
    );
    
    const averageArbitrageSize = arbitrageBets.length > 0 
      ? arbitrageBets.reduce((sum, bet) => sum + bet.amount, 0) / arbitrageBets.length 
      : 0;

    return {
      totalOpportunities,
      successfulArbitrages: successfulArbitrages.length,
      missedOpportunities,
      averageProfitMargin,
      bestProfitMargin,
      totalArbitrageProfit,
      averageArbitrageSize,
      arbitrageSuccessRate: totalOpportunities > 0 ? (successfulArbitrages.length / totalOpportunities) * 100 : 0
    };
  }

  /**
   * Calculate risk metrics
   */
  static calculateRiskMetrics(bets: TrackedBet[]): RiskMetrics {
    const returns = this.calculateDailyReturns(bets);
    const sortedReturns = returns.sort((a, b) => a - b);
    
    // Value at Risk (5% worst case)
    const varIndex = Math.floor(returns.length * 0.05);
    const valueAtRisk = sortedReturns[varIndex] || 0;
    
    // Expected Shortfall (average of worst 5%)
    const worstReturns = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfall = worstReturns.length > 0 
      ? worstReturns.reduce((sum, ret) => sum + ret, 0) / worstReturns.length 
      : 0;
    
    // Portfolio volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const portfolioVolatility = Math.sqrt(variance);
    
    const maxRiskPerBet = bets.length > 0 ? Math.max(...bets.map(bet => bet.amount)) : 0;

    return {
      valueAtRisk: Math.abs(valueAtRisk),
      expectedShortfall: Math.abs(expectedShortfall),
      maxRiskPerBet,
      portfolioVolatility,
      correlationRisk: this.calculateCorrelationRisk(bets),
      liquidityRisk: this.calculateLiquidityRisk(bets)
    };
  }

  /**
   * Generate predictive analytics
   */
  static generatePredictiveAnalytics(bets: TrackedBet[]): PredictiveAnalytics {
    const metrics = this.calculatePerformanceMetrics(bets);
    const monthlyData = this.calculateMonthlyPerformance(bets);
    
    // Simple trend analysis
    const recentPerformance = monthlyData.slice(-3);
    const avgRecentROI = recentPerformance.length > 0 
      ? recentPerformance.reduce((sum, month) => sum + month.roi, 0) / recentPerformance.length 
      : metrics.roi;
    
    const projectedMonthlyROI = avgRecentROI;
    const projectedMonthlyProfit = metrics.averageBetSize * 20 * (projectedMonthlyROI / 100); // Assuming 20 bets/month
    
    // Kelly Criterion for optimal bet size
    const winRate = metrics.winRate / 100;
    const avgOddsDecimal = this.americanToDecimal(metrics.averageOdds);
    const kellyFraction = (winRate * avgOddsDecimal - 1) / (avgOddsDecimal - 1);
    const optimalBetSize = Math.max(0, Math.min(0.25, kellyFraction)) * 1000; // Max 25% of bankroll
    
    const recommendedBankroll = metrics.averageBetSize * 50; // 50x average bet size
    
    // Risk score calculation
    const riskScore = Math.min(10, Math.max(1, 
      5 + (metrics.maxDrawdown / 10) - (metrics.winRate / 20) + (metrics.roi < 0 ? 2 : 0)
    ));
    
    // Growth trend
    let growthTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (projectedMonthlyROI > 5) growthTrend = 'bullish';
    else if (projectedMonthlyROI < -2) growthTrend = 'bearish';

    return {
      projectedMonthlyROI,
      projectedMonthlyProfit,
      recommendedBankroll,
      optimalBetSize,
      riskScore,
      growthTrend,
      confidenceInterval: {
        lower: projectedMonthlyROI - (metrics.roi * 0.2),
        upper: projectedMonthlyROI + (metrics.roi * 0.2)
      }
    };
  }

  // Helper methods
  private static getEmptyMetrics(): PerformanceMetrics {
    return {
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      pendingBets: 0,
      winRate: 0,
      totalStaked: 0,
      totalReturn: 0,
      netProfit: 0,
      roi: 0,
      averageBetSize: 0,
      averageOdds: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      longestWinStreak: 0,
      longestLoseStreak: 0,
      currentStreak: 0,
      streakType: 'none'
    };
  }

  private static calculateStreaks(bets: TrackedBet[]) {
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';
    
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    
    for (const bet of bets.reverse()) {
      if (bet.status === 'won') {
        currentWinStreak++;
        currentLoseStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (bet.status === 'lost') {
        currentLoseStreak++;
        currentWinStreak = 0;
        longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
      }
    }
    
    if (currentWinStreak > 0) {
      currentStreak = currentWinStreak;
      streakType = 'win';
    } else if (currentLoseStreak > 0) {
      currentStreak = currentLoseStreak;
      streakType = 'loss';
    }
    
    return { longestWinStreak, longestLoseStreak, currentStreak, streakType };
  }

  private static calculateDailyReturns(bets: TrackedBet[]): number[] {
    const dailyReturns: Record<string, number> = {};
    
    bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .forEach(bet => {
        const date = new Date(bet.createdAt).toDateString();
        if (!dailyReturns[date]) dailyReturns[date] = 0;
        
        if (bet.status === 'won') {
          dailyReturns[date] += (bet.potentialPayout || 0) - bet.amount;
        } else {
          dailyReturns[date] -= bet.amount;
        }
      });
    
    return Object.values(dailyReturns);
  }

  private static calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? meanReturn / stdDev : 0;
  }

  private static calculateMaxDrawdown(bets: TrackedBet[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningBalance = 0;
    
    bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .forEach(bet => {
        if (bet.status === 'won') {
          runningBalance += (bet.potentialPayout || 0) - bet.amount;
        } else {
          runningBalance -= bet.amount;
        }
        
        if (runningBalance > peak) {
          peak = runningBalance;
        }
        
        const drawdown = (peak - runningBalance) / Math.max(peak, 1) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      });
    
    return maxDrawdown;
  }

  private static calculateCorrelationRisk(bets: TrackedBet[]): number {
    // Simplified correlation risk based on sport diversity
    const sports = new Set(bets.map(bet => bet.sport));
    const sportCount = sports.size;
    const totalBets = bets.length;
    
    // Higher diversity = lower risk
    return totalBets > 0 ? Math.max(0, 100 - (sportCount / totalBets * 100)) : 0;
  }

  private static calculateLiquidityRisk(bets: TrackedBet[]): number {
    // Simplified liquidity risk based on bet sizes
    const avgBetSize = bets.reduce((sum, bet) => sum + bet.amount, 0) / bets.length;
    const maxBetSize = Math.max(...bets.map(bet => bet.amount));
    
    // Higher concentration in large bets = higher risk
    return avgBetSize > 0 ? (maxBetSize / avgBetSize) * 10 : 0;
  }

  private static americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }
}