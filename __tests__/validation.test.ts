/**
 * Comprehensive Test Suite for Input Validation and Security
 * SECURITY: Critical validation functions must be tested thoroughly
 */

import {
  sanitizeInput,
  sanitizeHTML,
  validateNumber,
  validateBetAmount,
  validateOdds,
  validateEmail,
  validateSportKey,
  validateBookmaker,
  validateBetForm,
  validateRateLimit,
  validateAPIResponse,
  generateSecureToken,
  withValidation,
  VALIDATION_PATTERNS,
  ValidationError,
  SecurityError
} from '../../../shared/utils/validation';

describe('Input Sanitization', () => {
  describe('sanitizeInput', () => {
    test('removes dangerous HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe('');
      expect(sanitizeInput('hello<div>world</div>')).toBe('helloworld');
    });

    test('removes JavaScript protocols', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('Javascript:alert(1)')).toBe('alert(1)');
    });

    test('removes event handlers', () => {
      expect(sanitizeInput('onclick=alert(1)')).toBe('');
      expect(sanitizeInput('onload=badFunction()')).toBe('');
      expect(sanitizeInput('ONMOUSEOVER=hack()')).toBe('');
    });

    test('trims whitespace and limits length', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('a'.repeat(1500))).toHaveLength(1000);
    });

    test('handles non-string input gracefully', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
      expect(sanitizeInput({} as any)).toBe('');
    });

    test('preserves safe content', () => {
      expect(sanitizeInput('Hello World!')).toBe('Hello World!');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com');
      expect(sanitizeInput('Lakers vs Warriors')).toBe('Lakers vs Warriors');
    });
  });

  describe('sanitizeHTML', () => {
    test('removes dangerous script tags', () => {
      const malicious = '<p>Safe content</p><script>alert("xss")</script><p>More safe</p>';
      const result = sanitizeHTML(malicious);
      expect(result).toBe('<p>Safe content</p><p>More safe</p>');
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    test('removes iframe tags', () => {
      const malicious = '<p>Content</p><iframe src="evil.com"></iframe><p>More</p>';
      const result = sanitizeHTML(malicious);
      expect(result).toBe('<p>Content</p><p>More</p>');
      expect(result).not.toContain('iframe');
    });

    test('removes JavaScript protocols and event handlers', () => {
      const malicious = '<a href="javascript:alert(1)">Link</a><div onclick="hack()">Text</div>';
      const result = sanitizeHTML(malicious);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick');
    });

    test('preserves safe HTML', () => {
      const safe = '<p>This is <strong>safe</strong> HTML with <em>formatting</em>.</p>';
      expect(sanitizeHTML(safe)).toBe(safe);
    });
  });
});

describe('Number Validation', () => {
  describe('validateNumber', () => {
    test('validates valid numbers', () => {
      expect(validateNumber(123)).toBe(123);
      expect(validateNumber('456')).toBe(456);
      expect(validateNumber(0)).toBe(0);
      expect(validateNumber(-50)).toBe(-50);
      expect(validateNumber(123.45)).toBe(123.45);
    });

    test('validates numbers within range', () => {
      expect(validateNumber(50, 0, 100)).toBe(50);
      expect(validateNumber(0, 0, 100)).toBe(0);
      expect(validateNumber(100, 0, 100)).toBe(100);
    });

    test('throws error for invalid numbers', () => {
      expect(() => validateNumber('abc')).toThrow('Invalid number');
      expect(() => validateNumber(NaN)).toThrow('Invalid number');
      expect(() => validateNumber(Infinity)).toThrow('Invalid number');
      expect(() => validateNumber(null)).toThrow('Invalid number');
      expect(() => validateNumber(undefined)).toThrow('Invalid number');
    });

    test('throws error for numbers outside range', () => {
      expect(() => validateNumber(150, 0, 100)).toThrow('must be between 0 and 100');
      expect(() => validateNumber(-10, 0, 100)).toThrow('must be between 0 and 100');
    });
  });

  describe('validateBetAmount', () => {
    test('validates valid bet amounts', () => {
      expect(validateBetAmount(100)).toBe(100);
      expect(validateBetAmount(0.01)).toBe(0.01);
      expect(validateBetAmount(50000)).toBe(50000);
      expect(validateBetAmount('123.45')).toBe(123.45);
    });

    test('rounds to 2 decimal places', () => {
      expect(validateBetAmount(123.456)).toBe(123.46);
      expect(validateBetAmount(99.999)).toBe(100);
      expect(validateBetAmount(50.001)).toBe(50);
    });

    test('throws error for invalid amounts', () => {
      expect(() => validateBetAmount(0)).toThrow();
      expect(() => validateBetAmount(-100)).toThrow();
      expect(() => validateBetAmount(100001)).toThrow();
    });
  });

  describe('validateOdds', () => {
    test('validates valid American odds', () => {
      expect(validateOdds(-110)).toBe(-110);
      expect(validateOdds(150)).toBe(150);
      expect(validateOdds(-1000)).toBe(-1000);
      expect(validateOdds(5000)).toBe(5000);
    });

    test('throws error for invalid odds', () => {
      expect(() => validateOdds(0)).toThrow('Odds cannot be zero');
      expect(() => validateOdds('abc')).toThrow('Invalid number');
      expect(() => validateOdds(10001)).toThrow('must be between -10000 and 10000');
      expect(() => validateOdds(-10001)).toThrow('must be between -10000 and 10000');
    });
  });
});

