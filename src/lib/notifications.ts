/**
 * Real-time Push Notifications System
 * Alert users to profitable arbitrage opportunities and important events
 */

import { ArbitrageOpportunity } from './arbitrage';

export interface NotificationConfig {
  enabled: boolean;
  types: {
    arbitrageOpportunities: boolean;
    betResults: boolean;
    priceAlerts: boolean;
    portfolioMilestones: boolean;
    systemUpdates: boolean;
  };
  thresholds: {
    minProfitMargin: number; // Only notify for opportunities above this %
    minBetAmount: number; // Only for bets above this amount
    maxNotificationsPerHour: number;
  };
  channels: {
    browser: boolean;
    email: boolean;
    sms: boolean;
    discord: boolean;
    telegram: boolean;
  };
  schedule: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
}

export interface NotificationData {
  id: string;
  type: 'arbitrage' | 'bet_result' | 'price_alert' | 'milestone' | 'system' | 'market_update';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  userId: string;
  read: boolean;
  actions?: NotificationAction[];
  expiresAt?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: 'open_calculator' | 'place_bet' | 'view_details' | 'dismiss' | 'snooze';
  data?: any;
}

export interface ArbitrageAlert {
  opportunity: ArbitrageOpportunity;
  profitMargin: number;
  estimatedDuration: number; // minutes
  confidence: number; // 0-1
  marketVolatility: 'low' | 'medium' | 'high';
}

