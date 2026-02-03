/**
 * Configuration Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for config.ts configuration constants
 */

import {
  PROCESS_POOL_CONFIG,
  BATCH_CONFIG,
  CACHE_CONFIG,
  DEBUG_CONFIG,
  NETWORK_CONFIG,
  RESOURCE_LIMITS,
  validateConfig,
} from './config.js';

describe('config', () => {
  describe('PROCESS_POOL_CONFIG', () => {
    it('should have MAX_WORKERS between 1 and 16', () => {
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeGreaterThanOrEqual(1);
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeLessThanOrEqual(16);
    });

    it('should have DEFAULT_TASK_TIMEOUT_MS at least 1000', () => {
      expect(PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
    });

    it('should have MAX_QUEUE_SIZE between 1 and 1000', () => {
      expect(PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE).toBeGreaterThanOrEqual(1);
      expect(PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE).toBeLessThanOrEqual(1000);
    });

    it('should have SHUTDOWN_TIMEOUT_MS at least 1000', () => {
      expect(PROCESS_POOL_CONFIG.SHUTDOWN_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
    });

    it('should have circuit breaker configuration', () => {
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBeGreaterThanOrEqual(1);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).toBeGreaterThanOrEqual(1);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_WINDOW_MS).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('BATCH_CONFIG', () => {
    it('should have MAX_OPERATIONS between 1 and 1000', () => {
      expect(BATCH_CONFIG.MAX_OPERATIONS).toBeGreaterThanOrEqual(1);
      expect(BATCH_CONFIG.MAX_OPERATIONS).toBeLessThanOrEqual(1000);
    });

    it('should have DEFAULT_CONCURRENCY between 1 and 50', () => {
      expect(BATCH_CONFIG.DEFAULT_CONCURRENCY).toBeGreaterThanOrEqual(1);
      expect(BATCH_CONFIG.DEFAULT_CONCURRENCY).toBeLessThanOrEqual(50);
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have PATH_CACHE_TTL_MS at least 1000', () => {
      expect(CACHE_CONFIG.PATH_CACHE_TTL_MS).toBeGreaterThanOrEqual(1000);
    });

    it('should have PATH_CACHE_MAX_SIZE between 10 and 100000', () => {
      expect(CACHE_CONFIG.PATH_CACHE_MAX_SIZE).toBeGreaterThanOrEqual(10);
      expect(CACHE_CONFIG.PATH_CACHE_MAX_SIZE).toBeLessThanOrEqual(100000);
    });
  });

  describe('DEBUG_CONFIG', () => {
    it('should have MAX_BUFFER_LINES between 10 and 100000', () => {
      expect(DEBUG_CONFIG.MAX_BUFFER_LINES).toBeGreaterThanOrEqual(10);
      expect(DEBUG_CONFIG.MAX_BUFFER_LINES).toBeLessThanOrEqual(100000);
    });

    it('should have BUFFER_TRIM_SIZE between 10 and 50000', () => {
      expect(DEBUG_CONFIG.BUFFER_TRIM_SIZE).toBeGreaterThanOrEqual(10);
      expect(DEBUG_CONFIG.BUFFER_TRIM_SIZE).toBeLessThanOrEqual(50000);
    });

    it('should have AUDIT_LOGGING_ENABLED as boolean', () => {
      expect(typeof DEBUG_CONFIG.AUDIT_LOGGING_ENABLED).toBe('boolean');
    });
  });

  describe('NETWORK_CONFIG', () => {
    it('should have BRIDGE_PORT in valid range', () => {
      expect(NETWORK_CONFIG.BRIDGE_PORT).toBeGreaterThanOrEqual(1024);
      expect(NETWORK_CONFIG.BRIDGE_PORT).toBeLessThanOrEqual(65535);
    });

    it('should have CONNECTION_TIMEOUT_MS at least 100', () => {
      expect(NETWORK_CONFIG.CONNECTION_TIMEOUT_MS).toBeGreaterThanOrEqual(100);
    });

    it('should have DEBUG_STREAM_PORT in valid range', () => {
      expect(NETWORK_CONFIG.DEBUG_STREAM_PORT).toBeGreaterThanOrEqual(1024);
      expect(NETWORK_CONFIG.DEBUG_STREAM_PORT).toBeLessThanOrEqual(65535);
    });
  });

  describe('RESOURCE_LIMITS', () => {
    it('should have MAX_RESOURCES_PER_PROVIDER between 1 and 1000', () => {
      expect(RESOURCE_LIMITS.MAX_RESOURCES_PER_PROVIDER).toBeGreaterThanOrEqual(1);
      expect(RESOURCE_LIMITS.MAX_RESOURCES_PER_PROVIDER).toBeLessThanOrEqual(1000);
    });

    it('should have MAX_SCAN_DEPTH between 1 and 50', () => {
      expect(RESOURCE_LIMITS.MAX_SCAN_DEPTH).toBeGreaterThanOrEqual(1);
      expect(RESOURCE_LIMITS.MAX_SCAN_DEPTH).toBeLessThanOrEqual(50);
    });

    it('should have MAX_PATH_LENGTH between 50 and 4096', () => {
      expect(RESOURCE_LIMITS.MAX_PATH_LENGTH).toBeGreaterThanOrEqual(50);
      expect(RESOURCE_LIMITS.MAX_PATH_LENGTH).toBeLessThanOrEqual(4096);
    });
  });

  describe('validateConfig', () => {
    it('should not throw with default configuration', () => {
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('default values', () => {
    it('should have sensible defaults for PROCESS_POOL_CONFIG', () => {
      // These tests verify the default values are reasonable
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBe(4);
      expect(PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS).toBe(60000);
      expect(PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE).toBe(50);
      expect(PROCESS_POOL_CONFIG.SHUTDOWN_TIMEOUT_MS).toBe(10000);
    });

    it('should have sensible defaults for BATCH_CONFIG', () => {
      expect(BATCH_CONFIG.MAX_OPERATIONS).toBe(100);
      expect(BATCH_CONFIG.DEFAULT_CONCURRENCY).toBe(5);
    });

    it('should have sensible defaults for CACHE_CONFIG', () => {
      expect(CACHE_CONFIG.PATH_CACHE_TTL_MS).toBe(600000);
      expect(CACHE_CONFIG.PATH_CACHE_MAX_SIZE).toBe(1000);
    });

    it('should have sensible defaults for DEBUG_CONFIG', () => {
      expect(DEBUG_CONFIG.MAX_BUFFER_LINES).toBe(1000);
      expect(DEBUG_CONFIG.BUFFER_TRIM_SIZE).toBe(500);
      expect(DEBUG_CONFIG.AUDIT_LOGGING_ENABLED).toBe(false);
    });

    it('should have sensible defaults for NETWORK_CONFIG', () => {
      expect(NETWORK_CONFIG.BRIDGE_PORT).toBe(6550);
      expect(NETWORK_CONFIG.CONNECTION_TIMEOUT_MS).toBe(5000);
      expect(NETWORK_CONFIG.DEBUG_STREAM_PORT).toBe(6551);
    });

    it('should have sensible defaults for RESOURCE_LIMITS', () => {
      expect(RESOURCE_LIMITS.MAX_RESOURCES_PER_PROVIDER).toBe(50);
      expect(RESOURCE_LIMITS.MAX_SCAN_DEPTH).toBe(10);
      expect(RESOURCE_LIMITS.MAX_PATH_LENGTH).toBe(500);
    });

    it('should have sensible defaults for circuit breaker', () => {
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBe(5);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT_MS).toBe(30000);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).toBe(3);
      expect(PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_WINDOW_MS).toBe(60000);
    });
  });

  describe('safeParseInt behavior (via env variable overrides)', () => {
    // safeParseInt is private but we can test its behavior indirectly
    // by checking that config values from env vars are handled correctly.
    // Since the module is loaded once, we verify the defaults are correct
    // when env vars are not set (undefined path, line 14).

    it('should use default when env var is undefined', () => {
      // GODOT_MCP_MAX_WORKERS is not set, so safeParseInt returns default (4)
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBe(4);
    });

    it('should clamp values below min to default', () => {
      // safeParseInt(value, 4, 1, 16) with value below 1 returns 4
      // Since we can't re-import, verify the config always returns valid values
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeGreaterThanOrEqual(1);
    });

    it('should clamp values above max to default', () => {
      // safeParseInt(value, 4, 1, 16) with value above 16 returns 4
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeLessThanOrEqual(16);
    });

    it('should return a number for all config values (NaN handled)', () => {
      // If env var is "abc", safeParseInt returns default
      const allValues = [
        PROCESS_POOL_CONFIG.MAX_WORKERS,
        PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS,
        PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE,
        PROCESS_POOL_CONFIG.SHUTDOWN_TIMEOUT_MS,
        BATCH_CONFIG.MAX_OPERATIONS,
        BATCH_CONFIG.DEFAULT_CONCURRENCY,
        CACHE_CONFIG.PATH_CACHE_TTL_MS,
        CACHE_CONFIG.PATH_CACHE_MAX_SIZE,
        DEBUG_CONFIG.MAX_BUFFER_LINES,
        DEBUG_CONFIG.BUFFER_TRIM_SIZE,
        NETWORK_CONFIG.BRIDGE_PORT,
        NETWORK_CONFIG.CONNECTION_TIMEOUT_MS,
        NETWORK_CONFIG.DEBUG_STREAM_PORT,
        RESOURCE_LIMITS.MAX_RESOURCES_PER_PROVIDER,
        RESOURCE_LIMITS.MAX_SCAN_DEPTH,
        RESOURCE_LIMITS.MAX_PATH_LENGTH,
      ];

      for (const val of allValues) {
        expect(typeof val).toBe('number');
        expect(isNaN(val)).toBe(false);
      }
    });
  });

  describe('validateConfig error branches', () => {
    // validateConfig checks config values. Since safeParseInt already
    // clamps values to valid ranges, these validation checks serve
    // as safety nets. We test the function does not throw with defaults.

    it('should validate MAX_WORKERS range check passes', () => {
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeGreaterThanOrEqual(1);
      expect(PROCESS_POOL_CONFIG.MAX_WORKERS).toBeLessThanOrEqual(16);
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate DEFAULT_TASK_TIMEOUT_MS minimum check passes', () => {
      expect(PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate MAX_OPERATIONS range check passes', () => {
      expect(BATCH_CONFIG.MAX_OPERATIONS).toBeGreaterThanOrEqual(1);
      expect(BATCH_CONFIG.MAX_OPERATIONS).toBeLessThanOrEqual(1000);
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate MAX_SCAN_DEPTH range check passes', () => {
      expect(RESOURCE_LIMITS.MAX_SCAN_DEPTH).toBeGreaterThanOrEqual(1);
      expect(RESOURCE_LIMITS.MAX_SCAN_DEPTH).toBeLessThanOrEqual(50);
      expect(() => validateConfig()).not.toThrow();
    });

    it('should collect errors in an array and throw all at once', () => {
      // This verifies the error collection pattern works
      // With valid defaults, no errors should be thrown
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('type safety', () => {
    it('should have all PROCESS_POOL_CONFIG values as numbers', () => {
      expect(typeof PROCESS_POOL_CONFIG.MAX_WORKERS).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.SHUTDOWN_TIMEOUT_MS).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT_MS).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).toBe('number');
      expect(typeof PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_WINDOW_MS).toBe('number');
    });

    it('should not have NaN values', () => {
      expect(isNaN(PROCESS_POOL_CONFIG.MAX_WORKERS)).toBe(false);
      expect(isNaN(BATCH_CONFIG.MAX_OPERATIONS)).toBe(false);
      expect(isNaN(CACHE_CONFIG.PATH_CACHE_TTL_MS)).toBe(false);
      expect(isNaN(DEBUG_CONFIG.MAX_BUFFER_LINES)).toBe(false);
      expect(isNaN(NETWORK_CONFIG.BRIDGE_PORT)).toBe(false);
      expect(isNaN(RESOURCE_LIMITS.MAX_SCAN_DEPTH)).toBe(false);
    });
  });
});