describe('Email Validation', () => {
  test('validates correct email formats', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.email@domain.co.uk')).toBe(true);
    expect(validateEmail('user+tag@example.org')).toBe(true);
    expect(validateEmail('a@b.co')).toBe(true);
  });

  test('rejects invalid email formats', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user..double@example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('handles malicious input safely', () => {
    expect(validateEmail('<script>alert(1)</script>@example.com')).toBe(false);
    expect(validateEmail('user@<script>alert(1)</script>.com')).toBe(false);
  });

  test('enforces length limits', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(validateEmail(longEmail)).toBe(false);
  });
});

describe('Sport and Bookmaker Validation', () => {
  describe('validateSportKey', () => {
    test('validates correct sport keys', () => {
      expect(validateSportKey('americanfootball_nfl')).toBe('americanfootball_nfl');
      expect(validateSportKey('basketball_nba')).toBe('basketball_nba');
      expect(validateSportKey('soccer_epl')).toBe('soccer_epl');
    });

    test('throws error for invalid sport keys', () => {
      expect(() => validateSportKey('invalid-sport')).toThrow('Invalid sport key');
      expect(() => validateSportKey('sport with spaces')).toThrow('Invalid sport key');
      expect(() => validateSportKey('<script>alert(1)</script>')).toThrow('Invalid sport key');
      expect(() => validateSportKey('')).toThrow('Invalid sport key');
    });
  });

  describe('validateBookmaker', () => {
    test('validates known bookmakers', () => {
      expect(validateBookmaker('draftkings')).toBe('draftkings');
      expect(validateBookmaker('BETMGM')).toBe('betmgm');
      expect(validateBookmaker('FanDuel')).toBe('fanduel');
    });

    test('throws error for unknown bookmakers', () => {
      expect(() => validateBookmaker('unknown_book')).toThrow('Invalid bookmaker');
      expect(() => validateBookmaker('suspicious-site')).toThrow('Invalid bookmaker');
      expect(() => validateBookmaker('')).toThrow('Invalid bookmaker');
    });
  });
});

describe('Form Validation', () => {
  describe('validateBetForm', () => {
    const validFormData = {
      amount: 100,
      bookmaker1: 'draftkings',
      bookmaker2: 'betmgm',
      odds1: -110,
      odds2: 120,
      sport: 'basketball_nba'
    };

    test('validates correct form data', () => {
      const result = validateBetForm(validFormData);
      expect(result.amount).toBe(100);
      expect(result.bookmaker1).toBe('draftkings');
      expect(result.bookmaker2).toBe('betmgm');
      expect(result.odds1).toBe(-110);
      expect(result.odds2).toBe(120);
      expect(result.sport).toBe('basketball_nba');
    });

    test('throws error for same bookmaker', () => {
      const invalidData = { ...validFormData, bookmaker2: 'draftkings' };
      expect(() => validateBetForm(invalidData)).toThrow('Cannot bet on same bookmaker');
    });

    test('throws error for invalid amounts', () => {
      const invalidData = { ...validFormData, amount: -100 };
      expect(() => validateBetForm(invalidData)).toThrow('Form validation failed');
    });

    test('throws error for invalid odds', () => {
      const invalidData = { ...validFormData, odds1: 0 };
      expect(() => validateBetForm(invalidData)).toThrow('Form validation failed');
    });

    test('handles optional sport field', () => {
      const { sport, ...dataWithoutSport } = validFormData;
      const result = validateBetForm(dataWithoutSport);
      expect(result.sport).toBeUndefined();
    });
  });
});

describe('Rate Limiting', () => {
  test('validates within rate limits', () => {
    expect(validateRateLimit(100, 500)).toBe(true);
    expect(validateRateLimit(0, 500)).toBe(true);
    expect(validateRateLimit(499, 500)).toBe(true);
  });

  test('throws error when rate limit exceeded', () => {
    expect(() => validateRateLimit(500, 500)).toThrow('Rate limit exceeded');
    expect(() => validateRateLimit(600, 500)).toThrow('Rate limit exceeded');
  });

  test('uses default values', () => {
    expect(validateRateLimit(100)).toBe(true);
    expect(() => validateRateLimit(500)).toThrow('Rate limit exceeded');
  });
});

