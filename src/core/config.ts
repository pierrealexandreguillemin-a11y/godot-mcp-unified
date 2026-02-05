/**
 * Application Configuration Constants
 * ISO/IEC 5055 compliant - No magic numbers
 *
 * All configurable values with documentation
 * Environment variable overrides supported
 */

/**
 * Safe parseInt with validation
 * Returns default value if parsing fails or result is NaN
 */
function safeParseInt(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return defaultValue;
  if (max !== undefined && parsed > max) return defaultValue;
  return parsed;
}

/**
 * Process Pool Configuration
 * Controls concurrent Godot process execution
 */
export const PROCESS_POOL_CONFIG = {
  /**
   * Maximum concurrent Godot processes
   * Higher values increase parallelism but consume more memory
   * @default 4
   */
  MAX_WORKERS: safeParseInt(process.env.GODOT_MCP_MAX_WORKERS, 4, 1, 16),

  /**
   * Default task timeout in milliseconds
   * Tasks exceeding this are killed with SIGKILL
   * @default 60000 (60 seconds)
   */
  DEFAULT_TASK_TIMEOUT_MS: safeParseInt(process.env.GODOT_MCP_TASK_TIMEOUT, 60000, 1000),

  /**
   * Maximum tasks waiting in queue
   * Prevents memory exhaustion from unbounded queuing
   * @default 50
   */
  MAX_QUEUE_SIZE: safeParseInt(process.env.GODOT_MCP_MAX_QUEUE, 50, 1, 1000),

  /**
   * Graceful shutdown timeout in milliseconds
   * Time to wait for running tasks before force killing
   * @default 10000 (10 seconds)
   */
  SHUTDOWN_TIMEOUT_MS: safeParseInt(process.env.GODOT_MCP_SHUTDOWN_TIMEOUT, 10000, 1000),

  /**
   * Circuit breaker failure threshold
   * Number of failures before opening circuit
   * @default 5
   */
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: safeParseInt(process.env.GODOT_MCP_CB_FAILURES, 5, 1, 100),

  /**
   * Circuit breaker reset timeout in milliseconds
   * Time before attempting recovery (half-open state)
   * @default 30000 (30 seconds)
   */
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: safeParseInt(process.env.GODOT_MCP_CB_RESET, 30000, 1000),

  /**
   * Circuit breaker success threshold
   * Number of successes in half-open before closing
   * @default 3
   */
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: safeParseInt(process.env.GODOT_MCP_CB_SUCCESSES, 3, 1, 20),

  /**
   * Circuit breaker failure window in milliseconds
   * Time window for counting failures
   * @default 60000 (1 minute)
   */
  CIRCUIT_BREAKER_FAILURE_WINDOW_MS: safeParseInt(process.env.GODOT_MCP_CB_WINDOW, 60000, 1000),
} as const;

/**
 * Batch Operations Configuration
 */
export const BATCH_CONFIG = {
  /**
   * Maximum operations per batch request
   * Prevents resource exhaustion from large batches
   * @default 100
   */
  MAX_OPERATIONS: safeParseInt(process.env.GODOT_MCP_MAX_BATCH_OPS, 100, 1, 1000),

  /**
   * Default batch concurrency level
   * @default 5
   */
  DEFAULT_CONCURRENCY: safeParseInt(process.env.GODOT_MCP_BATCH_CONCURRENCY, 5, 1, 50),
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  /**
   * Path validation cache TTL in milliseconds
   * @default 600000 (10 minutes)
   */
  PATH_CACHE_TTL_MS: safeParseInt(process.env.GODOT_MCP_PATH_CACHE_TTL, 600000, 1000),

  /**
   * Maximum cached path entries
   * @default 1000
   */
  PATH_CACHE_MAX_SIZE: safeParseInt(process.env.GODOT_MCP_PATH_CACHE_SIZE, 1000, 10, 100000),
} as const;

/**
 * Debug/Logging Configuration
 */
