/**
 * Bridge Executor - Helper for executing tools via Godot plugin bridge
 *
 * This module provides the `executeWithBridge` helper function that implements
 * the bridge-first pattern: try the WebSocket plugin bridge first, and fall
 * back to traditional methods (GodotExecutor, TscnParser) if unavailable.
 *
 * ## Architecture
 *
 * ```
 * Tool Handler
 *      │
 *      ▼
 * executeWithBridge(action, params, fallback)
 *      │
 *      ├── Plugin connected? ──Yes──► bridge.send(action, params)
 *      │         │                         │
 *      │         │                         ├── Success? ──Yes──► Return result
 *      │         │                         │
 *      │         │                         └── Error? ──► Return plugin error
 *      │         │
 *      │         │                    (Connection error or timeout)
 *      │         │                         │
 *      └── No ◄──┴─────────────────────────┘
 *              │
 *              ▼
 *         fallback()  ──► Return fallback result
 * ```
 *
 * ## Decision Logic
 *
 * - **Plugin connected + circuit closed/half-open**: Try bridge first
 * - **Plugin error response**: Return error (plugin handled it, no fallback)
 * - **Connection error/timeout**: Fall back to traditional method
 * - **Plugin disconnected or circuit open**: Use fallback directly
 *
 * ## Compliance
 *
 * - ISO/IEC 25010:2023 - Reliability (graceful degradation)
 * - ISO/IEC 25010:2023 - Maintainability (single point of bridge integration)
 *
 * @module bridge/BridgeExecutor
 * @see {@link GodotPluginBridge} for the WebSocket client
 *
 * @example Basic usage in a tool handler
 * ```typescript
 * import { executeWithBridge } from '../bridge/BridgeExecutor.js';
 *
 * export async function handleCreateScene(args) {
 *   return executeWithBridge(
 *     'create_scene',
 *     { scene_path: args.scenePath, root_type: args.rootType },
 *     async () => {
 *       // Fallback: use GodotExecutor or TscnParser
 *       return createSceneViaExecutor(args);
 *     }
 *   );
 * }
 * ```
 */

import { ToolResponse } from '../server/types.js';
import { getGodotPluginBridge } from './GodotPluginBridge.js';
import { createSuccessResponse } from '../tools/BaseToolHandler.js';
import { createErrorResponse } from '../utils/ErrorHandler.js';
import { logDebug, logWarn } from '../utils/Logger.js';

/**
 * Execute an action via the Godot plugin bridge with automatic fallback.
 *
 * This is the primary integration point for tools to use the plugin bridge.
 * It handles the complexity of:
 * - Checking plugin connection status
 * - Checking circuit breaker state
 * - Routing to bridge or fallback
 * - Formatting responses consistently
 *
 * ## Behavior
 *
 * 1. If plugin is connected and circuit is not open:
 *    - Sends action to plugin via WebSocket
 *    - On success: returns formatted success response
 *    - On plugin error: returns error (no fallback - plugin handled it)
 *    - On connection error/timeout: falls through to fallback
 *
 * 2. If plugin is not available (disconnected or circuit open):
 *    - Calls fallback function directly
 *
 * ## Parameter Naming Convention
 *
 * Parameters must use **snake_case** to match GDScript conventions:
 * - `scene_path` (not `scenePath`)
 * - `node_type` (not `nodeType`)
 * - `parent_path` (not `parentPath`)
 *
 * @param action - Bridge action name matching GDScript command (e.g., 'create_scene', 'add_node')
 * @param params - Parameters object with snake_case keys
 * @param fallback - Async function to call if bridge is unavailable or connection fails
 * @returns ToolResponse from either bridge or fallback
 *
 * @example Scene creation with fallback
 * ```typescript
 * return executeWithBridge(
 *   'create_scene',
 *   {
 *     scene_path: 'res://scenes/player.tscn',
 *     root_type: 'CharacterBody2D'
 *   },
 *   async () => {
 *     // Fallback: use TscnParser for direct file manipulation
 *     const parser = new TscnParser(projectPath);
 *     await parser.createScene(scenePath, rootType);
 *     return createSuccessResponse('Scene created');
 *   }
 * );
 * ```
 *
 * @example Node manipulation with fallback
 * ```typescript
 * return executeWithBridge(
 *   'add_node',
 *   {
 *     node_type: 'Sprite2D',
 *     node_name: 'PlayerSprite',
 *     parent_path: '.',
 *     properties: { centered: true }
 *   },
 *   async () => {
 *     // Fallback: use GodotExecutor for headless script execution
 *     return executeOperation('add_node', { ... }, projectPath, godotPath);
 *   }
 * );
 * ```
 */