describe('API Response Validation', () => {
  test('validates correct API responses', () => {
    expect(validateAPIResponse({ data: 'valid' })).toBe(true);
    expect(validateAPIResponse({ success: true, data: [] })).toBe(true);
  });

  test('throws error for invalid responses', () => {
    expect(() => validateAPIResponse(null)).toThrow('Invalid API response format');
    expect(() => validateAPIResponse('string')).toThrow('Invalid API response format');
    expect(() => validateAPIResponse(123)).toThrow('Invalid API response format');
  });

  test('throws error for API errors', () => {
    expect(() => validateAPIResponse({ error: 'API Error' })).toThrow('API Error');
    expect(() => validateAPIResponse({ error: 'Rate limit exceeded' })).toThrow('Rate limit exceeded');
  });
});

describe('Security Token Generation', () => {
  test('generates tokens of correct length', () => {
    expect(generateSecureToken(16)).toHaveLength(16);
    expect(generateSecureToken(32)).toHaveLength(32);
    expect(generateSecureToken(64)).toHaveLength(64);
  });

  test('generates unique tokens', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken(32));
    }
    expect(tokens.size).toBe(100); // All should be unique
  });

  test('uses default length', () => {
    expect(generateSecureToken()).toHaveLength(32);
  });

  test('contains only valid characters', () => {
    const token = generateSecureToken(100);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe('Validation Decorator', () => {
  test('returns validated data on success', () => {
    const validator = (data: { value: number }) => {
      if (data.value < 0) throw new Error('Negative value');
      return data;
    };

    const wrappedValidator = withValidation(validator);
    const result = wrappedValidator({ value: 100 });
    expect(result).toEqual({ value: 100 });
  });

  test('returns null on validation error', () => {
    const validator = (data: { value: number }) => {
      if (data.value < 0) throw new Error('Negative value');
      return data;
    };

    const wrappedValidator = withValidation(validator);
    const result = wrappedValidator({ value: -100 });
    expect(result).toBeNull();
  });

  test('calls error handler when provided', () => {
    const errorHandler = jest.fn();
    const validator = (data: { value: number }) => {
      throw new Error('Test error');
    };

    const wrappedValidator = withValidation(validator, errorHandler);
    const result = wrappedValidator({ value: 100 });

    expect(result).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Validation Patterns', () => {
  test('sport key pattern', () => {
    expect(VALIDATION_PATTERNS.sportKey.test('basketball_nba')).toBe(true);
    expect(VALIDATION_PATTERNS.sportKey.test('soccer-epl')).toBe(false);
    expect(VALIDATION_PATTERNS.sportKey.test('sport with spaces')).toBe(false);
  });

  test('email pattern', () => {
    expect(VALIDATION_PATTERNS.email.test('user@example.com')).toBe(true);
    expect(VALIDATION_PATTERNS.email.test('invalid-email')).toBe(false);
  });

  test('amount pattern', () => {
    expect(VALIDATION_PATTERNS.amount.test('123.45')).toBe(true);
    expect(VALIDATION_PATTERNS.amount.test('123')).toBe(true);
    expect(VALIDATION_PATTERNS.amount.test('123.456')).toBe(false);
    expect(VALIDATION_PATTERNS.amount.test('abc')).toBe(false);
  });

  test('odds pattern', () => {
    expect(VALIDATION_PATTERNS.odds.test('-110')).toBe(true);
    expect(VALIDATION_PATTERNS.odds.test('150')).toBe(true);
    expect(VALIDATION_PATTERNS.odds.test('abc')).toBe(false);
  });
});

describe('Error Classes', () => {
  test('ValidationError extends Error correctly', () => {
    const error = new ValidationError('Test message', 'field', 'code');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Test message');
    expect(error.field).toBe('field');
    expect(error.code).toBe('code');
    expect(error.name).toBe('ValidationError');
  });

  test('SecurityError extends Error correctly', () => {
    const error = new SecurityError('Security violation', 'high');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SecurityError);
    expect(error.message).toBe('Security violation');
    expect(error.severity).toBe('high');
    expect(error.name).toBe('SecurityError');
  });

  test('SecurityError uses default severity', () => {
    const error = new SecurityError('Security violation');
    expect(error.severity).toBe('medium');
  });
});

describe('Edge Cases and Security Tests', () => {
  test('handles extremely long input strings', () => {
    const longString = 'a'.repeat(10000);
    const result = sanitizeInput(longString);
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  test('handles special Unicode characters', () => {
    const unicode = 'Hello 👋 World 🌍';
    expect(sanitizeInput(unicode)).toBe(unicode);
  });

  test('prevents prototype pollution attempts', () => {
    const malicious = '__proto__.polluted = true';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('__proto__');
  });

  test('handles null bytes and control characters', () => {
    const malicious = 'normal\x00text\x01here';
    const result = sanitizeInput(malicious);
    expect(result).toBe('normaltexthere');
  });

  test('prevents SQL injection patterns', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const result = sanitizeInput(sqlInjection);
    expect(result).not.toContain('DROP TABLE');
  });
});