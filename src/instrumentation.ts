import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry configuration
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        Sentry.prismaIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Debug
      debug: false,
      environment: process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry configuration
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Debug
      debug: false,
      environment: process.env.NODE_ENV,
    });
  }
}

// Required for request error instrumentation
export const onRequestError = Sentry.captureRequestError;