export async function executeWithBridge(
  action: string,
  params: Record<string, unknown>,
  fallback: () => Promise<ToolResponse>
): Promise<ToolResponse> {
  const bridge = getGodotPluginBridge();
  const status = bridge.getStatus();

  // If plugin is connected and circuit is not open, try bridge
  if (status.connected && status.circuitState !== 'open') {
    try {
      logDebug(`[BridgeExecutor] Trying plugin for action: ${action}`);
      const response = await bridge.send(action, params);

      if (response.success) {
        logDebug(`[BridgeExecutor] Plugin success for: ${action}`);
        return createSuccessResponse(formatResult(response.result));
      }

      // Error from plugin
      const errorMsg = response.error?.message || 'Unknown plugin error';
      const errorCode = response.error?.code || 'PLUGIN_ERROR';
      logWarn(`[BridgeExecutor] Plugin error for ${action}: [${errorCode}] ${errorMsg}`);

      // Return error but don't fallback (plugin handled it)
      return createErrorResponse(`Plugin error: ${errorMsg}`, [
        'The Godot plugin reported an error',
        'Check the Godot console for details',
      ]);
    } catch (error) {
      // Connection error or timeout - fallback to traditional method
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logWarn(`[BridgeExecutor] Bridge failed for ${action}, falling back: ${errorMsg}`);
    }
  } else {
    logDebug(`[BridgeExecutor] Plugin not available (connected=${status.connected}, circuit=${status.circuitState}), using fallback`);
  }

  // Fallback to traditional execution
  return fallback();
}

/**
 * Check if the plugin bridge is currently available for use.
 *
 * Returns true only if:
 * - WebSocket is connected
 * - Circuit breaker is not in OPEN state
 *
 * Use this for conditional logic when you need to know bridge availability
 * without actually sending a request.
 *
 * @returns true if bridge can accept requests, false otherwise
 *
 * @example
 * ```typescript
 * import { isBridgeAvailable } from '../bridge/BridgeExecutor.js';
 *
 * if (isBridgeAvailable()) {
 *   // Plugin is available - can show real-time features
 *   showLivePreview();
 * } else {
 *   // Plugin not available - use static fallback
 *   showStaticPreview();
 * }
 * ```
 */
export function isBridgeAvailable(): boolean {
  const bridge = getGodotPluginBridge();
  const status = bridge.getStatus();
  return status.connected && status.circuitState !== 'open';
}

/**
 * Attempt to initialize the plugin bridge connection at startup.
 *
 * This is a non-blocking convenience function for application startup.
 * It attempts to connect to the Godot plugin and logs the result,
 * but does not throw if connection fails.
 *
 * Call this once during MCP server initialization. Subsequent tool calls
 * will automatically use the bridge if connected, or fall back if not.
 *
 * @returns true if connection succeeded, false if plugin is not available
 *
 * @example Application startup
 * ```typescript
 * import { tryInitializeBridge } from './bridge/BridgeExecutor.js';
 *
 * async function startServer() {
 *   // Try to connect to Godot plugin (optional)
 *   const pluginAvailable = await tryInitializeBridge();
 *
 *   if (pluginAvailable) {
 *     console.log('Plugin mode: real-time editor integration');
 *   } else {
 *     console.log('Headless mode: using GodotExecutor fallback');
 *   }
 *
 *   // Start MCP server (works either way)
 *   await startMcpServer();
 * }
 * ```
 */
export async function tryInitializeBridge(): Promise<boolean> {
  const bridge = getGodotPluginBridge();
  const connected = await bridge.tryConnect();

  if (connected) {
    logDebug('[BridgeExecutor] Plugin bridge connected');
  } else {
    logDebug('[BridgeExecutor] Plugin bridge not available, will use fallback methods');
  }

  return connected;
}

/**
 * Format a bridge result for display in tool response.
 *
 * Converts various result types to human-readable strings:
 * - null/undefined → "Operation completed successfully"
 * - string → returned as-is
 * - object → JSON formatted with 2-space indentation
 * - other → String conversion
 *
 * @param result - The result data from bridge response
 * @returns Formatted string suitable for tool response content
 * @internal
 */
function formatResult(result: unknown): string {
  if (result === null || result === undefined) {
    return 'Operation completed successfully';
  }

  if (typeof result === 'string') {
    return result;
  }

  if (typeof result === 'object') {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }

  return String(result);
}
