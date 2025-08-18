import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

class PerformanceMonitor {
  private metrics: WebVitalMetric[] = [];

  init() {
    if (typeof window === 'undefined') return;

    // Collect Core Web Vitals
    onCLS((metric) => this.handleMetric(metric));
    onINP((metric) => this.handleMetric(metric)); // INP replaced FID in newer versions
    onFCP((metric) => this.handleMetric(metric));
    onLCP((metric) => this.handleMetric(metric));
    onTTFB((metric) => this.handleMetric(metric));

    // Send metrics on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics();
      }
    });

    // Send metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
  }

  private handleMetric(metric: { name: string; value: number; delta: number; id: string; navigationType?: string }) {
    const webVitalMetric: WebVitalMetric = {
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown'
    };

    this.metrics.push(webVitalMetric);

    // Send to Sentry for performance monitoring
    Sentry.addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value}`,
      level: 'info',
      data: webVitalMetric
    });

    // Set Sentry metric
    Sentry.setMeasurement(metric.name, metric.value, 'millisecond');

    console.log('Web Vital:', webVitalMetric);
  }

  private async sendMetrics() {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.metrics,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });

      this.metrics = []; // Clear sent metrics
    } catch (error) {
      console.error('Failed to send web vitals:', error);
      Sentry.captureException(error);
    }
  }

  // Manual tracking for custom metrics
  trackCustomMetric(name: string, value: number, unit = 'millisecond') {
    Sentry.setMeasurement(name, value, unit);
    
    console.log(`Custom Metric - ${name}: ${value}${unit}`);
    
    // Send to analytics endpoint
    fetch('/api/analytics/custom-metric', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value,
        unit,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }),
    }).catch(error => {
      console.error('Failed to send custom metric:', error);
    });
  }

  // Track user interactions
  trackUserAction(action: string, details?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      level: 'info',
      data: details
    });

    console.log('User Action:', action, details);
  }

  // Track API call performance
  trackApiCall(endpoint: string, duration: number, status: number) {
    const metric = {
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString()
    };

    Sentry.addBreadcrumb({
      category: 'api-call',
      message: `${endpoint}: ${duration}ms (${status})`,
      level: status >= 400 ? 'error' : 'info',
      data: metric
    });

    // Track as custom metric
    this.trackCustomMetric(`api.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.duration`, duration);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Error boundary for tracking errors
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  console.error('Application Error:', error, context);
  
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('error_context', context);
    }
    Sentry.captureException(error);
  });
};

// Track page views
export const trackPageView = (page: string, properties?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Page view: ${page}`,
    level: 'info',
    data: properties
  });

  console.log('Page View:', page, properties);
};