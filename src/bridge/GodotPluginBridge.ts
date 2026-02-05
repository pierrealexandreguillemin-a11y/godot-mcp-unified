/**
 * GodotPluginBridge - WebSocket client for Godot plugin communication
 * ISO/IEC 25010 compliant - Reliability, Security, Maintainability
 *
 * Provides bidirectional communication with Godot editor plugin
 * for real-time scene manipulation and feedback.
 *
 * This is separate from GodotBridge.ts which uses TCP for a different protocol.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { CircuitBreaker, CircuitState, CircuitOpenError } from '../core/CircuitBreaker.js';
import { NETWORK_CONFIG, PROCESS_POOL_CONFIG } from '../core/config.js';
import { logDebug, logError, logInfo, logWarn } from '../utils/Logger.js';
import {
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeStatus,
  GodotBridgeConfig,
  PendingRequest,
} from './BridgeProtocol.js';

/**
 * Events emitted by GodotPluginBridge
 */
export interface GodotPluginBridgeEvents {
  connected: [];
  disconnected: [];
  event: [event: BridgeEvent];
  error: [error: Error];
  reconnecting: [attempt: number];
}

/**
 * GodotPluginBridge WebSocket client
 * Connects to Godot MCP plugin for editor communication
 */
export class GodotPluginBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly config: GodotBridgeConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();
  private reconnectAttempts = 0;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastMessageTime: number | null = null;

  constructor(config?: Partial<GodotBridgeConfig>) {
    super();
    this.config = {
      host: '127.0.0.1',
      port: NETWORK_CONFIG.GODOT_PLUGIN_PORT,
      reconnectInterval: NETWORK_CONFIG.PLUGIN_RECONNECT_INTERVAL_MS,
      maxReconnectAttempts: NETWORK_CONFIG.PLUGIN_MAX_RECONNECT_ATTEMPTS,
      requestTimeout: NETWORK_CONFIG.PLUGIN_REQUEST_TIMEOUT_MS,
      ...config,
    };

    this.circuitBreaker = new CircuitBreaker({
      name: 'godot-plugin-bridge',
      failureThreshold: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeout: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      successThreshold: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
      failureWindow: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_WINDOW_MS,
    });

    // Forward circuit breaker events
    this.circuitBreaker.on('open', () => {
      logWarn('[PluginBridge] Circuit breaker opened - plugin connection unhealthy');
    });
    this.circuitBreaker.on('close', () => {
      logInfo('[PluginBridge] Circuit breaker closed - plugin connection recovered');
    });
    this.circuitBreaker.on('halfOpen', () => {
      logDebug('[PluginBridge] Circuit breaker half-open - testing plugin connection');
    });
  }

  /**
   * Connect to the Godot plugin WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logDebug('[PluginBridge] Already connected');
      return;
    }

    return this.circuitBreaker.execute(async () => {
      return new Promise<void>((resolve, reject) => {
        const url = `ws://${this.config.host}:${this.config.port}`;
        logDebug(`[PluginBridge] Connecting to ${url}`);

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.terminate();
          }
          reject(new Error(`Connection timeout after ${NETWORK_CONFIG.CONNECTION_TIMEOUT_MS}ms`));
        }, NETWORK_CONFIG.CONNECTION_TIMEOUT_MS);

        try {
          this.ws = new WebSocket(url);

          this.ws.on('open', () => {
            clearTimeout(connectionTimeout);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.lastMessageTime = Date.now();
            logInfo(`[PluginBridge] Connected to Godot plugin at ${url}`);
            this.emit('connected');
            resolve();
          });

          this.ws.on('message', (data: WebSocket.RawData) => {
            this.handleMessage(data.toString());
          });

          this.ws.on('close', (code: number, reason: Buffer) => {
            clearTimeout(connectionTimeout);
            const wasConnected = this.isConnected;
            this.isConnected = false;
            this.rejectAllPending(new Error(`WebSocket closed: ${code} ${reason.toString()}`));

            if (wasConnected) {
              logInfo(`[PluginBridge] Disconnected from Godot plugin (code: ${code})`);
              this.emit('disconnected');
              this.scheduleReconnect();
            }
          });

          this.ws.on('error', (error: Error) => {
            clearTimeout(connectionTimeout);
            logError(`[PluginBridge] WebSocket error: ${error.message}`);
            this.emit('error', error);

            if (!this.isConnected) {
              reject(error);
            }
          });
        } catch (error) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Send a command to the Godot plugin
   */
  async send(action: string, params: Record<string, unknown> = {}): Promise<BridgeResponse> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Godot plugin');
    }

    // Check circuit breaker before sending
    if (!this.circuitBreaker.isAllowingRequests()) {
      throw new CircuitOpenError(
        'Circuit breaker is open - Godot plugin connection unhealthy',
        this.circuitBreaker.getStats()
      );
    }

    const id = randomUUID();
    const request: BridgeRequest = { id, action, params };

    return this.circuitBreaker.execute(async () => {
      return new Promise<BridgeResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${action} (${this.config.requestTimeout}ms)`));
        }, this.config.requestTimeout);

        const pending: PendingRequest = {
          resolve,
          reject,
          timeout,
          action,
          startTime: Date.now(),
        };

        this.pendingRequests.set(id, pending);

        try {
          this.ws!.send(JSON.stringify(request));
          logDebug(`[PluginBridge] Sent: ${action} (id: ${id})`);
        } catch (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  /**
   * Send a command and return only if successful, otherwise throw
   */
  async sendOrThrow<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await this.send(action, params);
    if (!response.success) {
      const errorMsg = response.error?.message || 'Unknown error';
      const errorCode = response.error?.code || 'UNKNOWN';
      throw new Error(`[${errorCode}] ${errorMsg}`);
    }
    return response.result as T;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    this.lastMessageTime = Date.now();

    let message: BridgeResponse | BridgeEvent;
    try {
      message = JSON.parse(data);
    } catch (error) {
      logError(`[PluginBridge] Failed to parse message: ${error}`);
      return;
    }

    // Event (no id field)
    if ('event' in message) {
      logDebug(`[PluginBridge] Event: ${message.event}`);
      this.emit('event', message as BridgeEvent);
      return;
    }

    // Response (has id field)
    const response = message as BridgeResponse;
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      const duration = Date.now() - pending.startTime;
      logDebug(`[PluginBridge] Response: ${pending.action} success=${response.success} (${duration}ms)`);

      pending.resolve(response);
    } else {
      logWarn(`[PluginBridge] Received response for unknown request: ${response.id}`);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logError(`[PluginBridge] Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5);

    logInfo(`[PluginBridge] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        logError(`[PluginBridge] Reconnection failed: ${error.message}`);
      });
    }, delay);
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * Disconnect from the Godot plugin
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.rejectAllPending(new Error('Client disconnected'));
    logInfo('[PluginBridge] Disconnected');
  }

  /**
   * Get current connection status
   */
  getStatus(): BridgeStatus {
    return {
      connected: this.isConnected,
      circuitState: this.circuitBreaker.getState().toLowerCase() as 'closed' | 'open' | 'half-open',
      reconnectAttempts: this.reconnectAttempts,
      lastMessageTime: this.lastMessageTime ?? undefined,
    };
  }

  /**
   * Check if connected to Godot plugin
   */
  isPluginConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Try to connect without throwing (for optional plugin usage)
   */
  async tryConnect(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  // High-level API methods for common operations

  /**
   * Echo test - verify plugin communication
   */
  async echo(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('echo', message);
  }

  /**
   * Create a new scene
   */
  async createScene(scenePath: string, rootType: string = 'Node2D'): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('create_scene', {
      scene_path: scenePath,
      root_type: rootType,
    });
  }

  /**
   * Open an existing scene
   */
  async openScene(scenePath: string): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('open_scene', {
      scene_path: scenePath,
    });
  }

  /**
   * Save the current scene
   */
  async saveScene(scenePath?: string): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('save_scene', {
      scene_path: scenePath || '',
    });
  }

  /**
   * Get current scene information
   */
  async getCurrentScene(): Promise<{ path: string; root_name: string; root_type: string } | null> {
    return this.sendOrThrow<{ path: string; root_name: string; root_type: string } | null>('get_current_scene', {});
  }

  /**
   * Get scene tree structure
   */
  async getSceneTree(scenePath?: string, maxDepth: number = 10): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('get_scene_tree', {
      scene_path: scenePath || '',
      max_depth: maxDepth,
    });
  }

  /**
   * Add a node to the current scene
   */
  async addNode(
    nodeType: string,
    nodeName: string,
    parentPath: string = '.',
    properties?: Record<string, unknown>
  ): Promise<{ name: string; type: string; path: string }> {
    return this.sendOrThrow<{ name: string; type: string; path: string }>('add_node', {
      node_type: nodeType,
      node_name: nodeName,
      parent_path: parentPath,
      properties: properties || {},
    });
  }

  /**
   * Edit a node's properties
   */
  async editNode(
    nodePath: string,
    properties?: Record<string, unknown>,
    newName?: string
  ): Promise<{ name: string; type: string; path: string }> {
    return this.sendOrThrow<{ name: string; type: string; path: string }>('edit_node', {
      node_path: nodePath,
      properties: properties || {},
      new_name: newName || '',
    });
  }

  /**
   * Remove a node from the scene
   */
  async removeNode(nodePath: string): Promise<{ removed: string }> {
    return this.sendOrThrow<{ removed: string }>('remove_node', {
      node_path: nodePath,
    });
  }

  /**
   * Get node properties
   */
  async getNodeProperties(
    nodePath: string,
    includeAll: boolean = false
  ): Promise<{ name: string; type: string; path: string; properties: Record<string, unknown> }> {
    return this.sendOrThrow<{ name: string; type: string; path: string; properties: Record<string, unknown> }>('get_node_properties', {
      node_path: nodePath,
      include_all: includeAll,
    });
  }

  /**
   * Write a script file
   */
  async writeScript(scriptPath: string, content: string, overwrite: boolean = true): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('write_script', {
      script_path: scriptPath,
      content: content,
      overwrite: overwrite,
    });
  }

  /**
   * Attach a script to a node
   */
  async attachScript(nodePath: string, scriptPath: string): Promise<{ node_path: string; script_path: string }> {
    return this.sendOrThrow<{ node_path: string; script_path: string }>('attach_script', {
      node_path: nodePath,
      script_path: scriptPath,
    });
  }

  /**
   * Get script content
   */
  async getScriptContent(scriptPath: string): Promise<{ path: string; content: string; size: number }> {
    return this.sendOrThrow<{ path: string; content: string; size: number }>('get_script_content', {
      script_path: scriptPath,
    });
  }

  /**
   * Run the project
   */
  async runProject(scene?: string, debug: boolean = true): Promise<{ status: string; scene: string }> {
    return this.sendOrThrow<{ status: string; scene: string }>('run_project', {
      scene: scene || '',
      debug: debug,
    });
  }

  /**
   * Stop the running project
   */
  async stopProject(): Promise<{ status: string }> {
    return this.sendOrThrow<{ status: string }>('stop_project', {});
  }

  /**
   * Get project information
   */
  async getProjectInfo(): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('get_project_info', {});
  }
}

// Singleton instance
let pluginBridgeInstance: GodotPluginBridge | null = null;

/**
 * Get the singleton GodotPluginBridge instance
 */
export function getGodotPluginBridge(): GodotPluginBridge {
  if (!pluginBridgeInstance) {
    pluginBridgeInstance = new GodotPluginBridge();
  }
  return pluginBridgeInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetGodotPluginBridge(): void {
  if (pluginBridgeInstance) {
    pluginBridgeInstance.disconnect();
    pluginBridgeInstance = null;
  }
}

/**
 * Try to connect to Godot plugin, returns false if connection fails
 */
export async function tryConnectToPlugin(): Promise<boolean> {
  const bridge = getGodotPluginBridge();
  return bridge.tryConnect();
}
