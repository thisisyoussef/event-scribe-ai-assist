/**
 * Security utility functions for input validation and sanitization
 */

/**
 * Validates event slug format
 * @param slug - The event slug to validate
 * @returns true if valid, false otherwise
 */
export const validateEventSlug = (slug: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length >= 3 && slug.length <= 100;
};

/**
 * Sanitizes user input to prevent XSS and SQL injection
 * @param input - The input string to sanitize
 * @returns Sanitized input string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['";\\]/g, '') // Remove potential SQL injection characters
    .trim();
};

/**
 * Validates phone number format
 * @param phone - The phone number to validate
 * @returns true if valid, false otherwise
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Normalize phone number to E.164 format
  const digits = phone.replace(/[^\d+]/g, '');
  let normalizedPhone: string;

  if (digits.startsWith('+')) {
    normalizedPhone = digits;
  } else if (/^1\d{10}$/.test(digits)) {
    normalizedPhone = `+${digits}`;
  } else if (/^\d{10}$/.test(digits)) {
    normalizedPhone = `+1${digits}`;
  } else {
    normalizedPhone = `+${digits}`;
  }

  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  return phoneRegex.test(normalizedPhone);
};

/**
 * Validates name format
 * @param name - The name to validate
 * @returns true if valid, false otherwise
 */
export const validateName = (name: string): boolean => {
  return /^[a-zA-Z\s\-'.,]+$/.test(name) && name.length >= 2 && name.length <= 100;
};

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier for the request (e.g., IP address)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requestData = this.requests.get(key);

    if (!requestData || now > requestData.resetTime) {
      // First request or window expired
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (requestData.count >= this.maxRequests) {
      return false;
    }

    requestData.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   * @param key - Unique identifier for the request
   * @returns Number of remaining requests
   */
  getRemainingRequests(key: string): number {
    const requestData = this.requests.get(key);
    if (!requestData || Date.now() > requestData.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - requestData.count);
  }
}

// Export a default rate limiter instance
export const rateLimiter = new RateLimiter();
