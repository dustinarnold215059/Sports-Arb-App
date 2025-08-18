export interface Algorithm {
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    username: string;
    rating: number;
    verified: boolean;
  };
  category: 'arbitrage' | 'value_betting' | 'risk_management' | 'analytics' | 'optimization';
  version: string;
  price: number; // 0 for free algorithms
  currency: 'USD' | 'credits';
  
  // Performance metrics
  metrics: {
    successRate: number;
    avgMargin: number;
    totalOpportunities: number;
    avgExecutionTime: number;
    riskScore: number;
  };
  
  // Ratings and reviews
  rating: number;
  reviewCount: number;
  downloads: number;
  
  // Technical details
  supportedSports: string[];
  supportedBookmakers: string[];
  apiVersion: string;
  lastUpdated: Date;
  
  // Access control
  isPublic: boolean;
  requiresApproval: boolean;
  subscriptionOnly: boolean;
  
  // Algorithm metadata
  tags: string[];
  documentation: string;
  changelog: string[];
  
  // Code/configuration
  algorithm: {
    type: 'javascript' | 'python' | 'config';
    code?: string;
    config?: any;
    dependencies?: string[];
  };
}

export interface AlgorithmReview {
  id: string;
  algorithmId: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  pros: string[];
  cons: string[];
  createdAt: Date;
  helpful: number;
}

export interface Purchase {
  id: string;
  userId: string;
  algorithmId: string;
  price: number;
  currency: 'USD' | 'credits';
  purchasedAt: Date;
  license: 'personal' | 'commercial' | 'enterprise';
  status: 'active' | 'expired' | 'refunded';
}

export interface MarketplaceStats {
  totalAlgorithms: number;
  totalAuthors: number;
  totalDownloads: number;
  totalRevenue: number;
  featuredAlgorithm: Algorithm;
  topCategories: { category: string; count: number }[];
  recentAlgorithms: Algorithm[];
}

