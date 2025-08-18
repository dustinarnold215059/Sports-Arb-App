/**
 * Comprehensive input validation and sanitization utilities
 * SECURITY: Protects against XSS, injection attacks, and invalid data
 */

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000); // Limit length
};

// Sanitize HTML content
export const sanitizeHTML = (html: string): string => {
  if (typeof html !== 'string') return '';
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Number validation
export const validateNumber = (value: any, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`Invalid number: ${value}`);
  }
  if (num < min || num > max) {
    throw new Error(`Number ${num} must be between ${min} and ${max}`);
  }
  return num;
};

// Betting amount validation
export const validateBetAmount = (amount: any): number => {
  const betAmount = validateNumber(amount, 0.01, 100000);
  
  // Round to 2 decimal places
  return Math.round(betAmount * 100) / 100;
};

// Odds validation
export const validateOdds = (odds: any): number => {
  const oddsValue = validateNumber(odds, -10000, 10000);
  
  if (oddsValue === 0) {
    throw new Error('Odds cannot be zero');
  }
  
  return oddsValue;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const sanitized = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) && sanitized.length <= 254;
};

// Sport key validation
export const validateSportKey = (sportKey: string): string => {
  const sanitized = sanitizeInput(sportKey);
  const validPattern = /^[a-zA-Z0-9_]+$/;
  
  if (!validPattern.test(sanitized)) {
    throw new Error(`Invalid sport key: ${sportKey}`);
  }
  
  return sanitized;
};

// Bookmaker validation
export const validateBookmaker = (bookmaker: string): string => {
  const sanitized = sanitizeInput(bookmaker);
  const validBookmakers = [
    'draftkings', 'betmgm', 'fanduel', 'caesars', 
    'pointsbet', 'betrivers', 'williamhill_us', 
    'barstool', 'betway', 'unibet'
  ];
  
  if (!validBookmakers.includes(sanitized.toLowerCase())) {
    throw new Error(`Invalid bookmaker: ${bookmaker}`);
  }
  
  return sanitized.toLowerCase();
};

// Form data validation
export interface BetFormData {
  amount: number;
  bookmaker1: string;
  bookmaker2: string;
  odds1: number;
  odds2: number;
  sport?: string;
}

export const validateBetForm = (data: any): BetFormData => {
  const errors: string[] = [];
  
  try {
    const amount = validateBetAmount(data.amount);
    const bookmaker1 = validateBookmaker(data.bookmaker1);
    const bookmaker2 = validateBookmaker(data.bookmaker2);
    const odds1 = validateOdds(data.odds1);
    const odds2 = validateOdds(data.odds2);
    
    if (bookmaker1 === bookmaker2) {
      errors.push('Cannot bet on same bookmaker for arbitrage');
    }
    
    const sport = data.sport ? validateSportKey(data.sport) : undefined;
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return {
      amount,
      bookmaker1,
      bookmaker2,
      odds1,
      odds2,
      sport
    };
  } catch (error) {
    throw new Error(`Form validation failed: ${error.message}`);
  }
};

// Rate limiting validation
export const validateRateLimit = (
  requestCount: number, 
  maxRequests: number = 500,
  timeWindow: string = '24h'
): boolean => {
  if (requestCount >= maxRequests) {
    throw new Error(`Rate limit exceeded: ${requestCount}/${maxRequests} requests in ${timeWindow}`);
  }
  return true;
};

// API response validation
export const validateAPIResponse = (response: any): boolean => {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response format');
  }
  
  if (response.error) {
    throw new Error(`API Error: ${response.error}`);
  }
  
  return true;
};

// Secure random string generation
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Input validation decorator for React components
export const withValidation = <T extends Record<string, any>>(
  validator: (data: T) => T,
  onError?: (error: Error) => void
) => {
  return (data: T): T | null => {
    try {
      return validator(data);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error('Validation error:', error);
      }
      return null;
    }
  };
};

// Common validation patterns
export const VALIDATION_PATTERNS = {
  sportKey: /^[a-zA-Z0-9_]+$/,
  bookmaker: /^[a-zA-Z0-9_]+$/,
  amount: /^\d+(\.\d{1,2})?$/,
  odds: /^-?\d+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/
} as const;

// Validation error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string, public severity: 'low' | 'medium' | 'high' = 'medium') {
    super(message);
    this.name = 'SecurityError';
  }
}