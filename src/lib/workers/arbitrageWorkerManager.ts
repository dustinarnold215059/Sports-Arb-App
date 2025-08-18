/**
 * Arbitrage Worker Manager
 * Manages web workers for high-performance arbitrage calculations
 */

import { ArbitrageOpportunity } from '../arbitrage';

export interface WorkerMessage {
  type: string;
  data?: any;
  id: string;
}

export interface CalculationResult {
  opportunities: ArbitrageOpportunity[];
  calculationTime: number;
  totalCalculationTime?: number;
  gamesProcessed?: number;
  opportunitiesFound?: number;
}

export interface CalculationProgress {
  processed: number;
  total: number;
  percentage: number;
}

export interface WorkerFilters {
  minProfitMargin?: number;
  minGuaranteedProfit?: number;
  maxStakePerBet?: number;
  allowedBookmakers?: string[];
  minBookmakers?: number;
}

export class ArbitrageWorkerManager {
  private static instance: ArbitrageWorkerManager;
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];
  private activeCalculations: Map<string, {
    worker: Worker;
    resolve: (value: CalculationResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: CalculationProgress) => void;
  }> = new Map();
  private maxWorkers: number = 4;
  private workerIndex: number = 0;

  static getInstance(): ArbitrageWorkerManager {
    if (!ArbitrageWorkerManager.instance) {
      ArbitrageWorkerManager.instance = new ArbitrageWorkerManager();
    }
    return ArbitrageWorkerManager.instance;
  }

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Determine optimal number of workers based on CPU cores
    const navigatorConcurrency = (navigator as any).hardwareConcurrency || 4;
    this.maxWorkers = Math.min(Math.max(2, Math.floor(navigatorConcurrency / 2)), 8);

    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker('/workers/arbitrage-worker.js');
    
    worker.addEventListener('message', this.handleWorkerMessage.bind(this));
    worker.addEventListener('error', this.handleWorkerError.bind(this));
    
    this.workers.push(worker);
    this.workerPool.push(worker);
    
    return worker;
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, data, id } = event.data as WorkerMessage;
    const calculation = this.activeCalculations.get(id);
    
    if (!calculation) return;

    switch (type) {
      case 'ARBITRAGE_RESULT':
      case 'BATCH_RESULT':
        calculation.resolve(data);
        this.releaseWorker(calculation.worker);
        this.activeCalculations.delete(id);
        break;
        
      case 'PROGRESS':
        if (calculation.onProgress) {
          calculation.onProgress(data);
        }
        break;
        
      case 'ERROR':
        calculation.reject(new Error(data.error));
        this.releaseWorker(calculation.worker);
        this.activeCalculations.delete(id);
        break;
        
      case 'CALCULATION_CANCELLED':
        calculation.reject(new Error('Calculation cancelled'));
        this.releaseWorker(calculation.worker);
        this.activeCalculations.delete(id);
        break;
        
      case 'HEARTBEAT':
        // Worker health check - could be used for monitoring
        console.debug('Worker heartbeat:', data);
        break;
        
      default:
        console.warn('Unknown worker message type:', type);
    }
  }

  private handleWorkerError(event: ErrorEvent) {
    console.error('Worker error:', event);
    
    // Find and restart the failed worker
    const failedWorkerIndex = this.workers.findIndex(w => w === event.target);
    if (failedWorkerIndex !== -1) {
      this.workers[failedWorkerIndex].terminate();
      this.workers[failedWorkerIndex] = this.createWorker();
    }
  }

  private getAvailableWorker(): Worker | null {
    if (this.workerPool.length > 0) {
      return this.workerPool.pop()!;
    }
    return null;
  }

  private releaseWorker(worker: Worker) {
    if (!this.workerPool.includes(worker)) {
      this.workerPool.push(worker);
    }
  }

  private generateId(): string {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate arbitrage opportunities for a single game
   */
  async calculateArbitrage(
    oddsData: any,
    onProgress?: (progress: CalculationProgress) => void
  ): Promise<CalculationResult> {
    const worker = this.getAvailableWorker();
    if (!worker) {
      throw new Error('No workers available');
    }

    const id = this.generateId();
    
    return new Promise((resolve, reject) => {
      this.activeCalculations.set(id, {
        worker,
        resolve,
        reject,
        onProgress
      });

      worker.postMessage({
        type: 'CALCULATE_ARBITRAGE',
        data: oddsData,
        id
      });

      // Set timeout for the calculation
      setTimeout(() => {
        if (this.activeCalculations.has(id)) {
          this.cancelCalculation(id);
          reject(new Error('Calculation timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Calculate arbitrage opportunities for multiple games in batch
   */
  async batchCalculateArbitrage(
    games: any[],
    filters?: WorkerFilters,
    batchSize: number = 10,
    onProgress?: (progress: CalculationProgress) => void
  ): Promise<CalculationResult> {
    const worker = this.getAvailableWorker();
    if (!worker) {
      throw new Error('No workers available');
    }

    const id = this.generateId();
    
    return new Promise((resolve, reject) => {
      this.activeCalculations.set(id, {
        worker,
        resolve,
        reject,
        onProgress
      });

      worker.postMessage({
        type: 'BATCH_CALCULATE',
        data: {
          games,
          filters,
          batchSize
        },
        id
      });

      // Set longer timeout for batch calculations
      setTimeout(() => {
        if (this.activeCalculations.has(id)) {
          this.cancelCalculation(id);
          reject(new Error('Batch calculation timeout'));
        }
      }, 120000); // 2 minute timeout
    });
  }

  /**
   * Cancel an ongoing calculation
   */
  cancelCalculation(calculationId: string): void {
    const calculation = this.activeCalculations.get(calculationId);
    if (calculation) {
      calculation.worker.postMessage({
        type: 'CANCEL_CALCULATION',
        id: calculationId
      });
    }
  }

  /**
   * Cancel all ongoing calculations
   */
  cancelAllCalculations(): void {
    for (const [id] of this.activeCalculations) {
      this.cancelCalculation(id);
    }
  }

  /**
   * Get worker pool status
   */
  getStatus(): {
    totalWorkers: number;
    availableWorkers: number;
    activeCalculations: number;
    queuedCalculations: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.workerPool.length,
      activeCalculations: this.activeCalculations.size,
      queuedCalculations: 0 // Could implement queue if needed
    };
  }

  /**
   * Warm up workers (pre-load and test)
   */
  async warmUp(): Promise<void> {
    const warmupPromises = this.workers.map(async (worker, index) => {
      return new Promise<void>((resolve) => {
        const id = `warmup_${index}`;
        const timeout = setTimeout(() => resolve(), 1000);
        
        const messageHandler = (event: MessageEvent) => {
          if (event.data.id === id && event.data.type === 'PONG') {
            clearTimeout(timeout);
            worker.removeEventListener('message', messageHandler);
            resolve();
          }
        };
        
        worker.addEventListener('message', messageHandler);
        worker.postMessage({ type: 'PING', id });
      });
    });

    await Promise.all(warmupPromises);
    console.log(`✅ ${this.workers.length} arbitrage workers warmed up`);
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.cancelAllCalculations();
    
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers = [];
    this.workerPool = [];
    this.activeCalculations.clear();
  }

  /**
   * Performance test for workers
   */
  async performanceTest(): Promise<{
    averageCalculationTime: number;
    workersPerformance: number[];
    totalOpportunities: number;
  }> {
    // Generate test data
    const testGame = {
      game: 'Test Game - Lakers vs Warriors',
      outcomes: {
        'DraftKings': {
          'Lakers': 150,
          'Warriors': -180
        },
        'BetMGM': {
          'Lakers': 140,
          'Warriors': -160
        },
        'FanDuel': {
          'Lakers': 160,
          'Warriors': -190
        }
      }
    };

    const testPromises = this.workers.slice(0, Math.min(4, this.workers.length)).map(async (worker, index) => {
      const start = performance.now();
      
      try {
        const result = await this.calculateArbitrage(testGame);
        const time = performance.now() - start;
        
        return {
          workerIndex: index,
          calculationTime: time,
          opportunities: result.opportunities.length
        };
      } catch (error) {
        return {
          workerIndex: index,
          calculationTime: -1,
          opportunities: 0
        };
      }
    });

    const results = await Promise.all(testPromises);
    const validResults = results.filter(r => r.calculationTime > 0);
    
    const averageCalculationTime = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + r.calculationTime, 0) / validResults.length 
      : 0;
    
    const workersPerformance = results.map(r => r.calculationTime);
    const totalOpportunities = results.reduce((sum, r) => sum + r.opportunities, 0);

    return {
      averageCalculationTime,
      workersPerformance,
      totalOpportunities
    };
  }
}

// Export singleton instance
export const arbitrageWorkerManager = ArbitrageWorkerManager.getInstance();

// Utility functions for easier usage
export async function calculateArbitrageOpportunities(
  oddsData: any,
  onProgress?: (progress: CalculationProgress) => void
): Promise<ArbitrageOpportunity[]> {
  const result = await arbitrageWorkerManager.calculateArbitrage(oddsData, onProgress);
  return result.opportunities;
}

export async function batchCalculateArbitrageOpportunities(
  games: any[],
  filters?: WorkerFilters,
  onProgress?: (progress: CalculationProgress) => void
): Promise<ArbitrageOpportunity[]> {
  const result = await arbitrageWorkerManager.batchCalculateArbitrage(games, filters, 10, onProgress);
  return result.allOpportunities || [];
}

// Auto-initialize and warm up workers when module loads
if (typeof window !== 'undefined') {
  // Warm up workers after a short delay to avoid blocking initial page load
  setTimeout(() => {
    arbitrageWorkerManager.warmUp().catch(console.error);
  }, 2000);
  
  // Clean up workers on page unload
  window.addEventListener('beforeunload', () => {
    arbitrageWorkerManager.terminate();
  });
}