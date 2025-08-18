import { EventEmitter } from 'events';

export interface BettingOpportunity {
  id: string;
  sport: string;
  game: string;
  bookmaker1: string;
  bookmaker2: string;
  odds1: number;
  odds2: number;
  margin: number;
  minStake: number;
  maxStake: number;
  expiresAt: Date;
  confidence: number;
}

export interface BetPlacement {
  id: string;
  opportunityId: string;
  bookmaker: string;
  selection: string;
  odds: number;
  stake: number;
  status: 'pending' | 'placed' | 'failed' | 'cancelled';
  placedAt?: Date;
  error?: string;
  transactionId?: string;
}

export interface AutomationConfig {
  enabled: boolean;
  minMargin: number;
  maxStakePerBet: number;
  maxTotalStake: number;
  minConfidence: number;
  allowedSports: string[];
  allowedBookmakers: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoApproveBelow: number;
  cooldownPeriod: number;
}

export interface RiskManagement {
  dailyLimit: number;
  dailyUsed: number;
  weeklyLimit: number;
  weeklyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
  consecutiveLossLimit: number;
  consecutiveLosses: number;
  minBankroll: number;
  currentBankroll: number;
}

export class BettingAutomationEngine extends EventEmitter {
  private config: AutomationConfig;
  private riskManagement: RiskManagement;
  private activeBets: Map<string, BetPlacement> = new Map();
  private isRunning = false;
  private lastExecution = 0;

  constructor(config: AutomationConfig, riskManagement: RiskManagement) {
    super();
    this.config = config;
    this.riskManagement = riskManagement;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation engine is already running');
    }

    this.isRunning = true;
    this.emit('started');
    