export class AlgorithmMarketplace {
  private algorithms: Map<string, Algorithm> = new Map();
  private reviews: Map<string, AlgorithmReview[]> = new Map();
  private purchases: Map<string, Purchase[]> = new Map();
  private userCredits: Map<string, number> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Add some sample algorithms
    const sampleAlgorithms: Algorithm[] = [
      {
        id: 'algo_001',
        name: 'Lightning Arbitrage Detector',
        description: 'Ultra-fast arbitrage detection using machine learning to identify opportunities within milliseconds. Optimized for high-frequency trading with advanced filtering.',
        author: {
          id: 'user_001',
          username: 'ArbitrageKing',
          rating: 4.8,
          verified: true
        },
        category: 'arbitrage',
        version: '2.1.0',
        price: 299,
        currency: 'USD',
        metrics: {
          successRate: 94.2,
          avgMargin: 3.8,
          totalOpportunities: 15420,
          avgExecutionTime: 247,
          riskScore: 2.1
        },
        rating: 4.7,
        reviewCount: 156,
        downloads: 2340,
        supportedSports: ['basketball', 'football', 'baseball', 'hockey'],
        supportedBookmakers: ['draftkings', 'betmgm', 'fanduel', 'caesars'],
        apiVersion: '1.0',
        lastUpdated: new Date('2024-01-15'),
        isPublic: true,
        requiresApproval: false,
        subscriptionOnly: false,
        tags: ['fast', 'ml', 'high-frequency', 'profitable'],
        documentation: 'Complete documentation with examples and best practices.',
        changelog: ['v2.1.0: Improved ML model accuracy', 'v2.0.0: Added machine learning detection'],
        algorithm: {
          type: 'javascript',
          code: `
// Lightning Arbitrage Detector v2.1.0
class LightningDetector {
  constructor(config) {
    this.config = config;
    this.mlModel = new ArbitrageMLModel();
  }

  async detectOpportunities(odds) {
    const opportunities = [];
    
    for (const game of odds) {
      const margin = this.calculateMargin(game);
      if (margin > this.config.minMargin) {
        const confidence = await this.mlModel.predict(game);
        if (confidence > this.config.minConfidence) {
          opportunities.push({
            game,
            margin,
            confidence,
            expiry: this.calculateExpiry(game)
          });
        }
      }
    }
    
    return opportunities.sort((a, b) => b.margin - a.margin);
  }
}`,
          dependencies: ['ml-matrix', 'fast-csv']
        }
      },
      {
        id: 'algo_002',
        name: 'Smart Risk Manager',
        description: 'Advanced risk management system with Kelly Criterion optimization and dynamic bankroll management. Prevents overexposure and maximizes long-term profits.',
        author: {
          id: 'user_002',
          username: 'RiskMaster',
          rating: 4.9,
          verified: true
        },
        category: 'risk_management',
        version: '1.5.2',
        price: 0,
        currency: 'USD',
        metrics: {
          successRate: 89.7,
          avgMargin: 2.1,
          totalOpportunities: 8200,
          avgExecutionTime: 150,
          riskScore: 1.2
        },
        rating: 4.8,
        reviewCount: 89,
        downloads: 5670,
        supportedSports: ['all'],
        supportedBookmakers: ['all'],
        apiVersion: '1.0',
        lastUpdated: new Date('2024-01-10'),
        isPublic: true,
        requiresApproval: false,
        subscriptionOnly: false,
        tags: ['free', 'kelly-criterion', 'bankroll', 'conservative'],
        documentation: 'Comprehensive guide to risk management in sports betting.',
        changelog: ['v1.5.2: Bug fixes and performance improvements', 'v1.5.0: Added Kelly Criterion'],
        algorithm: {
          type: 'javascript',
          code: `
// Smart Risk Manager v1.5.2
class SmartRiskManager {
  constructor(config) {
    this.config = config;
    this.history = [];
  }

  calculateOptimalStake(opportunity, bankroll) {
    const kellyFraction = this.calculateKellyFraction(opportunity);
    const maxStake = bankroll * this.config.maxBankrollPercent;
    
    return Math.min(
      kellyFraction * bankroll,
      maxStake,
      this.config.maxStakePerBet
    );
  }
}`,
          dependencies: ['mathjs']
        }
      },
      {
        id: 'algo_003',
        name: 'Multi-Sport Value Finder',
        description: 'Comprehensive value betting algorithm covering 15+ sports with advanced statistical modeling and line movement prediction.',
        author: {
          id: 'user_003',
          username: 'ValueHunter',
          rating: 4.6,
          verified: false
        },
        category: 'value_betting',
        version: '3.0.1',
        price: 150,
        currency: 'credits',
        metrics: {
          successRate: 91.5,
          avgMargin: 4.2,
          totalOpportunities: 12100,
          avgExecutionTime: 380,
          riskScore: 2.8
        },
        rating: 4.5,
        reviewCount: 234,
        downloads: 1890,
        supportedSports: ['basketball', 'football', 'baseball', 'hockey', 'soccer', 'tennis'],
        supportedBookmakers: ['draftkings', 'betmgm', 'fanduel', 'pointsbet'],
        apiVersion: '1.0',
        lastUpdated: new Date('2024-01-08'),
        isPublic: true,
        requiresApproval: true,
        subscriptionOnly: false,
        tags: ['value-betting', 'multi-sport', 'statistical', 'advanced'],
        documentation: 'Advanced statistical modeling documentation included.',
        changelog: ['v3.0.1: Fixed soccer odds parsing', 'v3.0.0: Added 5 new sports'],
        algorithm: {
          type: 'python',
          code: `
# Multi-Sport Value Finder v3.0.1
import numpy as np
import pandas as pd

class ValueFinder:
    def __init__(self, config):
        self.config = config
        self.models = {}
    
    def find_value_bets(self, odds_data):
        value_bets = []
        
        for sport in self.config['sports']:
            model = self.models.get(sport)
            if model:
                sport_odds = odds_data[odds_data['sport'] == sport]
                predictions = model.predict(sport_odds)
                
                for i, pred in enumerate predictions):
                    if pred['edge'] > self.config['min_edge']:
                        value_bets.append(pred)
        
        return sorted(value_bets, key=lambda x: x['edge'], reverse=True)`,
          dependencies: ['numpy', 'pandas', 'scikit-learn']
        }
      }
    ];

    sampleAlgorithms.forEach(algo => {
      this.algorithms.set(algo.id, algo);
    });

