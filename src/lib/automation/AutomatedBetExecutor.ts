import { EventEmitter } from 'events';
import BettingAutomationEngine, { 
  BettingOpportunity, 
  BetPlacement, 
  AutomationConfig, 
  RiskManagement 
} from './BettingAutomationEngine';
import BookmakerAPIManager, { BetRequest, BetResponse } from './BookmakerAPI';
import RiskManager, { RiskContext, ValidationResult } from './RiskManager';

export interface ExecutionContext {
  opportunity: BettingOpportunity;
  stakes: { stake1: number; stake2: number };
  validationResult: ValidationResult;
  timestamp: Date;
  executionId: string;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  opportunity: BettingOpportunity;
  bet1Result?: BetResponse;
  bet2Result?: BetResponse;
  totalStaked: number;
  estimatedProfit: number;
  actualProfit?: number;
  error?: string;
  warnings: string[];
  executionTime: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalStaked: number;
  totalProfit: number;
  averageExecutionTime: number;
  successRate: number;
  avgMarginCaptured: number;
}

export class AutomatedBetExecutor extends EventEmitter {
  private automationEngine: BettingAutomationEngine;
  private bookmakerManager: BookmakerAPIManager;
  private riskManager: RiskManager;
  private executionHistory: ExecutionResult[] = [];
  private isActive = false;
  private maxConcurrentExecutions = 3;
  private activeExecutions = new Set<string>();

