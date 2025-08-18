import { BettingOpportunity, BetPlacement, AutomationConfig } from './BettingAutomationEngine';

export interface RiskRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (context: RiskContext) => Promise<RiskResult>;
}

export interface RiskContext {
  opportunity: BettingOpportunity;
  proposedStakes: { stake1: number; stake2: number };
  currentBankroll: number;
  recentBets: BetPlacement[];
  config: AutomationConfig;
  historicalData: {
    dailyVolume: number;
    weeklyVolume: number;
    monthlyVolume: number;
    consecutiveLosses: number;
    totalProfit: number;
    totalLosses: number;
  };
}

export interface RiskResult {
  passed: boolean;
  score: number; // 0-100, higher is riskier
  message?: string;
  recommendation?: 'approve' | 'reject' | 'reduce_stake' | 'manual_review';
  suggestedStake?: number;
}

export interface ValidationResult {
  isValid: boolean;
  riskScore: number;
  passedRules: RiskRule[];
  failedRules: RiskRule[];
  warnings: string[];
  recommendations: string[];
  adjustedStakes?: { stake1: number; stake2: number };
}

export class RiskManager {
  private rules: Map<string, RiskRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Stake limits rule
    this.addRule({
      id: 'stake_limits',
      name: 'Stake Limits',
      description: 'Ensures bets stay within configured stake limits',
      enabled: true,
      severity: 'high',
      check: async (context) => {
        const totalStake = context.proposedStakes.stake1 + context.proposedStakes.stake2;
        const maxStake = context.config.maxStakePerBet;
        
        if (totalStake > maxStake) {
          return {
            passed: false,
            score: 85,
            message: `Total stake $${totalStake} exceeds maximum $${maxStake}`,
            recommendation: 'reduce_stake',
            suggestedStake: maxStake
          };
        }
        
        return {
          passed: true,
          score: 10,
          message: 'Stake within limits'
        };
      }
    });

    // Bankroll percentage rule
    this.addRule({
      id: 'bankroll_percentage',
      name: 'Bankroll Percentage',
      description: 'Limits bet size as percentage of bankroll',
      enabled: true,
      severity: 'critical',
      check: async (context) => {
        const totalStake = context.proposedStakes.stake1 + context.proposedStakes.stake2;
        const bankrollPercentage = (totalStake / context.currentBankroll) * 100;
        
        const maxPercentage = context.config.riskLevel === 'conservative' ? 2 : 
                             context.config.riskLevel === 'moderate' ? 5 : 10;
        
        if (bankrollPercentage > maxPercentage) {
          return {
            passed: false,
            score: 95,
            message: `Bet size ${bankrollPercentage.toFixed(1)}% of bankroll exceeds ${maxPercentage}% limit`,
            recommendation: 'reduce_stake',
            suggestedStake: context.currentBankroll * (maxPercentage / 100)
          };
        }
        
        return {
          passed: true,
          score: Math.min(bankrollPercentage * 2, 30),
          message: `Bet size ${bankrollPercentage.toFixed(1)}% of bankroll is acceptable`
        };
      }
    });

    // Daily volume rule
    this.addRule({
      id: 'daily_volume',
      name: 'Daily Volume Limit',
      description: 'Prevents excessive daily betting volume',
      enabled: true,
      severity: 'medium',
      check: async (context) => {
        const totalStake = context.proposedStakes.stake1 + context.proposedStakes.stake2;
        const newDailyVolume = context.historicalData.dailyVolume + totalStake;
        const dailyLimit = context.currentBankroll * 0.2; // 20% of bankroll per day
        
        if (newDailyVolume > dailyLimit) {
          return {
            passed: false,
            score: 70,
            message: `Daily volume would reach $${newDailyVolume}, exceeding limit of $${dailyLimit}`,
            recommendation: 'reject'
          };
        }
        
        return {
          passed: true,
          score: (newDailyVolume / dailyLimit) * 40,
          message: 'Daily volume within acceptable limits'
        };
      }
    });

    // Consecutive losses rule
    this.addRule({
      id: 'consecutive_losses',
      name: 'Consecutive Losses',
      description: 'Prevents betting after multiple consecutive losses',
      enabled: true,
      severity: 'high',
      check: async (context) => {
        const consecutiveLosses = context.historicalData.consecutiveLosses;
        const maxLosses = context.config.riskLevel === 'conservative' ? 3 : 
                         context.config.riskLevel === 'moderate' ? 5 : 7;
        
        if (consecutiveLosses >= maxLosses) {
          return {
            passed: false,
            score: 90,
            message: `${consecutiveLosses} consecutive losses exceeds limit of ${maxLosses}`,
            recommendation: 'reject'
          };
        }
        
        return {
          passed: true,
          score: consecutiveLosses * 15,
          message: `${consecutiveLosses} consecutive losses is acceptable`
        };
      }
    });

    // Margin quality rule
    this.addRule({
      id: 'margin_quality',
      name: 'Margin Quality',
      description: 'Evaluates the quality and sustainability of the arbitrage margin',
      enabled: true,
      severity: 'medium',
      check: async (context) => {
        const margin = context.opportunity.margin;
        const confidence = context.opportunity.confidence;
        
        // Higher margins might indicate stale odds or errors
        if (margin > 10) {
          return {
            passed: false,
            score: 95,
            message: `Margin ${margin}% appears too high, possible stale odds`,
            recommendation: 'manual_review'
          };
        }
        
        // Very low confidence should be flagged
        if (confidence < 0.7) {
          return {
            passed: false,
            score: 80,
            message: `Low confidence score ${confidence} indicates unreliable opportunity`,
            recommendation: 'reject'
          };
        }
        
        // Calculate risk score based on margin and confidence
        const marginScore = margin < 2 ? 20 : margin < 5 ? 10 : 30;
        const confidenceScore = (1 - confidence) * 40;
        
        return {
          passed: true,
          score: marginScore + confidenceScore,
          message: `Margin ${margin}% with confidence ${confidence} is acceptable`
        };
      }
    });