    // Add sample reviews
    this.reviews.set('algo_001', [
      {
        id: 'review_001',
        algorithmId: 'algo_001',
        userId: 'user_101',
        username: 'BettingPro',
        rating: 5,
        comment: 'Incredible speed and accuracy. Made back the investment in the first week!',
        pros: ['Very fast', 'High accuracy', 'Great documentation'],
        cons: ['Expensive', 'Complex setup'],
        createdAt: new Date('2024-01-12'),
        helpful: 45
      }
    ]);

    // Initialize user credits
    this.userCredits.set('user_001', 1000);
  }

  // Algorithm browsing and discovery
  async getAlgorithms(filters?: {
    category?: string;
    priceRange?: { min: number; max: number };
    rating?: number;
    freeOnly?: boolean;
    sport?: string;
    bookmaker?: string;
  }): Promise<Algorithm[]> {
    let algorithms = Array.from(this.algorithms.values()).filter(algo => algo.isPublic);

    if (filters) {
      if (filters.category) {
        algorithms = algorithms.filter(algo => algo.category === filters.category);
      }
      if (filters.priceRange) {
        algorithms = algorithms.filter(algo => 
          algo.price >= filters.priceRange!.min && 
          algo.price <= filters.priceRange!.max
        );
      }
      if (filters.rating) {
        algorithms = algorithms.filter(algo => algo.rating >= filters.rating!);
      }
      if (filters.freeOnly) {
        algorithms = algorithms.filter(algo => algo.price === 0);
      }
      if (filters.sport) {
        algorithms = algorithms.filter(algo => 
          algo.supportedSports.includes(filters.sport!) || 
          algo.supportedSports.includes('all')
        );
      }
      if (filters.bookmaker) {
        algorithms = algorithms.filter(algo => 
          algo.supportedBookmakers.includes(filters.bookmaker!) || 
          algo.supportedBookmakers.includes('all')
        );
      }
    }

    return algorithms.sort((a, b) => b.rating - a.rating);
  }

  async getAlgorithm(id: string): Promise<Algorithm | null> {
    return this.algorithms.get(id) || null;
  }

  async getFeaturedAlgorithms(): Promise<Algorithm[]> {
    return Array.from(this.algorithms.values())
      .filter(algo => algo.isPublic)
      .sort((a, b) => b.rating * b.downloads - a.rating * a.downloads)
      .slice(0, 6);
  }

  async getAlgorithmsByAuthor(authorId: string): Promise<Algorithm[]> {
    return Array.from(this.algorithms.values())
      .filter(algo => algo.author.id === authorId && algo.isPublic);
  }

  // Algorithm reviews
  async getReviews(algorithmId: string): Promise<AlgorithmReview[]> {
    return this.reviews.get(algorithmId) || [];
  }

  async addReview(review: Omit<AlgorithmReview, 'id' | 'createdAt' | 'helpful'>): Promise<AlgorithmReview> {
    const newReview: AlgorithmReview = {
      ...review,
      id: `review_${Date.now()}`,
      createdAt: new Date(),
      helpful: 0
    };

    const algorithmReviews = this.reviews.get(review.algorithmId) || [];
    algorithmReviews.push(newReview);
    this.reviews.set(review.algorithmId, algorithmReviews);

    // Update algorithm rating
    await this.updateAlgorithmRating(review.algorithmId);

    return newReview;
  }

  private async updateAlgorithmRating(algorithmId: string): Promise<void> {
    const algorithm = this.algorithms.get(algorithmId);
    const reviews = this.reviews.get(algorithmId) || [];

    if (algorithm && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      algorithm.rating = Math.round(avgRating * 10) / 10;
      algorithm.reviewCount = reviews.length;
    }
  }

  // Purchase and access management
  async purchaseAlgorithm(
    userId: string, 
    algorithmId: string, 
    license: 'personal' | 'commercial' | 'enterprise' = 'personal'
  ): Promise<Purchase> {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error('Algorithm not found');
    }

    // Check if user already owns this algorithm
    const userPurchases = this.purchases.get(userId) || [];
    const existingPurchase = userPurchases.find(p => 
      p.algorithmId === algorithmId && p.status === 'active'
    );
    
    if (existingPurchase) {
      throw new Error('Algorithm already purchased');
    }

    // Handle payment
    if (algorithm.price > 0) {
      if (algorithm.currency === 'credits') {
        const userCredits = this.userCredits.get(userId) || 0;
        if (userCredits < algorithm.price) {
          throw new Error('Insufficient credits');
        }
        this.userCredits.set(userId, userCredits - algorithm.price);
      }
      // For USD payments, would integrate with payment processor
    }

    const purchase: Purchase = {
      id: `purchase_${Date.now()}`,
      userId,
      algorithmId,
      price: algorithm.price,
      currency: algorithm.currency,
      purchasedAt: new Date(),
      license,
      status: 'active'
    };

    userPurchases.push(purchase);
    this.purchases.set(userId, userPurchases);

    // Update download count
    algorithm.downloads++;

    return purchase;
  }

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return this.purchases.get(userId) || [];
  }

  async hasAccess(userId: string, algorithmId: string): Promise<boolean> {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) return false;

    // Free algorithms are accessible to everyone
    if (algorithm.price === 0) return true;

    // Check if user has purchased the algorithm
    const userPurchases = this.purchases.get(userId) || [];
    return userPurchases.some(p => 
      p.algorithmId === algorithmId && p.status === 'active'
    );
  }

  // Algorithm publishing (for developers)
  async publishAlgorithm(algorithm: Omit<Algorithm, 'id' | 'lastUpdated' | 'downloads' | 'rating' | 'reviewCount'>): Promise<Algorithm> {
    const newAlgorithm: Algorithm = {
      ...algorithm,
      id: `algo_${Date.now()}`,
      lastUpdated: new Date(),
      downloads: 0,
      rating: 0,
      reviewCount: 0
    };

    this.algorithms.set(newAlgorithm.id, newAlgorithm);
    return newAlgorithm;
  }

  async updateAlgorithm(id: string, updates: Partial<Algorithm>): Promise<Algorithm | null> {
    const algorithm = this.algorithms.get(id);
    if (!algorithm) return null;

    const updatedAlgorithm = {
      ...algorithm,
      ...updates,
      lastUpdated: new Date()
    };

    this.algorithms.set(id, updatedAlgorithm);
    return updatedAlgorithm;
  }

  // Marketplace statistics
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    const algorithms = Array.from(this.algorithms.values()).filter(algo => algo.isPublic);
    const authors = new Set(algorithms.map(algo => algo.author.id));
    const totalDownloads = algorithms.reduce((sum, algo) => sum + algo.downloads, 0);
    const totalRevenue = algorithms.reduce((sum, algo) => sum + (algo.price * algo.downloads), 0);

    const categoryCounts: { [key: string]: number } = {};
    algorithms.forEach(algo => {
      categoryCounts[algo.category] = (categoryCounts[algo.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const featuredAlgorithm = algorithms
      .sort((a, b) => b.rating * b.downloads - a.rating * a.downloads)[0];

    const recentAlgorithms = algorithms
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 5);

    return {
      totalAlgorithms: algorithms.length,
      totalAuthors: authors.size,
      totalDownloads,
      totalRevenue,
      featuredAlgorithm,
      topCategories,
      recentAlgorithms
    };
  }

  // Credit system
  async getUserCredits(userId: string): Promise<number> {
    return this.userCredits.get(userId) || 0;
  }

  async addCredits(userId: string, amount: number): Promise<number> {
    const currentCredits = this.userCredits.get(userId) || 0;
    const newBalance = currentCredits + amount;
    this.userCredits.set(userId, newBalance);
    return newBalance;
  }

  // Search functionality
  async searchAlgorithms(query: string): Promise<Algorithm[]> {
    const searchTerms = query.toLowerCase().split(' ');
    
    return Array.from(this.algorithms.values())
      .filter(algo => algo.isPublic)
      .filter(algo => {
        const searchableText = [
          algo.name,
          algo.description,
          algo.author.username,
          ...algo.tags,
          ...algo.supportedSports,
          algo.category
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      })
      .sort((a, b) => b.rating - a.rating);
  }
}

export default AlgorithmMarketplace;