  constructor(
    automationEngine: BettingAutomationEngine,
    bookmakerManager: BookmakerAPIManager,
    riskManager: RiskManager
  ) {
    super();
    this.automationEngine = automationEngine;
    this.bookmakerManager = bookmakerManager;
    this.riskManager = riskManager;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to automation engine events
    this.automationEngine.on('bets_placed', (data) => {
      this.emit('execution_completed', data);
    });

    this.automationEngine.on('bet_placement_failed', (data) => {
      this.emit('execution_failed', data);
    });

    this.automationEngine.on('approval_required', (opportunity) => {
      this.emit('manual_approval_required', opportunity);
    });
  }

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Automated bet executor is already active');
    }

    this.isActive = true;
    await this.automationEngine.start();
    this.emit('executor_started');
  }

  async stop(): Promise<void> {
    this.isActive = false;
    await this.automationEngine.stop();
    
    // Wait for active executions to complete
    while (this.activeExecutions.size > 0) {
      await this.sleep(100);
    }
    
    this.emit('executor_stopped');
  }

  async executeOpportunity(
    opportunity: BettingOpportunity,
    manualOverride = false
  ): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    this.activeExecutions.add(executionId);

    try {
      const result = await this.internalExecuteOpportunity(
        opportunity, 
        executionId, 
        manualOverride
      );
      
      result.executionTime = Date.now() - startTime;
      this.executionHistory.push(result);
      
      this.emit('execution_result', result);
      return result;
      
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  private async internalExecuteOpportunity(
    opportunity: BettingOpportunity,
    executionId: string,
    manualOverride: boolean
  ): Promise<ExecutionResult> {
    const baseResult: ExecutionResult = {
      success: false,
      executionId,
      opportunity,
      totalStaked: 0,
      estimatedProfit: 0,
      warnings: [],
      executionTime: 0
    };

    try {
      // Step 1: Calculate optimal stakes
      const stakes = this.calculateOptimalStakes(opportunity);
      baseResult.totalStaked = stakes.stake1 + stakes.stake2;
      baseResult.estimatedProfit = this.calculateEstimatedProfit(opportunity, stakes);

      // Step 2: Risk assessment (unless manually overridden)
      if (!manualOverride) {
        const validationResult = await this.performRiskAssessment(opportunity, stakes);
        
        if (!validationResult.isValid) {
          return {
            ...baseResult,
            error: `Risk assessment failed: ${validationResult.recommendations.join(', ')}`,
            warnings: validationResult.warnings
          };
        }
        
        baseResult.warnings = validationResult.warnings;
        
        // Use adjusted stakes if recommended
        if (validationResult.adjustedStakes) {
          stakes.stake1 = validationResult.adjustedStakes.stake1;
          stakes.stake2 = validationResult.adjustedStakes.stake2;
          baseResult.totalStaked = stakes.stake1 + stakes.stake2;
          baseResult.estimatedProfit = this.calculateEstimatedProfit(opportunity, stakes);
        }
      }

      // Step 3: Verify bookmaker connectivity
      const connectivityCheck = await this.verifyBookmakerConnectivity(
        opportunity.bookmaker1,
        opportunity.bookmaker2
      );
      
      if (!connectivityCheck.success) {
        return {
          ...baseResult,
          error: `Bookmaker connectivity failed: ${connectivityCheck.error}`
        };
      }

      // Step 4: Pre-flight checks
      const preflightResult = await this.performPreflightChecks(opportunity, stakes);
      if (!preflightResult.success) {
        return {
          ...baseResult,
          error: `Preflight checks failed: ${preflightResult.error}`,
          warnings: [...baseResult.warnings, ...preflightResult.warnings]
        };
      }

      // Step 5: Execute bets simultaneously
      const executionResult = await this.executeBetsSimultaneously(opportunity, stakes);
      
      return {
        ...baseResult,
        success: executionResult.success,
        bet1Result: executionResult.bet1Result,
        bet2Result: executionResult.bet2Result,
        actualProfit: executionResult.actualProfit,
        error: executionResult.error,
        warnings: [...baseResult.warnings, ...executionResult.warnings]
      };

    } catch (error) {
      return {
        ...baseResult,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  private calculateOptimalStakes(opportunity: BettingOpportunity): { stake1: number; stake2: number } {
    const config = this.automationEngine.getStatus().config;
    const maxStake = Math.min(
      config.maxStakePerBet,
      opportunity.maxStake
    );

    // Calculate stakes for guaranteed profit using inverse odds ratio
    const odds1 = opportunity.odds1;
    const odds2 = opportunity.odds2;
    
    const totalImpliedProb = (1 / odds1) + (1 / odds2);
    const stake1 = maxStake * (1 / odds1) / totalImpliedProb;
    const stake2 = maxStake * (1 / odds2) / totalImpliedProb;

    return { stake1, stake2 };
  }

  private calculateEstimatedProfit(
    opportunity: BettingOpportunity, 
    stakes: { stake1: number; stake2: number }
  ): number {
    // Calculate profit from winning side minus losing stake
    const profit1 = stakes.stake1 * opportunity.odds1 - stakes.stake2;
    const profit2 = stakes.stake2 * opportunity.odds2 - stakes.stake1;
    
    // Both should be equal in a perfect arbitrage
    return Math.min(profit1, profit2);
  }

  private async performRiskAssessment(
    opportunity: BettingOpportunity,
    stakes: { stake1: number; stake2: number }
  ): Promise<ValidationResult> {
    const status = this.automationEngine.getStatus();
    const recentBets = status.activeBets.slice(-50); // Last 50 bets
    
    const context: RiskContext = {
      opportunity,
      proposedStakes: stakes,
      currentBankroll: status.riskManagement.currentBankroll,
      recentBets,
      config: status.config,
      historicalData: {
        dailyVolume: status.riskManagement.dailyUsed,
        weeklyVolume: status.riskManagement.weeklyUsed,
        monthlyVolume: status.riskManagement.monthlyUsed,
        consecutiveLosses: status.riskManagement.consecutiveLosses,
        totalProfit: this.calculateTotalProfit(),
        totalLosses: this.calculateTotalLosses()
      }
    };

    return this.riskManager.validateBet(context);
  }

  private async verifyBookmakerConnectivity(
    bookmaker1: string,
    bookmaker2: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const api1 = this.bookmakerManager.getAPI(bookmaker1);
      const api2 = this.bookmakerManager.getAPI(bookmaker2);

      if (!api1 || !api2) {
        return {
          success: false,
          error: `One or both bookmaker APIs not available: ${bookmaker1}, ${bookmaker2}`
        };
      }

      // Test connectivity by fetching account info
      const [account1, account2] = await Promise.all([
        api1.getAccountInfo(),
        api2.getAccountInfo()
      ]);

      // Check sufficient balance
      const totalStake = this.calculateTotalStakeNeeded();
      if (account1.balance < totalStake / 2 || account2.balance < totalStake / 2) {
        return {
          success: false,
          error: 'Insufficient balance in one or both bookmaker accounts'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Bookmaker connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performPreflightChecks(
    opportunity: BettingOpportunity,
    stakes: { stake1: number; stake2: number }
  ): Promise<{ success: boolean; error?: string; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      // Check if opportunity is still valid
      const timeToExpiry = opportunity.expiresAt.getTime() - Date.now();
      if (timeToExpiry < 30000) { // Less than 30 seconds
        return {
          success: false,
          error: 'Opportunity expired or too close to expiry',
          warnings
        };
      }

      if (timeToExpiry < 120000) { // Less than 2 minutes
        warnings.push('Opportunity expires soon - execution may be rushed');
      }

      // Verify odds are still available (simplified check)
      // In real implementation, this would query current odds from bookmakers
      const oddsCheck = await this.verifyCurrentOdds(opportunity);
      if (!oddsCheck.valid) {
        return {
          success: false,
          error: 'Odds have changed significantly since opportunity detection',
          warnings
        };
      }

      if (oddsCheck.marginReduced) {
        warnings.push('Margin has reduced since detection - profit may be lower');
      }

      return { success: true, warnings };
    } catch (error) {
      return {
        success: false,
        error: `Preflight check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings
      };
    }
  }

  private async verifyCurrentOdds(opportunity: BettingOpportunity): Promise<{
    valid: boolean;
    marginReduced: boolean;
  }> {
    // Simplified odds verification - in real implementation would check current odds
    // For now, simulate with 90% chance odds are still valid
    const stillValid = Math.random() > 0.1;
    const marginReduced = Math.random() > 0.7;
    
    return {
      valid: stillValid,
      marginReduced: marginReduced && stillValid
    };
  }

  private async executeBetsSimultaneously(
    opportunity: BettingOpportunity,
    stakes: { stake1: number; stake2: number }
  ): Promise<{
    success: boolean;
    bet1Result?: BetResponse;
    bet2Result?: BetResponse;
    actualProfit?: number;
    error?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      const bet1Request: BetRequest = {
        gameId: opportunity.id,
        marketId: 'side1',
        selection: 'side1',
        odds: opportunity.odds1,
        stake: stakes.stake1,
        reference: `arb_${Date.now()}_1`
      };

      const bet2Request: BetRequest = {
        gameId: opportunity.id,
        marketId: 'side2',
        selection: 'side2',
        odds: opportunity.odds2,
        stake: stakes.stake2,
        reference: `arb_${Date.now()}_2`
      };

      // Execute both bets simultaneously
      const [bet1Result, bet2Result] = await Promise.all([
        this.bookmakerManager.placeBetOnBookmaker(opportunity.bookmaker1, bet1Request),
        this.bookmakerManager.placeBetOnBookmaker(opportunity.bookmaker2, bet2Request)
      ]);

      // Check if both bets were successful
      if (!bet1Result.success || !bet2Result.success) {
        // Try to cancel any successful bet
        if (bet1Result.success && bet1Result.betId) {
          try {
            const api1 = this.bookmakerManager.getAPI(opportunity.bookmaker1);
            await api1?.cancelBet(bet1Result.betId);
            warnings.push('Cancelled bet 1 due to bet 2 failure');
          } catch (cancelError) {
            warnings.push('Failed to cancel bet 1 after bet 2 failure - manual intervention required');
          }
        }

        if (bet2Result.success && bet2Result.betId) {
          try {
            const api2 = this.bookmakerManager.getAPI(opportunity.bookmaker2);
            await api2?.cancelBet(bet2Result.betId);
            warnings.push('Cancelled bet 2 due to bet 1 failure');
          } catch (cancelError) {
            warnings.push('Failed to cancel bet 2 after bet 1 failure - manual intervention required');
          }
        }

        return {
          success: false,
          bet1Result,
          bet2Result,
          error: `Bet placement failed - Bet 1: ${bet1Result.error || 'OK'}, Bet 2: ${bet2Result.error || 'OK'}`,
          warnings
        };
      }

      // Calculate actual profit based on actual odds received
      const actualStake1 = bet1Result.actualStake || stakes.stake1;
      const actualStake2 = bet2Result.actualStake || stakes.stake2;
      const actualOdds1 = bet1Result.actualOdds || opportunity.odds1;
      const actualOdds2 = bet2Result.actualOdds || opportunity.odds2;

      const actualProfit = Math.min(
        actualStake1 * actualOdds1 - actualStake2,
        actualStake2 * actualOdds2 - actualStake1
      );

      if (actualOdds1 !== opportunity.odds1 || actualOdds2 !== opportunity.odds2) {
        warnings.push('Actual odds differed from expected odds');
      }

      return {
        success: true,
        bet1Result,
        bet2Result,
        actualProfit,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings
      };
    }
  }

  private calculateTotalStakeNeeded(): number {
    const config = this.automationEngine.getStatus().config;
    return config.maxStakePerBet;
  }

  private calculateTotalProfit(): number {
    return this.executionHistory
      .filter(result => result.success && result.actualProfit && result.actualProfit > 0)
      .reduce((sum, result) => sum + (result.actualProfit || 0), 0);
  }

  private calculateTotalLosses(): number {
    return this.executionHistory
      .filter(result => result.success && result.actualProfit && result.actualProfit < 0)
      .reduce((sum, result) => sum + (result.actualProfit || 0), 0);
  }

  getExecutionStats(): ExecutionStats {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(r => r.success).length;
    const failed = total - successful;
    
    const totalStaked = this.executionHistory.reduce((sum, r) => sum + r.totalStaked, 0);
    const totalProfit = this.executionHistory
      .filter(r => r.actualProfit !== undefined)
      .reduce((sum, r) => sum + (r.actualProfit || 0), 0);
    
    const avgExecutionTime = total > 0 
      ? this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0) / total 
      : 0;
    
    const avgMarginCaptured = successful > 0
      ? this.executionHistory
          .filter(r => r.success && r.actualProfit)
          .reduce((sum, r) => sum + r.opportunity.margin, 0) / successful
      : 0;

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      totalStaked,
      totalProfit,
      averageExecutionTime: avgExecutionTime,
      successRate: total > 0 ? successful / total : 0,
      avgMarginCaptured
    };
  }

  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AutomatedBetExecutor;