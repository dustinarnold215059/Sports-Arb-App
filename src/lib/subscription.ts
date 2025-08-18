/**
 * Premium Subscription System
 * Handles subscription management, billing, and feature access control
 */

export type SubscriptionTier = 'free' | 'premium' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  features: string[];
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number; // percentage
  };
  limits: {
    maxBetsPerMonth: number;
    maxArbitrageAlerts: number;
    apiCallsPerDay: number;
    dataRetentionMonths: number;
    maxNotificationsPerDay: number;
  };
  popular?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface UsageMetrics {
  userId: string;
  month: string;
  betsPlaced: number;
  arbitrageAlertsReceived: number;
  apiCallsMade: number;
  notificationsSent: number;
  premiumFeaturesUsed: string[];
}

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    description: 'Get started with basic sports betting tools',
    features: [
      'Basic arbitrage calculator',
      'Up to 10 bets per month',
      '5 arbitrage alerts per day',
      'Basic portfolio tracking',
      'Email support'
    ],
    pricing: {
      monthly: 0,
      yearly: 0,
      yearlyDiscount: 0
    },
    limits: {
      maxBetsPerMonth: 10,
      maxArbitrageAlerts: 5,
      apiCallsPerDay: 100,
      dataRetentionMonths: 3,
      maxNotificationsPerDay: 10
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    description: 'Perfect for serious bettors',
    features: [
      'Advanced arbitrage calculator',
      'Unlimited bets tracking',
      'Real-time arbitrage alerts',
      'Advanced analytics & ROI tracking',
      'Price movement notifications',
      'Mobile app access',
      'Priority email support',
      '14-day free trial'
    ],
    pricing: {
      monthly: 29.99,
      yearly: 299.99,
      yearlyDiscount: 17 // ~$25/month when paid yearly
    },
    limits: {
      maxBetsPerMonth: -1, // unlimited
      maxArbitrageAlerts: 100,
      apiCallsPerDay: 1000,
      dataRetentionMonths: 12,
      maxNotificationsPerDay: 50
    },
    popular: true
  },
  {
    id: 'pro',
    name: 'Professional',
    tier: 'pro',
    description: 'For professional bettors and syndicates',
    features: [
      'Everything in Premium',
      'API access for custom integrations',
      'Advanced risk management tools',
      'Multi-bookmaker automation',
      'Custom notification webhooks',
      'Dedicated account manager',
      'Phone support',
      'Custom reporting'
    ],
    pricing: {
      monthly: 99.99,
      yearly: 999.99,
      yearlyDiscount: 17
    },
    limits: {
      maxBetsPerMonth: -1,
      maxArbitrageAlerts: -1,
      apiCallsPerDay: 10000,
      dataRetentionMonths: 24,
      maxNotificationsPerDay: -1
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    description: 'Custom solutions for organizations',
    features: [
      'Everything in Professional',
      'White-label solutions',
      'Custom feature development',
      'On-premise deployment options',
      'SLA guarantees',
      'Training and onboarding',
      'Dedicated infrastructure',
      'Custom integrations'
    ],
    pricing: {
      monthly: 499.99,
      yearly: 4999.99,
      yearlyDiscount: 17
    },
    limits: {
      maxBetsPerMonth: -1,
      maxArbitrageAlerts: -1,
      apiCallsPerDay: -1,
      dataRetentionMonths: -1,
      maxNotificationsPerDay: -1
    }
  }
];

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, UserSubscription> = new Map();
  private billingHistory: Map<string, BillingHistory[]> = new Map();
  private usageMetrics: Map<string, UsageMetrics[]> = new Map();

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  constructor() {
    this.loadMockData();
  }

  private loadMockData() {
    // Demo subscription for the demo user
    const demoSubscription: UserSubscription = {
      id: 'sub_demo_001',
      userId: 'demo-user',
      planId: 'premium',
      tier: 'premium',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set('demo-user', demoSubscription);

    // Mock billing history
    const mockBilling: BillingHistory[] = [
      {
        id: 'inv_001',
        subscriptionId: 'sub_demo_001',
        amount: 29.99,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    this.billingHistory.set('demo-user', mockBilling);
  }

  // Subscription Management
  async getSubscription(userId: string): Promise<UserSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  async createSubscription(userId: string, planId: string, billingCycle: BillingCycle): Promise<UserSubscription> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan ID');
    }

    const subscription: UserSubscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      planId,
      tier: plan.tier,
      status: plan.tier === 'free' ? 'active' : 'trialing',
      billingCycle,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      trialEnd: plan.tier !== 'free' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  async updateSubscription(userId: string, updates: Partial<UserSubscription>): Promise<UserSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updated = {
      ...subscription,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  async cancelSubscription(userId: string, immediate: boolean = false): Promise<UserSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updated = {
      ...subscription,
      status: immediate ? 'canceled' as SubscriptionStatus : subscription.status,
      cancelAtPeriodEnd: !immediate,
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  async reactivateSubscription(userId: string): Promise<UserSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updated = {
      ...subscription,
      status: 'active' as SubscriptionStatus,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  // Feature Access Control
  hasFeatureAccess(userTier: SubscriptionTier, feature: string): boolean {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      premium: 1,
      pro: 2,
      enterprise: 3
    };

    const featureRequirements: Record<string, SubscriptionTier> = {
      'advanced_analytics': 'premium',
      'real_time_notifications': 'premium',
      'api_access': 'pro',
      'custom_webhooks': 'pro',
      'phone_support': 'pro',
      'white_label': 'enterprise',
      'custom_development': 'enterprise',
      'unlimited_api': 'enterprise'
    };

    const requiredTier = featureRequirements[feature];
    if (!requiredTier) return true; // Feature doesn't require premium

    return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
  }

  isWithinUsageLimits(userId: string, limitType: keyof SubscriptionPlan['limits']): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return false;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
    if (!plan) return false;

    const limit = plan.limits[limitType];
    if (limit === -1) return true; // Unlimited

    // Get current usage (mock implementation)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = this.usageMetrics.get(userId)?.find(u => u.month === currentMonth);
    
    if (!usage) return true; // No usage yet

    switch (limitType) {
      case 'maxBetsPerMonth':
        return usage.betsPlaced < limit;
      case 'maxArbitrageAlerts':
        return usage.arbitrageAlertsReceived < limit;
      case 'apiCallsPerDay':
        return usage.apiCallsMade < limit;
      case 'maxNotificationsPerDay':
        return usage.notificationsSent < limit;
      default:
        return true;
    }
  }

  // Billing
  async getBillingHistory(userId: string): Promise<BillingHistory[]> {
    return this.billingHistory.get(userId) || [];
  }

  async createInvoice(userId: string, amount: number): Promise<BillingHistory> {
    const invoice: BillingHistory = {
      id: `inv_${Date.now()}`,
      subscriptionId: this.subscriptions.get(userId)?.id || '',
      amount,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const history = this.billingHistory.get(userId) || [];
    history.push(invoice);
    this.billingHistory.set(userId, history);

    return invoice;
  }

  async processPayment(invoiceId: string, userId: string): Promise<boolean> {
    const history = this.billingHistory.get(userId) || [];
    const invoice = history.find(h => h.id === invoiceId);
    
    if (!invoice) return false;

    // Simulate payment processing
    const success = Math.random() > 0.1; // 90% success rate

    invoice.status = success ? 'paid' : 'failed';
    if (success) {
      invoice.paidAt = new Date().toISOString();
    }

    this.billingHistory.set(userId, history);
    return success;
  }

  // Usage Tracking
  recordUsage(userId: string, type: keyof UsageMetrics, amount: number = 1): void {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const userMetrics = this.usageMetrics.get(userId) || [];
    
    let monthlyMetrics = userMetrics.find(m => m.month === currentMonth);
    if (!monthlyMetrics) {
      monthlyMetrics = {
        userId,
        month: currentMonth,
        betsPlaced: 0,
        arbitrageAlertsReceived: 0,
        apiCallsMade: 0,
        notificationsSent: 0,
        premiumFeaturesUsed: []
      };
      userMetrics.push(monthlyMetrics);
    }

    if (typeof monthlyMetrics[type] === 'number') {
      (monthlyMetrics[type] as number) += amount;
    }

    this.usageMetrics.set(userId, userMetrics);
  }

  getUsageMetrics(userId: string, month?: string): UsageMetrics | null {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const userMetrics = this.usageMetrics.get(userId) || [];
    return userMetrics.find(m => m.month === targetMonth) || null;
  }

  // Plan Information
  getPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS.find(p => p.id === planId) || null;
  }

  getAllPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  calculateDiscount(planId: string, billingCycle: BillingCycle): number {
    const plan = this.getPlan(planId);
    if (!plan || billingCycle === 'monthly') return 0;

    const monthlyTotal = plan.pricing.monthly * 12;
    const yearlyPrice = plan.pricing.yearly;
    return monthlyTotal - yearlyPrice;
  }

  // Trial Management
  isInTrial(userId: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return false;

    return subscription.status === 'trialing' && 
           subscription.trialEnd &&
           new Date(subscription.trialEnd) > new Date();
  }

  getTrialDaysRemaining(userId: string): number {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.trialEnd) return 0;

    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diffInMs = trialEnd.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffInDays);
  }

  // Upgrade/Downgrade
  async changePlan(userId: string, newPlanId: string, billingCycle: BillingCycle): Promise<UserSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) {
      throw new Error('Invalid plan ID');
    }

    // Calculate prorated amount (simplified)
    const currentPlan = this.getPlan(subscription.planId);
    if (currentPlan) {
      const proratedAmount = this.calculateProration(subscription, newPlan, billingCycle);
      if (proratedAmount > 0) {
        await this.createInvoice(userId, proratedAmount);
      }
    }

    const updated = {
      ...subscription,
      planId: newPlanId,
      tier: newPlan.tier,
      billingCycle,
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  private calculateProration(subscription: UserSubscription, newPlan: SubscriptionPlan, billingCycle: BillingCycle): number {
    // Simplified proration calculation
    const currentPlan = this.getPlan(subscription.planId);
    if (!currentPlan) return 0;

    const newPrice = billingCycle === 'monthly' ? newPlan.pricing.monthly : newPlan.pricing.yearly;
    const currentPrice = subscription.billingCycle === 'monthly' ? currentPlan.pricing.monthly : currentPlan.pricing.yearly;

    return Math.max(0, newPrice - currentPrice);
  }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManager.getInstance();

// Utility functions
export function getSubscriptionStatus(subscription: UserSubscription | null): {
  isActive: boolean;
  isPremium: boolean;
  tier: SubscriptionTier;
  status: string;
} {
  if (!subscription) {
    return {
      isActive: false,
      isPremium: false,
      tier: 'free',
      status: 'No subscription'
    };
  }

  const isActive = ['active', 'trialing'].includes(subscription.status);
  const isPremium = subscription.tier !== 'free';

  let status = subscription.status;
  if (subscription.status === 'trialing') {
    const manager = SubscriptionManager.getInstance();
    const daysRemaining = manager.getTrialDaysRemaining(subscription.userId);
    status = `Trial (${daysRemaining} days left)`;
  }

  return {
    isActive,
    isPremium,
    tier: subscription.tier,
    status
  };
}

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function calculateSavings(plan: SubscriptionPlan): string {
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlyPrice = plan.pricing.yearly;
  const savings = monthlyTotal - yearlyPrice;
  
  return formatPrice(savings);
}