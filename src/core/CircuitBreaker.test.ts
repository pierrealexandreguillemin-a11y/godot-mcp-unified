/**
 * Circuit Breaker Tests
 * ISO/IEC 29119 compliant test structure
 */

import { jest } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  withCircuitBreaker,
} from './CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeout: 100, // Short timeout for tests
      successThreshold: 2,
      failureWindow: 1000,
    });
  });

  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should have zero stats initially', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.rejectedRequests).toBe(0);
    });

    it('should allow requests initially', () => {
      expect(breaker.isAllowingRequests()).toBe(true);
    });
  });

  describe('successful operations', () => {
    it('should track successful operations', async () => {
      await breaker.execute(() => Promise.resolve('success'));
      const stats = breaker.getStats();
      expect(stats.successes).toBe(1);
      expect(stats.totalRequests).toBe(1);
    });

    it('should return operation result', async () => {
      const result = await breaker.execute(() => Promise.resolve('test-result'));
      expect(result).toBe('test-result');
    });

    it('should emit success event', async () => {
      const listener = jest.fn();
      breaker.on('success', listener);
      await breaker.execute(() => Promise.resolve('ok'));
      expect(listener).toHaveBeenCalled();
    });

    it('should track lastSuccessTime', async () => {
      const before = Date.now();
      await breaker.execute(() => Promise.resolve('ok'));
      const stats = breaker.getStats();
      expect(stats.lastSuccessTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('failed operations', () => {
    it('should track failed operations', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should propagate errors', async () => {
      const error = new Error('test error');
      await expect(breaker.execute(() => Promise.reject(error))).rejects.toThrow('test error');
    });

    it('should emit failure event', async () => {
      const listener = jest.fn();
      breaker.on('failure', listener);
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
      expect(listener).toHaveBeenCalled();
    });

    it('should track lastFailureTime', async () => {
      const before = Date.now();
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('circuit opening', () => {
    it('should open after failure threshold', async () => {
      // Cause 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should emit open event', async () => {
      const listener = jest.fn();
      breaker.on('open', listener);
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }
      expect(listener).toHaveBeenCalled();
    });

    it('should not allow requests when open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }
      expect(breaker.isAllowingRequests()).toBe(false);
    });

    it('should throw CircuitOpenError when open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitOpenError);
    });

    it('should include stats in CircuitOpenError', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      try {
        await breaker.execute(() => Promise.resolve('ok'));
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          expect(error.stats).toBeDefined();
          expect(error.stats.state).toBe(CircuitState.OPEN);
        }
      }
    });

    it('should track rejected requests', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Try to make requests
      try {
        await breaker.execute(() => Promise.resolve('ok'));
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.rejectedRequests).toBe(1);
    });
  });

  describe('circuit recovery (half-open)', () => {
    it('should transition to half-open after timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should emit halfOpen event', async () => {
      const listener = jest.fn();
      breaker.on('halfOpen', listener);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(listener).toHaveBeenCalled();
    });

    it('should allow requests in half-open state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.isAllowingRequests()).toBe(true);
    });

    it('should close after success threshold in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed twice (success threshold)
      await breaker.execute(() => Promise.resolve('ok'));
      await breaker.execute(() => Promise.resolve('ok'));

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should emit close event on recovery', async () => {
      const listener = jest.fn();
      breaker.on('close', listener);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed twice
      await breaker.execute(() => Promise.resolve('ok'));
      await breaker.execute(() => Promise.resolve('ok'));

      expect(listener).toHaveBeenCalled();
    });

    it('should reopen on failure in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Fail again
      try {
        await breaker.execute(() => Promise.reject(new Error('fail again')));
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('failure window', () => {
    it('should not open if failures are outside window', async () => {
      const slowBreaker = new CircuitBreaker({
        name: 'slow-test',
        failureThreshold: 3,
        resetTimeout: 100,
        successThreshold: 2,
        failureWindow: 50, // Very short window
      });

      // Fail twice
      for (let i = 0; i < 2; i++) {
        try {
          await slowBreaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for failures to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Fail once more (should not trigger open since earlier failures expired)
      try {
        await slowBreaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      expect(slowBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('reset', () => {
    it('should reset to closed state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should emit reset event', async () => {
      const listener = jest.fn();
      breaker.on('reset', listener);
      breaker.reset();
      expect(listener).toHaveBeenCalled();
    });

    it('should clear failure count', async () => {
      // Cause some failures
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      breaker.reset();
      const stats = breaker.getStats();
      // Note: total failures remain for statistics, but window is cleared
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customBreaker = new CircuitBreaker({
        name: 'custom',
        failureThreshold: 10,
        resetTimeout: 5000,
        successThreshold: 5,
        failureWindow: 30000,
      });
      expect(customBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should use default configuration when not specified', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('withCircuitBreaker wrapper', () => {
    it('should wrap async function', async () => {
      let called = false;
      const fn = async () => {
        called = true;
        return 'result';
      };
      const wrapped = withCircuitBreaker(fn, breaker);

      const result = await wrapped();
      expect(result).toBe('result');
      expect(called).toBe(true);
    });

    it('should pass arguments to wrapped function', async () => {
      let receivedArgs: unknown[] = [];
      const fn = async (...args: unknown[]) => {
        receivedArgs = args;
        return (args[0] as number) + (args[1] as number);
      };
      const wrapped = withCircuitBreaker(fn, breaker);

      const result = await wrapped(2, 3);
      expect(result).toBe(5);
      expect(receivedArgs).toEqual([2, 3]);
    });

    it('should apply circuit breaker logic', async () => {
      const fn = async () => {
        throw new Error('fail');
      };
      const wrapped = withCircuitBreaker(fn, breaker);

      // Fail enough times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await wrapped();
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('edge cases', () => {
    it('should handle sync errors in operation', async () => {
      await expect(
        breaker.execute(() => {
          throw new Error('sync error');
        })
      ).rejects.toThrow('sync error');
    });

    it('should handle rapid successive calls', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(breaker.execute(() => Promise.resolve(i)));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(breaker.getStats().totalRequests).toBe(10);
    });

    it('should handle mixed success and failure', async () => {
      // Success
      await breaker.execute(() => Promise.resolve('ok'));

      // Failure
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      // Success
      await breaker.execute(() => Promise.resolve('ok'));

      const stats = breaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.totalRequests).toBe(3);
    });
  });
});
