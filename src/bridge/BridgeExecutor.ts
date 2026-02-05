/**
 * Bridge Executor - Helper for executing tools via Godot plugin bridge
 * ISO/IEC 25010 compliant - Reliability with fallback
 *
 * Provides executeWithBridge helper that tries the plugin bridge first,
 * then falls back to traditional GodotExecutor if unavailable.
 */

import { ToolResponse } from '../server/types.js';
import { getGodotPluginBridge } from './GodotPluginBridge.js';
import { createSuccessResponse } from '../tools/BaseToolHandler.js';
import { createErrorResponse } from '../utils/ErrorHandler.js';
import { logDebug, logWarn } from '../utils/Logger.js';

/**
 * Execute an action via the Godot plugin bridge with fallback
 *
 * @param action - Bridge action name (e.g., 'create_scene')
 * @param params - Parameters for the action (snake_case)
 * @param fallback - Fallback function if bridge is unavailable
 * @returns Tool response from bridge or fallback
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
 * Check if the bridge is available for use
 */
export function isBridgeAvailable(): boolean {
  const bridge = getGodotPluginBridge();
  const status = bridge.getStatus();
  return status.connected && status.circuitState !== 'open';
}

/**
 * Try to connect to the plugin bridge (non-blocking)
 * Call this at startup to attempt connection
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
 * Format result for display
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
