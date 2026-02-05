/**
 * System Health Tool
 * Provides health check endpoint for observability
 *
 * ISO/IEC 25010 compliant - Reliability, Observability
 *
 * Returns:
 * - Server status (healthy/degraded/unhealthy)
 * - Uptime and version
 * - Process pool stats (optional)
 * - Circuit breaker state (optional)
 * - Rate limiter status (optional)
 * - Memory usage
 * - Godot availability (optional)
 */

import { z } from 'zod';
import { ToolDefinition, ToolResponse } from '../../server/types.js';
import { createJsonResponse } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { toMcpSchema } from '../../core/ZodSchemas.js';
import { globalRateLimiter } from '../../core/RateLimiter.js';
import { detectGodotPath, isValidGodotPath } from '../../core/PathManager.js';
import { getGodotVersion } from '../../core/GodotExecutor.js';
import { config } from '../../config/config.js';

/**
 * Schema for system health tool input
 */
export const SystemHealthSchema = z.object({
  includeMetrics: z.boolean().default(true).describe('Include detailed metrics (pool stats, circuit breaker, rate limiter)'),
  includeGodotStatus: z.boolean().default(true).describe('Include Godot availability check'),
});

export type SystemHealthInput = z.infer<typeof SystemHealthSchema>;

/**
 * Health status enum
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check result interface
 */
interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  metrics?: {
    rateLimiter: {
      available: number;
      max: number;
      totalRequests: number;
      rejectedRequests: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  godot?: {
    available: boolean;
    version?: string;
    path?: string;
  };
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

export const systemHealthDefinition: ToolDefinition = {
  name: 'system_health',
  description: 'Get server health status, metrics, and Godot availability. Use for observability and monitoring.',
  inputSchema: toMcpSchema(SystemHealthSchema),
};

export const handleSystemHealth = async (
  args: Record<string, unknown>
): Promise<ToolResponse> => {
  try {
    const input = SystemHealthSchema.parse(args);
    const { includeMetrics, includeGodotStatus } = input;

    // Base health status
    let status: HealthStatus = 'healthy';
    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      version: config.SERVER_VERSION,
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    };

    // Include metrics if requested
    if (includeMetrics) {
      const rateLimiterStats = globalRateLimiter.getStats();
      const memoryUsage = process.memoryUsage();

      result.metrics = {
        rateLimiter: {
          available: rateLimiterStats.availableTokens,
          max: rateLimiterStats.maxTokens,
          totalRequests: rateLimiterStats.totalRequests,
          rejectedRequests: rateLimiterStats.rejectedRequests,
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
      };

      // Check for degraded conditions
      if (rateLimiterStats.availableTokens < rateLimiterStats.maxTokens * 0.1) {
        status = 'degraded';
      }
      if (result.metrics.memory.percentage > 90) {
        status = 'degraded';
      }
    }

    // Include Godot status if requested
    if (includeGodotStatus) {
      const godotPath = await detectGodotPath();
      const godotAvailable = godotPath ? await isValidGodotPath(godotPath) : false;

      result.godot = {
        available: godotAvailable,
        path: godotPath || undefined,
      };

      if (godotAvailable && godotPath) {
        try {
          result.godot.version = await getGodotVersion(godotPath);
        } catch {
          // Version retrieval failed, but Godot might still be available
        }
      }

      if (!godotAvailable) {
        status = 'degraded';
      }
    }

    // Update final status
    result.status = status;

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Health check failed: ${errorMessage}`, [
      'This is an internal server error',
      'Check server logs for more details',
    ]);
  }
};
