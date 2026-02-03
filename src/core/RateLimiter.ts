/**
 * Token Bucket Rate Limiter Implementation
 * ISO/IEC 25010 compliant - Security, Reliability
 *
 * Prevents DoS attacks by limiting request rates.
 * Uses token bucket algorithm for smooth rate limiting.
 *
 * Refs: OWASP API4:2023 (Unrestricted Resource Consumption)
 */

import { EventEmitter } from 'events';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum tokens in the bucket (burst capacity) */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Interval between refills in milliseconds */
  refillInterval: number;
  /** Name for identification and logging */
  name: string;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  availableTokens: number;
  maxTokens: number;
  refillRate: number;
  totalRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  lastRefillTime: number;
}

/**
 * Default configuration for the rate limiter
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 100,
  refillRate: 10,
  refillInterval: 1000,
  name: 'default',
};

/**
 * Token Bucket Rate Limiter
 *
 * Algorithm:
 * - Bucket holds tokens up to maxTokens
 * - Each request consumes tokens
 * - Tokens are refilled at refillRate per second
 * - Requests are rejected when no tokens available
 */
export class TokenBucketRateLimiter extends EventEmitter {
  private readonly config: RateLimiterConfig;
  private tokens: number;
  private lastRefillTime: number;
  private totalRequests: number = 0;
  private acceptedRequests: number = 0;
  private rejectedRequests: number = 0;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempt to consume tokens from the bucket
   * @param tokensRequired Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed, false if rate limited
   */
  tryConsume(tokensRequired: number = 1): boolean {
    this.totalRequests++;
    this.refill();

    if (tokensRequired <= 0) {
      tokensRequired = 1;
    }

    if (this.tokens >= tokensRequired) {
      this.tokens -= tokensRequired;
      this.acceptedRequests++;
      this.emit('accepted', { tokens: this.tokens, required: tokensRequired });
      return true;
    }

    this.rejectedRequests++;
    this.emit('rejected', { tokens: this.tokens, required: tokensRequired });
    return false;
  }

  /**
   * Check if a request can be made without consuming tokens
   * @param tokensRequired Number of tokens to check
   * @returns true if enough tokens are available
   */
  canConsume(tokensRequired: number = 1): boolean {
    this.refill();
    return this.tokens >= tokensRequired;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    // Calculate tokens to add based on elapsed time
    const tokensToAdd = (elapsed / 1000) * this.config.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
      this.emit('refill', { tokens: this.tokens, added: tokensToAdd });
    }
  }

  /**
   * Get current number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimiterStats {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.config.maxTokens,
      refillRate: this.config.refillRate,
      totalRequests: this.totalRequests,
      acceptedRequests: this.acceptedRequests,
      rejectedRequests: this.rejectedRequests,
      lastRefillTime: this.lastRefillTime,
    };
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
    this.totalRequests = 0;
    this.acceptedRequests = 0;
    this.rejectedRequests = 0;
    this.emit('reset', { tokens: this.tokens });
  }

  /**
   * Get the configuration
   */
  getConfig(): Readonly<RateLimiterConfig> {
    return { ...this.config };
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(): boolean {
    this.refill();
    return this.tokens < 1;
  }

  /**
   * Get time until next token is available (in ms)
   */
  getTimeUntilNextToken(): number {
    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    const msPerToken = 1000 / this.config.refillRate;
    return Math.ceil(tokensNeeded * msPerToken);
  }
}

/**
 * Global rate limiter singleton for the application
 *
 * Configuration:
 * - 100 tokens max (burst capacity)
 * - 10 tokens/second refill rate
 * - 1000ms refill interval
 *
 * This allows bursts of up to 100 requests, then rate-limits
 * to ~10 requests/second sustained.
 */
export const globalRateLimiter = new TokenBucketRateLimiter({
  maxTokens: 100,
  refillRate: 10,
  refillInterval: 1000,
  name: 'global',
});

/**
 * Create a rate limiter for specific use cases
 */
export function createRateLimiter(config: Partial<RateLimiterConfig>): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter(config);
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  readonly retryAfterMs: number;
  readonly stats: RateLimiterStats;

  constructor(message: string, retryAfterMs: number, stats: RateLimiterStats) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    this.stats = stats;
  }
}