    // Start the main automation loop
    this.runAutomationLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('stopped');
  }

  private async runAutomationLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processOpportunities();
        await this.sleep(1000); // Check every second
      } catch (error) {
        this.emit('error', error);
        await this.sleep(5000); // Wait longer on error
      }
    }
  }

  private async processOpportunities(): Promise<void> {
    if (!this.config.enabled) return;

    const now = Date.now();
    if (now - this.lastExecution < this.config.cooldownPeriod) return;

    const opportunities = await this.fetchOpportunities();
    const validOpportunities = this.filterOpportunities(opportunities);

    for (const opportunity of validOpportunities) {
      if (await this.shouldPlaceBet(opportunity)) {
        await this.executeBet(opportunity);
      }
    }

    this.lastExecution = now;
  }

  private async fetchOpportunities(): Promise<BettingOpportunity[]> {
    // This would integrate with your arbitrage detection system
    // For now, return empty array
    return [];
  }

  private filterOpportunities(opportunities: BettingOpportunity[]): BettingOpportunity[] {
    return opportunities.filter(opp => {
      // Check margin requirement
      if (opp.margin < this.config.minMargin) return false;

      // Check confidence requirement
      if (opp.confidence < this.config.minConfidence) return false;

      // Check allowed sports
      if (!this.config.allowedSports.includes(opp.sport)) return false;

      // Check allowed bookmakers
      if (!this.config.allowedBookmakers.includes(opp.bookmaker1) || 
          !this.config.allowedBookmakers.includes(opp.bookmaker2)) return false;

      // Check expiration
      if (opp.expiresAt < new Date()) return false;

      return true;
    });
  }

  private async shouldPlaceBet(opportunity: BettingOpportunity): Promise<boolean> {
    // Risk management checks
    if (!this.passesRiskChecks(opportunity)) return false;

    // Auto-approval check
    if (opportunity.margin >= this.config.autoApproveBelow) {
      return true;
    }

    // Emit event for manual approval if needed
    this.emit('approval_required', opportunity);
    return false;
  }

  private passesRiskChecks(opportunity: BettingOpportunity): boolean {
    // Check daily limits
    if (this.riskManagement.dailyUsed >= this.riskManagement.dailyLimit) {
      this.emit('risk_limit_hit', 'daily_limit');
      return false;
    }

    // Check weekly limits
    if (this.riskManagement.weeklyUsed >= this.riskManagement.weeklyLimit) {
      this.emit('risk_limit_hit', 'weekly_limit');
      return false;
    }

    // Check monthly limits
    if (this.riskManagement.monthlyUsed >= this.riskManagement.monthlyLimit) {
      this.emit('risk_limit_hit', 'monthly_limit');
      return false;
    }

    // Check consecutive losses
    if (this.riskManagement.consecutiveLosses >= this.riskManagement.consecutiveLossLimit) {
      this.emit('risk_limit_hit', 'consecutive_losses');
      return false;
    }

    // Check bankroll
    if (this.riskManagement.currentBankroll < this.riskManagement.minBankroll) {
      this.emit('risk_limit_hit', 'min_bankroll');
      return false;
    }

    return true;
  }

  private async executeBet(opportunity: BettingOpportunity): Promise<void> {
    const stakes = this.calculateOptimalStakes(opportunity);
    
    const bet1: BetPlacement = {
      id: `bet_${Date.now()}_1`,
      opportunityId: opportunity.id,
      bookmaker: opportunity.bookmaker1,
      selection: 'side1',
      odds: opportunity.odds1,
      stake: stakes.stake1,
      status: 'pending'
    };

    const bet2: BetPlacement = {
      id: `bet_${Date.now()}_2`,
      opportunityId: opportunity.id,
      bookmaker: opportunity.bookmaker2,
      selection: 'side2',
      odds: opportunity.odds2,
      stake: stakes.stake2,
      status: 'pending'
    };

    try {
      // Place both bets simultaneously
      await Promise.all([
        this.placeBet(bet1),
        this.placeBet(bet2)
      ]);

      this.emit('bets_placed', { opportunity, bets: [bet1, bet2] });
      
      // Update risk management
      this.updateRiskManagement(stakes.stake1 + stakes.stake2);
      
    } catch (error) {
      this.emit('bet_placement_failed', { opportunity, error });
      
      // Cancel any successfully placed bets
      await this.cancelPendingBets([bet1, bet2]);
    }
  }

  private calculateOptimalStakes(opportunity: BettingOpportunity): { stake1: number; stake2: number } {
    const totalStake = Math.min(
      this.config.maxStakePerBet,
      opportunity.maxStake,
      this.riskManagement.dailyLimit - this.riskManagement.dailyUsed
    );

    // Calculate stakes for guaranteed profit
    const odds1 = opportunity.odds1;
    const odds2 = opportunity.odds2;
    
    const stake1 = totalStake / (1 + odds1 / odds2);
    const stake2 = totalStake - stake1;

    return { stake1, stake2 };
  }

  private async placeBet(bet: BetPlacement): Promise<void> {
    // This would integrate with actual bookmaker APIs
    // For now, simulate bet placement
    
    try {
      bet.status = 'pending';
      this.activeBets.set(bet.id, bet);

      // Simulate API call delay
      await this.sleep(Math.random() * 2000 + 1000);

      // Simulate success/failure (90% success rate)
      if (Math.random() > 0.1) {
        bet.status = 'placed';
        bet.placedAt = new Date();
        bet.transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.emit('bet_placed', bet);
      } else {
        bet.status = 'failed';
        bet.error = 'Simulated API error';
        
        this.emit('bet_failed', bet);
        throw new Error(bet.error);
      }
    } catch (error) {
      bet.status = 'failed';
      bet.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async cancelPendingBets(bets: BetPlacement[]): Promise<void> {
    for (const bet of bets) {
      if (bet.status === 'placed') {
        try {
          bet.status = 'cancelled';
          this.emit('bet_cancelled', bet);
        } catch (error) {
          this.emit('bet_cancellation_failed', { bet, error });
        }
      }
    }
  }

  private updateRiskManagement(amount: number): void {
    this.riskManagement.dailyUsed += amount;
    this.riskManagement.weeklyUsed += amount;
    this.riskManagement.monthlyUsed += amount;
  }

  public updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  public updateRiskManagement(newRisk: Partial<RiskManagement>): void {
    this.riskManagement = { ...this.riskManagement, ...newRisk };
    this.emit('risk_management_updated', this.riskManagement);
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      riskManagement: this.riskManagement,
      activeBets: Array.from(this.activeBets.values()),
      lastExecution: this.lastExecution
    };
  }

  public async approveBet(opportunityId: string): Promise<void> {
    // Implementation for manual bet approval
    this.emit('bet_manually_approved', opportunityId);
  }

  public async rejectBet(opportunityId: string): Promise<void> {
    // Implementation for manual bet rejection
    this.emit('bet_manually_rejected', opportunityId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BettingAutomationEngine;