    // Time to expiry rule
    this.addRule({
      id: 'time_to_expiry',
      name: 'Time to Expiry',
      description: 'Ensures sufficient time to place both bets',
      enabled: true,
      severity: 'high',
      check: async (context) => {
        const now = new Date();
        const timeToExpiry = context.opportunity.expiresAt.getTime() - now.getTime();
        const minutesToExpiry = timeToExpiry / (1000 * 60);
        
        // Need at least 2 minutes to place both bets safely
        if (minutesToExpiry < 2) {
          return {
            passed: false,
            score: 95,
            message: `Only ${minutesToExpiry.toFixed(1)} minutes until expiry`,
            recommendation: 'reject'
          };
        }
        
        // Warn if less than 5 minutes
        if (minutesToExpiry < 5) {
          return {
            passed: true,
            score: 70,
            message: `${minutesToExpiry.toFixed(1)} minutes until expiry - tight timing`
          };
        }
        
        return {
          passed: true,
          score: Math.max(0, 30 - minutesToExpiry),
          message: `${minutesToExpiry.toFixed(1)} minutes until expiry is sufficient`
        };
      }
    });

    // Kelly Criterion rule
    this.addRule({
      id: 'kelly_criterion',
      name: 'Kelly Criterion',
      description: 'Applies Kelly Criterion for optimal bet sizing',
      enabled: true,
      severity: 'low',
      check: async (context) => {
        const { totalProfit, totalLosses } = context.historicalData;
        const totalBets = totalProfit + Math.abs(totalLosses);
        
        if (totalBets < 10) {
          // Not enough data for Kelly Criterion
          return {
            passed: true,
            score: 20,
            message: 'Insufficient betting history for Kelly Criterion analysis'
          };
        }
        
        const winRate = totalProfit / totalBets;
        const avgWin = totalProfit / (totalBets * winRate || 1);
        const avgLoss = Math.abs(totalLosses) / (totalBets * (1 - winRate) || 1);
        
        // Kelly percentage
        const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        const totalStake = context.proposedStakes.stake1 + context.proposedStakes.stake2;
        const proposedPercent = totalStake / context.currentBankroll;
        
        if (proposedPercent > kellyPercent * 2) {
          return {
            passed: false,
            score: 60,
            message: `Proposed bet ${(proposedPercent * 100).toFixed(1)}% exceeds Kelly recommendation ${(kellyPercent * 100).toFixed(1)}%`,
            recommendation: 'reduce_stake',
            suggestedStake: context.currentBankroll * kellyPercent
          };
        }
        
        return {
          passed: true,
          score: Math.max(0, (proposedPercent / kellyPercent) * 20),
          message: `Bet sizing aligns with Kelly Criterion`
        };
      }
    });
  }

  addRule(rule: RiskRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  async validateBet(context: RiskContext): Promise<ValidationResult> {
    const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
    const results = await Promise.all(
      enabledRules.map(async rule => ({
        rule,
        result: await rule.check(context)
      }))
    );

    const passedRules: RiskRule[] = [];
    const failedRules: RiskRule[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let totalRiskScore = 0;
    let suggestedStakeReduction: number | undefined;

    for (const { rule, result } of results) {
      if (result.passed) {
        passedRules.push(rule);
      } else {
        failedRules.push(rule);
        if (rule.severity === 'critical' || rule.severity === 'high') {
          recommendations.push(`${rule.name}: ${result.message}`);
        } else {
          warnings.push(`${rule.name}: ${result.message}`);
        }
      }

      totalRiskScore += result.score;

      // Collect stake reduction suggestions
      if (result.suggestedStake && (!suggestedStakeReduction || result.suggestedStake < suggestedStakeReduction)) {
        suggestedStakeReduction = result.suggestedStake;
      }
    }

    // Calculate average risk score
    const averageRiskScore = enabledRules.length > 0 ? totalRiskScore / enabledRules.length : 0;

    // Determine if bet is valid
    const criticalFailures = failedRules.filter(rule => rule.severity === 'critical');
    const highFailures = failedRules.filter(rule => rule.severity === 'high');
    
    const isValid = criticalFailures.length === 0 && highFailures.length === 0;

    // Calculate adjusted stakes if needed
    let adjustedStakes: { stake1: number; stake2: number } | undefined;
    if (!isValid && suggestedStakeReduction) {
      const reductionFactor = suggestedStakeReduction / (context.proposedStakes.stake1 + context.proposedStakes.stake2);
      adjustedStakes = {
        stake1: context.proposedStakes.stake1 * reductionFactor,
        stake2: context.proposedStakes.stake2 * reductionFactor
      };
    }

    return {
      isValid,
      riskScore: averageRiskScore,
      passedRules,
      failedRules,
      warnings,
      recommendations,
      adjustedStakes
    };
  }

  getRules(): RiskRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): RiskRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  async simulateValidation(context: RiskContext): Promise<ValidationResult> {
    // Create a copy of the context for simulation
    const simulationContext = { ...context };
    return this.validateBet(simulationContext);
  }
}

export default RiskManager;