export const DEBUG_CONFIG = {
  /**
   * Maximum debug output buffer lines
   * Older lines are discarded when exceeded
   * @default 1000
   */
  MAX_BUFFER_LINES: safeParseInt(process.env.GODOT_MCP_DEBUG_BUFFER, 1000, 10, 100000),

  /**
   * Lines to retain after buffer overflow trim
   * @default 500
   */
  BUFFER_TRIM_SIZE: safeParseInt(process.env.GODOT_MCP_DEBUG_TRIM, 500, 10, 50000),

  /**
   * Enable audit logging
   * @default false
   */
  AUDIT_LOGGING_ENABLED: process.env.GODOT_MCP_AUDIT_LOG === 'true',
} as const;

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  /**
   * Default TCP bridge port for Godot connection
   * @default 6550
   */
  BRIDGE_PORT: safeParseInt(process.env.GODOT_MCP_BRIDGE_PORT, 6550, 1024, 65535),

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  CONNECTION_TIMEOUT_MS: safeParseInt(process.env.GODOT_MCP_CONNECT_TIMEOUT, 5000, 100),

  /**
   * WebSocket debug stream port
   * @default 6551
   */
  DEBUG_STREAM_PORT: safeParseInt(process.env.GODOT_MCP_DEBUG_PORT, 6551, 1024, 65535),

  /**
   * Godot plugin WebSocket port for editor communication
   * @default 6505
   */
  GODOT_PLUGIN_PORT: safeParseInt(process.env.GODOT_MCP_PLUGIN_PORT, 6505, 1024, 65535),

  /**
   * Request timeout for plugin communication in milliseconds
   * @default 30000 (30 seconds)
   */
  PLUGIN_REQUEST_TIMEOUT_MS: safeParseInt(process.env.GODOT_MCP_PLUGIN_TIMEOUT, 30000, 1000),

  /**
   * Maximum reconnect attempts for plugin connection
   * @default 5
   */
  PLUGIN_MAX_RECONNECT_ATTEMPTS: safeParseInt(process.env.GODOT_MCP_PLUGIN_RECONNECTS, 5, 0, 100),

  /**
   * Reconnect interval for plugin connection in milliseconds
   * @default 3000 (3 seconds)
   */
  PLUGIN_RECONNECT_INTERVAL_MS: safeParseInt(process.env.GODOT_MCP_PLUGIN_RECONNECT_INTERVAL, 3000, 500),
} as const;

/**
 * Resource Limits
 */
export const RESOURCE_LIMITS = {
  /**
   * Maximum scene/script resources listed per provider
   * @default 50
   */
  MAX_RESOURCES_PER_PROVIDER: safeParseInt(process.env.GODOT_MCP_MAX_RESOURCES, 50, 1, 1000),

  /**
   * Maximum file scan depth for recursive operations
   * @default 10
   */
  MAX_SCAN_DEPTH: safeParseInt(process.env.GODOT_MCP_SCAN_DEPTH, 10, 1, 50),

  /**
   * Maximum file path length
   * @default 500
   */
  MAX_PATH_LENGTH: safeParseInt(process.env.GODOT_MCP_MAX_PATH, 500, 50, 4096),
} as const;

/**
 * Validate all configuration values
 * Throws on invalid configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (PROCESS_POOL_CONFIG.MAX_WORKERS < 1 || PROCESS_POOL_CONFIG.MAX_WORKERS > 16) {
    errors.push('MAX_WORKERS must be between 1 and 16');
  }

  if (PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS < 1000) {
    errors.push('DEFAULT_TASK_TIMEOUT_MS must be at least 1000ms');
  }

  if (BATCH_CONFIG.MAX_OPERATIONS < 1 || BATCH_CONFIG.MAX_OPERATIONS > 1000) {
    errors.push('MAX_OPERATIONS must be between 1 and 1000');
  }

  if (RESOURCE_LIMITS.MAX_SCAN_DEPTH < 1 || RESOURCE_LIMITS.MAX_SCAN_DEPTH > 50) {
    errors.push('MAX_SCAN_DEPTH must be between 1 and 50');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
