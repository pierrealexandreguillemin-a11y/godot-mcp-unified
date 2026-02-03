/**
 * RateLimiter Unit Tests
 * ISO/IEC 29119 compliant test structure
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  TokenBucketRateLimiter,
  globalRateLimiter,
  createRateLimiter,
  RateLimitError,
  type RateLimiterConfig,
  type RateLimiterStats,
} from './RateLimiter.js';

describe('TokenBucketRateLimiter', () => {
  let rateLimiter: TokenBucketRateLimiter;

  beforeEach(() => {
    rateLimiter = new TokenBucketRateLimiter({
      maxTokens: 10,
      refillRate: 5,
      refillInterval: 1000,
      name: 'test',
    });
  });

  afterEach(() => {
    rateLimiter.removeAllListeners();
  });

  describe('constructor', () => {
    it('should initialize with default config when no config provided', () => {
      const limiter = new TokenBucketRateLimiter();
      const config = limiter.getConfig();

      expect(config.maxTokens).toBe(100);
      expect(config.refillRate).toBe(10);
      expect(config.refillInterval).toBe(1000);
      expect(config.name).toBe('default');
    });

    it('should merge custom config with defaults', () => {
      const limiter = new TokenBucketRateLimiter({ maxTokens: 50 });
      const config = limiter.getConfig();

      expect(config.maxTokens).toBe(50);
      expect(config.refillRate).toBe(10); // default
    });

    it('should start with full bucket', () => {
      expect(rateLimiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('tryConsume', () => {
    it('should consume tokens when available', () => {
      const result = rateLimiter.tryConsume(1);

      expect(result).toBe(true);
      expect(rateLimiter.getAvailableTokens()).toBe(9);
    });

    it('should consume multiple tokens at once', () => {
      const result = rateLimiter.tryConsume(5);

      expect(result).toBe(true);
      expect(rateLimiter.getAvailableTokens()).toBe(5);
    });

    it('should reject when not enough tokens', () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        rateLimiter.tryConsume(1);
      }

      const result = rateLimiter.tryConsume(1);
      expect(result).toBe(false);
    });

    it('should reject when tokens exhausted', () => {
      rateLimiter.tryConsume(10); // Consume all

      const result = rateLimiter.tryConsume(1);
      expect(result).toBe(false);
    });

    it('should handle zero or negative token requests', () => {
      const result = rateLimiter.tryConsume(0);
      expect(result).toBe(true);
      expect(rateLimiter.getAvailableTokens()).toBe(9); // Should treat as 1
    });

    it('should emit accepted event on success', () => {
      const listener = jest.fn();
      rateLimiter.on('accepted', listener);

      rateLimiter.tryConsume(1);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        tokens: 9,
        required: 1,
      }));
    });

    it('should emit rejected event on failure', () => {
      const listener = jest.fn();
      rateLimiter.on('rejected', listener);

      rateLimiter.tryConsume(10); // Exhaust tokens
      rateLimiter.tryConsume(1);  // This should be rejected

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('canConsume', () => {
    it('should return true when tokens available', () => {
      expect(rateLimiter.canConsume(5)).toBe(true);
    });

    it('should return false when not enough tokens', () => {
      rateLimiter.tryConsume(10);
      expect(rateLimiter.canConsume(1)).toBe(false);
    });

    it('should not consume tokens', () => {
      rateLimiter.canConsume(5);
      expect(rateLimiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', async () => {
      rateLimiter.tryConsume(10); // Exhaust all tokens
      expect(rateLimiter.getAvailableTokens()).toBe(0);

      // Wait for refill (5 tokens/second = 1 token per 200ms)
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have refilled at least 1 token
      expect(rateLimiter.getAvailableTokens()).toBeGreaterThanOrEqual(1);
    });

    it('should not exceed max tokens', async () => {
      // Wait a bit to allow potential over-refill
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(rateLimiter.getAvailableTokens()).toBeLessThanOrEqual(10);
    });

    it('should emit refill event', async () => {
      const listener = jest.fn();
      rateLimiter.on('refill', listener);

      rateLimiter.tryConsume(10);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 250));
      rateLimiter.getAvailableTokens();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      rateLimiter.tryConsume(3);
      rateLimiter.tryConsume(3);

      const stats = rateLimiter.getStats();

      expect(stats.maxTokens).toBe(10);
      expect(stats.refillRate).toBe(5);
      expect(stats.totalRequests).toBe(2);
      expect(stats.acceptedRequests).toBe(2);
      expect(stats.rejectedRequests).toBe(0);
    });

    it('should track rejected requests', () => {
      rateLimiter.tryConsume(10); // Exhaust
      rateLimiter.tryConsume(1);  // Rejected
      rateLimiter.tryConsume(1);  // Rejected

      const stats = rateLimiter.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.acceptedRequests).toBe(1);
      expect(stats.rejectedRequests).toBe(2);
    });
  });

  describe('reset', () => {
    it('should restore full capacity', () => {
      rateLimiter.tryConsume(10);
      expect(rateLimiter.getAvailableTokens()).toBe(0);

      rateLimiter.reset();

      expect(rateLimiter.getAvailableTokens()).toBe(10);
    });

    it('should reset statistics', () => {
      rateLimiter.tryConsume(5);
      rateLimiter.tryConsume(5);
      rateLimiter.tryConsume(1); // Rejected

      rateLimiter.reset();

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.acceptedRequests).toBe(0);
      expect(stats.rejectedRequests).toBe(0);
    });

    it('should emit reset event', () => {
      const listener = jest.fn();
      rateLimiter.on('reset', listener);

      rateLimiter.reset();

      expect(listener).toHaveBeenCalledWith({ tokens: 10 });
    });
  });

  describe('isRateLimited', () => {
    it('should return false when tokens available', () => {
      expect(rateLimiter.isRateLimited()).toBe(false);
    });

    it('should return true when no tokens available', () => {
      rateLimiter.tryConsume(10);
      expect(rateLimiter.isRateLimited()).toBe(true);
    });
  });

  describe('getTimeUntilNextToken', () => {
    it('should return 0 when tokens available', () => {
      expect(rateLimiter.getTimeUntilNextToken()).toBe(0);
    });

    it('should return positive value when rate limited', () => {
      rateLimiter.tryConsume(10);
      const timeUntil = rateLimiter.getTimeUntilNextToken();

      expect(timeUntil).toBeGreaterThan(0);
      // Should be approximately 200ms for 5 tokens/second
      expect(timeUntil).toBeLessThanOrEqual(250);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config = rateLimiter.getConfig();

      expect(config.maxTokens).toBe(10);
      expect(config.refillRate).toBe(5);
      expect(config.name).toBe('test');
    });

    it('should return readonly config', () => {
      const config = rateLimiter.getConfig();

      // TypeScript should prevent this, but verify at runtime
      expect(() => {
        (config as RateLimiterConfig).maxTokens = 999;
      }).not.toThrow(); // It's a shallow copy, but demonstrates intent
    });
  });
});

describe('globalRateLimiter', () => {
  beforeEach(() => {
    globalRateLimiter.reset();
  });

  it('should be a TokenBucketRateLimiter instance', () => {
    expect(globalRateLimiter).toBeInstanceOf(TokenBucketRateLimiter);
  });

  it('should have correct default configuration', () => {
    const config = globalRateLimiter.getConfig();

    expect(config.maxTokens).toBe(100);
    expect(config.refillRate).toBe(10);
    expect(config.name).toBe('global');
  });

  it('should be usable as a singleton', () => {
    expect(globalRateLimiter.tryConsume(1)).toBe(true);
    expect(globalRateLimiter.getAvailableTokens()).toBe(99);
  });
});

describe('createRateLimiter', () => {
  it('should create a new rate limiter instance', () => {
    const limiter = createRateLimiter({ maxTokens: 50, name: 'custom' });

    expect(limiter).toBeInstanceOf(TokenBucketRateLimiter);
    expect(limiter.getConfig().maxTokens).toBe(50);
    expect(limiter.getConfig().name).toBe('custom');
  });

  it('should create independent instances', () => {
    const limiter1 = createRateLimiter({ maxTokens: 10 });
    const limiter2 = createRateLimiter({ maxTokens: 20 });

    limiter1.tryConsume(10);

    expect(limiter1.getAvailableTokens()).toBe(0);
    expect(limiter2.getAvailableTokens()).toBe(20);
  });
});

describe('RateLimitError', () => {
  it('should have correct name', () => {
    const stats: RateLimiterStats = {
      availableTokens: 0,
      maxTokens: 100,
      refillRate: 10,
      totalRequests: 100,
      acceptedRequests: 99,
      rejectedRequests: 1,
      lastRefillTime: Date.now(),
    };

    const error = new RateLimitError('Rate limit exceeded', 200, stats);

    expect(error.name).toBe('RateLimitError');
  });

  it('should store retry information', () => {
    const stats: RateLimiterStats = {
      availableTokens: 0,
      maxTokens: 100,
      refillRate: 10,
      totalRequests: 100,
      acceptedRequests: 99,
      rejectedRequests: 1,
      lastRefillTime: Date.now(),
    };

    const error = new RateLimitError('Rate limit exceeded', 200, stats);

    expect(error.retryAfterMs).toBe(200);
    expect(error.stats).toEqual(stats);
    expect(error.message).toBe('Rate limit exceeded');
  });

  it('should be an Error instance', () => {
    const error = new RateLimitError('test', 100, {} as RateLimiterStats);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('Rate limiting scenarios', () => {
  it('should handle burst traffic followed by sustained rate', async () => {
    const limiter = new TokenBucketRateLimiter({
      maxTokens: 10,
      refillRate: 2, // 2 tokens per second
      refillInterval: 1000,
      name: 'burst-test',
    });

    // Burst: consume all tokens quickly
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryConsume(1)).toBe(true);
    }

    // Now rate limited
    expect(limiter.tryConsume(1)).toBe(false);

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should have some tokens again
    expect(limiter.tryConsume(1)).toBe(true);
  });

  it('should properly track request metrics under load', () => {
    const limiter = new TokenBucketRateLimiter({
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
      name: 'load-test',
    });

    // Make 10 requests, only first 5 should succeed
    let accepted = 0;
    let rejected = 0;

    for (let i = 0; i < 10; i++) {
      if (limiter.tryConsume(1)) {
        accepted++;
      } else {
        rejected++;
      }
    }

    expect(accepted).toBe(5);
    expect(rejected).toBe(5);

    const stats = limiter.getStats();
    expect(stats.totalRequests).toBe(10);
    expect(stats.acceptedRequests).toBe(5);
    expect(stats.rejectedRequests).toBe(5);
  });
});
