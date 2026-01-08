/**
 * Circuit Breaker Pattern Implementation
 * ISO/IEC 25010 compliant - Reliability, Fault Tolerance
 *
 * Prevents cascading failures by failing fast when a service is unhealthy.
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold exceeded, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 */

import { EventEmitter } from 'events';
import { auditLogger, AuditCategory, AuditSeverity } from './AuditLogger.js';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (half-open) */
  resetTimeout: number;
  /** Number of successes in half-open before closing */
  successThreshold: number;
  /** Time window in ms for counting failures */
  failureWindow: number;
  /** Name for logging/identification */
  name: string;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  rejectedRequests: number;
  consecutiveSuccesses: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 3,
  failureWindow: 60000, // 1 minute
  name: 'default',
};

/**
 * Circuit Breaker implementation
 * Wraps async operations with failure detection and recovery
 */
export class CircuitBreaker extends EventEmitter {
  private readonly config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests: number = 0;
  private rejectedRequests: number = 0;
  private failureTimestamps: number[] = [];
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      this.rejectedRequests++;
      this.logCircuitEvent('REQUEST_REJECTED', 'Circuit is open');
      throw new CircuitOpenError(
        `Circuit breaker [${this.config.name}] is open - failing fast`,
        this.getStats()
      );
    }

    // Execute the operation
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Check if enough successes to close circuit
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success (sliding window approach)
      this.cleanupOldFailures();
    }

    this.emit('success', this.getStats());
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: unknown): void {
    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(Date.now());

    // Cleanup old failures outside window
    this.cleanupOldFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open returns to open
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if failure threshold exceeded
      if (this.failureTimestamps.length >= this.config.failureThreshold) {
        this.open();
      }
    }

    this.emit('failure', { error, stats: this.getStats() });
  }

  /**
   * Open the circuit (stop accepting requests)
   */
  private open(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.logCircuitEvent('CIRCUIT_OPENED', `Failure threshold (${this.config.failureThreshold}) exceeded`);
    this.emit('open', this.getStats());

    // Schedule transition to half-open
    this.scheduleReset();
  }

  /**
   * Close the circuit (resume normal operation)
   */
  private close(): void {
    if (this.state === CircuitState.CLOSED) return;

    this.state = CircuitState.CLOSED;
    this.failureTimestamps = [];
    this.consecutiveSuccesses = 0;
    this.logCircuitEvent('CIRCUIT_CLOSED', 'Service recovered');
    this.emit('close', this.getStats());

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Transition to half-open state
   */
  private halfOpen(): void {
    if (this.state === CircuitState.HALF_OPEN) return;

    this.state = CircuitState.HALF_OPEN;
    this.consecutiveSuccesses = 0;
    this.logCircuitEvent('CIRCUIT_HALF_OPEN', 'Testing service recovery');
    this.emit('halfOpen', this.getStats());
  }

  /**
   * Schedule reset to half-open state
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
      this.resetTimer = null;
    }, this.config.resetTimeout);
  }

  /**
   * Remove failures outside the time window
   */
  private cleanupOldFailures(): void {
    const now = Date.now();
    const windowStart = now - this.config.failureWindow;
    this.failureTimestamps = this.failureTimestamps.filter((ts) => ts > windowStart);
  }

  /**
   * Get current circuit statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Force reset the circuit to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.consecutiveSuccesses = 0;
    this.failureTimestamps = [];

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.logCircuitEvent('CIRCUIT_RESET', 'Manual reset');
    this.emit('reset', this.getStats());
  }

  /**
   * Log circuit breaker event to audit log
   */
  private logCircuitEvent(action: string, details: string): void {
    if (auditLogger.isEnabled()) {
      const severity =
        action === 'CIRCUIT_OPENED'
          ? AuditSeverity.WARN
          : action === 'REQUEST_REJECTED'
            ? AuditSeverity.ERROR
            : AuditSeverity.INFO;

      const outcome = action === 'REQUEST_REJECTED' ? 'BLOCKED' : 'SUCCESS';

      auditLogger.logEvent(
        AuditCategory.SYSTEM,
        severity,
        `CIRCUIT_BREAKER:${action}`,
        {
          name: this.config.name,
          message: details,
          state: this.state,
          failures: this.failureTimestamps.length,
        },
        outcome
      );
    }
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  readonly stats: CircuitStats;

  constructor(message: string, stats: CircuitStats) {
    super(message);
    this.name = 'CircuitOpenError';
    this.stats = stats;
  }
}

// NOTE: Pre-configured circuit breakers removed
// Each component (ProcessPool, etc.) now creates its own CircuitBreaker
// with config values from config.ts to eliminate magic numbers

/**
 * Wrap an async function with circuit breaker protection
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  breaker: CircuitBreaker
): T {
  return (async (...args: Parameters<T>) => {
    return breaker.execute(() => fn(...args));
  }) as T;
}
