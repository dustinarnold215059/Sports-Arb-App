import { z, ZodSchema, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate request body against Zod schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(body);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    
    return {
      success: false,
      errors: ['Invalid request data']
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  query: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  return validateRequestBody(query, schema);
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }),

  // ID parameter
  id: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  // Search query
  search: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
    category: z.string().optional(),
    sort: z.enum(['relevance', 'date', 'name']).optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, 'Start date must be before end date'),

  // Email validation
  email: z.string().email('Invalid email address'),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Username validation
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),

  // Phone number validation
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // File upload validation
  file: z.object({
    name: z.string().min(1, 'File name is required'),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
    type: z.string().min(1, 'File type is required')
  })
};

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove < and > characters
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize HTML input (basic)
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize<T>(
  data: unknown,
  schema: ZodSchema<T>,
  sanitize: boolean = true
): ValidationResult<T> {
  if (sanitize && typeof data === 'object' && data !== null) {
    // Recursively sanitize string fields
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    data = sanitizeObject(data);
  }

  return validateRequestBody(data, schema);
}

/**
 * Create API response validator
 */
export function createApiResponseValidator<T>(dataSchema: ZodSchema<T>) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.date().optional()
  });
}