class NotificationManager {
  private static instance: NotificationManager;
  private config: NotificationConfig;
  private subscribers: Set<(notification: NotificationData) => void> = new Set();
  private notificationHistory: NotificationData[] = [];
  private rateLimiter: Map<string, number[]> = new Map(); // userId -> timestamps
  private worker: Worker | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeServiceWorker();
    this.setupRealTimeConnection();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private getDefaultConfig(): NotificationConfig {
    const stored = localStorage.getItem('notification_config');
    if (stored) {
      return JSON.parse(stored);
    }

    return {
      enabled: true,
      types: {
        arbitrageOpportunities: true,
        betResults: true,
        priceAlerts: true,
        portfolioMilestones: true,
        systemUpdates: false
      },
      thresholds: {
        minProfitMargin: 1.0, // 1% minimum
        minBetAmount: 10, // $10 minimum
        maxNotificationsPerHour: 10
      },
      channels: {
        browser: true,
        email: false,
        sms: false,
        discord: false,
        telegram: false
      },
      schedule: {
        enabled: false,
        startTime: '09:00',
        endTime: '22:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-notifications.js');
        console.log('Notification service worker registered:', registration);
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  private setupRealTimeConnection() {
    // In production, this would connect to WebSocket or Server-Sent Events
    // For now, we'll simulate with polling
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkForNewOpportunities();
      }, 30000); // Check every 30 seconds
    }
  }

  private async checkForNewOpportunities() {
    // This would typically fetch from your real-time API
    // For demo purposes, we'll simulate opportunities
    if (this.config.enabled && this.config.types.arbitrageOpportunities) {
      if (Math.random() < 0.1) { // 10% chance per check
        this.simulateArbitrageOpportunity();
      }
    }
  }

  private simulateArbitrageOpportunity() {
    const mockOpportunity: ArbitrageOpportunity = {
      game: 'Lakers vs Warriors',
      team1: 'Lakers',
      team2: 'Warriors',
      totalStake: 1000,
      guaranteedProfit: 45.50,
      profitMargin: 4.55,
      isArbitrage: true,
      totalBookmakers: 2,
      bets: [
        { bookmaker: 'DraftKings', team: 'Lakers', odds: 150, stake: 400, potentialPayout: 1000 },
        { bookmaker: 'BetMGM', team: 'Warriors', odds: -140, stake: 600, potentialPayout: 1028.57 }
      ]
    };

    this.sendArbitrageAlert({
      opportunity: mockOpportunity,
      profitMargin: 4.55,
      estimatedDuration: 15,
      confidence: 0.85,
      marketVolatility: 'medium'
    });
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  subscribe(callback: (notification: NotificationData) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('notification_config', JSON.stringify(this.config));
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  private isWithinSchedule(): boolean {
    if (!this.config.schedule.enabled) return true;

    const now = new Date();
    const start = this.parseTime(this.config.schedule.startTime);
    const end = this.parseTime(this.config.schedule.endTime);
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return currentTime >= start && currentTime <= end;
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const userTimestamps = this.rateLimiter.get(userId) || [];
    const recentNotifications = userTimestamps.filter(ts => ts > hourAgo);
    
    this.rateLimiter.set(userId, recentNotifications);
    
    return recentNotifications.length >= this.config.thresholds.maxNotificationsPerHour;
  }

  private recordNotification(userId: string) {
    const timestamps = this.rateLimiter.get(userId) || [];
    timestamps.push(Date.now());
    this.rateLimiter.set(userId, timestamps);
  }

  async sendArbitrageAlert(alert: ArbitrageAlert, userId: string = 'demo-user'): Promise<void> {
    if (!this.config.enabled || !this.config.types.arbitrageOpportunities) return;
    if (!this.isWithinSchedule()) return;
    if (this.isRateLimited(userId)) return;
    if (alert.profitMargin < this.config.thresholds.minProfitMargin) return;

    const notification: NotificationData = {
      id: this.generateId(),
      type: 'arbitrage',
      title: `🎯 Arbitrage Opportunity: ${alert.profitMargin.toFixed(2)}% Profit!`,
      message: `${alert.opportunity.game} - Guaranteed profit of $${alert.opportunity.guaranteedProfit.toFixed(2)} on $${alert.opportunity.totalStake} stake`,
      data: alert,
      priority: alert.profitMargin > 3 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      userId,
      read: false,
      actions: [
        {
          id: 'open_calculator',
          label: 'Open Calculator',
          action: 'open_calculator',
          data: alert.opportunity
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          action: 'dismiss'
        }
      ],
      expiresAt: new Date(Date.now() + (alert.estimatedDuration * 60 * 1000)).toISOString()
    };

    await this.sendNotification(notification);
  }

  async sendBetResult(
    betId: string, 
    result: 'won' | 'lost', 
    amount: number, 
    profit: number,
    userId: string = 'demo-user'
  ): Promise<void> {
    if (!this.config.enabled || !this.config.types.betResults) return;
    if (amount < this.config.thresholds.minBetAmount) return;

    const notification: NotificationData = {
      id: this.generateId(),
      type: 'bet_result',
      title: result === 'won' ? '🎉 Bet Won!' : '😔 Bet Lost',
      message: result === 'won' 
        ? `Congratulations! You won $${profit.toFixed(2)} on your $${amount.toFixed(2)} bet`
        : `Your bet of $${amount.toFixed(2)} was unsuccessful`,
      data: { betId, result, amount, profit },
      priority: result === 'won' ? 'medium' : 'low',
      timestamp: new Date().toISOString(),
      userId,
      read: false
    };

    await this.sendNotification(notification);
  }

  async sendPortfolioMilestone(
    milestone: string,
    value: number,
    userId: string = 'demo-user'
  ): Promise<void> {
    if (!this.config.enabled || !this.config.types.portfolioMilestones) return;

    const notification: NotificationData = {
      id: this.generateId(),
      type: 'milestone',
      title: `🏆 Milestone Achieved!`,
      message: `${milestone}: $${value.toFixed(2)}`,
      data: { milestone, value },
      priority: 'medium',
      timestamp: new Date().toISOString(),
      userId,
      read: false
    };

    await this.sendNotification(notification);
  }

  async sendPriceAlert(
    game: string,
    bookmaker: string,
    oldOdds: number,
    newOdds: number,
    userId: string = 'demo-user'
  ): Promise<void> {
    if (!this.config.enabled || !this.config.types.priceAlerts) return;

    const change = ((newOdds - oldOdds) / oldOdds) * 100;
    if (Math.abs(change) < 5) return; // Only alert for 5%+ changes

    const notification: NotificationData = {
      id: this.generateId(),
      type: 'price_alert',
      title: `📊 Price Alert: ${game}`,
      message: `${bookmaker} odds changed from ${oldOdds} to ${newOdds} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`,
      data: { game, bookmaker, oldOdds, newOdds, change },
      priority: Math.abs(change) > 10 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      userId,
      read: false
    };

    await this.sendNotification(notification);
  }

  async sendSystemUpdate(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    userId: string = 'demo-user'
  ): Promise<void> {
    if (!this.config.enabled || !this.config.types.systemUpdates) return;

    const notification: NotificationData = {
      id: this.generateId(),
      type: 'system',
      title,
      message,
      priority,
      timestamp: new Date().toISOString(),
      userId,
      read: false
    };

    await this.sendNotification(notification);
  }

  private async sendNotification(notification: NotificationData): Promise<void> {
    this.notificationHistory.push(notification);
    this.recordNotification(notification.userId);

    // Notify all subscribers
    this.subscribers.forEach(callback => callback(notification));

    // Send browser notification if enabled
    if (this.config.channels.browser && 'Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.type,
        data: notification,
        requireInteraction: notification.priority === 'urgent',
        actions: notification.actions?.map(action => ({
          action: action.id,
          title: action.label
        })) || []
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actions?.[0]) {
          this.handleNotificationAction(notification.id, notification.actions[0].action, notification.actions[0].data);
        }
      };
    }

    // In production, you would also send to other channels:
    // - Email via SendGrid/Mailgun
    // - SMS via Twilio
    // - Discord webhook
    // - Telegram bot
    // - Push notifications via FCM/APNS
  }

  handleNotificationAction(notificationId: string, action: string, data?: any) {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (!notification) return;

    switch (action) {
      case 'open_calculator':
        // Navigate to arbitrage calculator with pre-filled data
        window.location.href = '/arbitrage';
        break;
      case 'place_bet':
        // Navigate to betting interface
        console.log('Opening betting interface with:', data);
        break;
      case 'view_details':
        // Open detailed view
        console.log('Opening details for:', data);
        break;
      case 'dismiss':
        this.markAsRead(notificationId);
        break;
      case 'snooze':
        // Snooze for 30 minutes
        setTimeout(() => {
          this.sendNotification({
            ...notification,
            id: this.generateId(),
            timestamp: new Date().toISOString()
          });
        }, 30 * 60 * 1000);
        this.markAsRead(notificationId);
        break;
    }
  }

  markAsRead(notificationId: string): void {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  getNotifications(userId: string, limit: number = 50): NotificationData[] {
    return this.notificationHistory
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getUnreadCount(userId: string): number {
    return this.notificationHistory.filter(n => n.userId === userId && !n.read).length;
  }

  clearAllNotifications(userId: string): void {
    this.notificationHistory = this.notificationHistory.filter(n => n.userId !== userId);
  }

  clearExpiredNotifications(): void {
    const now = new Date();
    this.notificationHistory = this.notificationHistory.filter(n => 
      !n.expiresAt || new Date(n.expiresAt) > now
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Test method for demo purposes
  async sendTestNotification(userId: string = 'demo-user'): Promise<void> {
    const testNotification: NotificationData = {
      id: this.generateId(),
      type: 'system',
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      priority: 'medium',
      timestamp: new Date().toISOString(),
      userId,
      read: false,
      actions: [
        {
          id: 'dismiss',
          label: 'Got it!',
          action: 'dismiss'
        }
      ]
    };

    await this.sendNotification(testNotification);
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Utility functions
export async function initializeNotifications(): Promise<boolean> {
  const permission = await notificationManager.requestPermission();
  if (permission) {
    console.log('✅ Notifications enabled');
  } else {
    console.log('❌ Notifications disabled');
  }
  return permission;
}

export function subscribeToNotifications(callback: (notification: NotificationData) => void): () => void {
  return notificationManager.subscribe(callback);
}

export function updateNotificationSettings(config: Partial<NotificationConfig>): void {
  notificationManager.updateConfig(config);
}

export function getNotificationSettings(): NotificationConfig {
  return notificationManager.getConfig();
}