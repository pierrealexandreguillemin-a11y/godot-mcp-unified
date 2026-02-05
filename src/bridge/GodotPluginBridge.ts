/**
 * GodotPluginBridge - WebSocket client for Godot plugin communication
 *
 * Provides bidirectional communication with the Godot editor plugin
 * for real-time scene manipulation and feedback. Uses WebSocket protocol
 * on port 6505 (configurable) to connect to the addons/godot_mcp plugin.
 *
 * ## Architecture
 *
 * ```
 * MCP Server (Node.js)          Godot Editor
 * ┌──────────────────┐         ┌──────────────────┐
 * │ GodotPluginBridge│◄───────►│ godot_mcp plugin │
 * │   (WS Client)    │  WS     │   (WS Server)    │
 * └──────────────────┘         └──────────────────┘
 * ```
 *
 * ## Features
 *
 * - **Circuit Breaker**: Prevents cascading failures when plugin is unavailable
 * - **Auto-reconnect**: Automatically attempts to reconnect after disconnection
 * - **Request tracking**: Correlates responses with requests via UUID
 * - **Event forwarding**: Emits real-time events from Godot plugin
 *
 * ## Compliance
 *
 * - ISO/IEC 25010:2023 - Reliability (fault tolerance, recoverability)
 * - ISO/IEC 25010:2023 - Security (localhost-only binding)
 * - ISO/IEC 25010:2023 - Maintainability (modular design)
 * - MCP Specification 2025-11-25
 *
 * @module bridge/GodotPluginBridge
 * @see {@link BridgeProtocol} for message types
 * @see {@link BridgeExecutor} for tool integration helper
 *
 * @example Basic usage
 * ```typescript
 * import { getGodotPluginBridge } from './bridge/GodotPluginBridge.js';
 *
 * const bridge = getGodotPluginBridge();
 * await bridge.connect();
 *
 * // Create a scene
 * const result = await bridge.createScene('res://scenes/player.tscn', 'CharacterBody2D');
 * console.log(result.path); // "res://scenes/player.tscn"
 *
 * // Listen to events
 * bridge.on('event', (event) => {
 *   console.log(`Event: ${event.event}`, event.data);
 * });
 * ```
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
 *
 * Use with EventEmitter's `on()` method to subscribe to events.
 *
 * @example
 * ```typescript
 * bridge.on('connected', () => console.log('Connected to Godot!'));
 * bridge.on('disconnected', () => console.log('Lost connection'));
 * bridge.on('event', (e) => console.log(`Godot event: ${e.event}`));
 * bridge.on('error', (err) => console.error('Error:', err.message));
 * bridge.on('reconnecting', (n) => console.log(`Reconnect attempt ${n}`));
 * ```
 */
export interface GodotPluginBridgeEvents {
  /** Emitted when WebSocket connection is established */
  connected: [];
  /** Emitted when WebSocket connection is lost */
  disconnected: [];
  /** Emitted when plugin sends a real-time event (scene_modified, node_added, etc.) */
  event: [event: BridgeEvent];
  /** Emitted on WebSocket errors */
  error: [error: Error];
  /** Emitted when starting a reconnection attempt */
  reconnecting: [attempt: number];
}

/**
 * WebSocket client for bidirectional communication with Godot MCP plugin.
 *
 * This class manages the WebSocket connection lifecycle including:
 * - Connection establishment with timeout
 * - Automatic reconnection with exponential backoff
 * - Circuit breaker for fault tolerance
 * - Request/response correlation via UUID
 * - Real-time event forwarding
 *
 * ## Usage Patterns
 *
 * **Singleton pattern (recommended):**
 * ```typescript
 * const bridge = getGodotPluginBridge();
 * await bridge.connect();
 * ```
 *
 * **Custom configuration:**
 * ```typescript
 * const bridge = new GodotPluginBridge({
 *   host: '127.0.0.1',
 *   port: 6505,
 *   reconnectInterval: 3000,
 *   maxReconnectAttempts: 5,
 *   requestTimeout: 30000
 * });
 * ```
 *
 * @fires connected When WebSocket connection is established
 * @fires disconnected When WebSocket connection is lost
 * @fires event When plugin sends a real-time event
 * @fires error On WebSocket errors
 * @fires reconnecting When starting a reconnection attempt
 */
export class GodotPluginBridge extends EventEmitter {
  /** Active WebSocket connection, null when disconnected */
  private ws: WebSocket | null = null;
  /** Connection configuration (merged with defaults) */
  private readonly config: GodotBridgeConfig;
  /** Circuit breaker for fault tolerance */
  private readonly circuitBreaker: CircuitBreaker;
  /** Map of pending requests awaiting responses, keyed by request UUID */
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();
  /** Current count of reconnection attempts */
  private reconnectAttempts = 0;
  /** Whether WebSocket is currently connected */
  private isConnected = false;
  /** Timer for scheduled reconnection, null when not scheduled */
  private reconnectTimer: NodeJS.Timeout | null = null;
  /** Timestamp of last received message, null if no messages received */
  private lastMessageTime: number | null = null;

  /**
   * Create a new GodotPluginBridge instance.
   *
   * @param config - Optional configuration overrides
   * @param config.host - WebSocket host (default: '127.0.0.1')
   * @param config.port - WebSocket port (default: from NETWORK_CONFIG.GODOT_PLUGIN_PORT)
   * @param config.reconnectInterval - Base interval between reconnect attempts in ms
   * @param config.maxReconnectAttempts - Maximum number of reconnection attempts
   * @param config.requestTimeout - Timeout for individual requests in ms
   *
   * @example
   * ```typescript
   * // Use defaults
   * const bridge = new GodotPluginBridge();
   *
   * // Custom port
   * const bridge = new GodotPluginBridge({ port: 6506 });
   * ```
   */
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
   * Connect to the Godot plugin WebSocket server.
   *
   * Establishes a WebSocket connection to the Godot MCP plugin. The connection
   * is protected by a circuit breaker - if too many connection attempts fail,
   * subsequent calls will fail fast until the circuit resets.
   *
   * If already connected, this method returns immediately without error.
   *
   * @returns Promise that resolves when connection is established
   *
   * @throws {Error} If connection times out (default: 5000ms)
   * @throws {Error} If WebSocket fails to connect (e.g., plugin not running)
   * @throws {CircuitOpenError} If circuit breaker is open due to repeated failures
   *
   * @example
   * ```typescript
   * try {
   *   await bridge.connect();
   *   console.log('Connected to Godot plugin');
   * } catch (error) {
   *   console.error('Failed to connect:', error.message);
   * }
   * ```
   *
   * @see {@link tryConnect} for a non-throwing alternative
   * @see {@link disconnect} to close the connection
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
   * Send a command to the Godot plugin and wait for response.
   *
   * This is the low-level API for sending arbitrary commands. For common operations,
   * prefer the high-level API methods like `createScene()`, `addNode()`, etc.
   *
   * The method:
   * 1. Generates a unique request ID (UUID v4)
   * 2. Sends the request as JSON over WebSocket
   * 3. Waits for matching response (by ID) or timeout
   * 4. Records success/failure with circuit breaker
   *
   * @param action - Bridge action name (e.g., 'create_scene', 'add_node')
   * @param params - Parameters for the action in snake_case (e.g., `{ scene_path: 'res://...' }`)
   * @returns Promise resolving to the bridge response with success status and result/error
   *
   * @throws {Error} If not connected to plugin
   * @throws {CircuitOpenError} If circuit breaker is open
   * @throws {Error} If request times out (default: 30000ms)
   *
   * @example
   * ```typescript
   * // Low-level API
   * const response = await bridge.send('create_scene', {
   *   scene_path: 'res://scenes/player.tscn',
   *   root_type: 'CharacterBody2D'
   * });
   *
   * if (response.success) {
   *   console.log('Created:', response.result);
   * } else {
   *   console.error('Error:', response.error?.message);
   * }
   * ```
   *
   * @see {@link sendOrThrow} for a throwing variant
   * @see {@link BridgeRequest} for request structure
   * @see {@link BridgeResponse} for response structure
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
   * Send a command and return only the result if successful, otherwise throw.
   *
   * This is a convenience wrapper around `send()` that:
   * - Returns just the result on success (not the full response)
   * - Throws an error on failure (instead of returning error in response)
   *
   * Used internally by the high-level API methods.
   *
   * @template T - Expected type of the result
   * @param action - Bridge action name
   * @param params - Parameters for the action in snake_case
   * @returns Promise resolving to the result data (typed as T)
   *
   * @throws {Error} If the plugin returns an error response
   * @throws {Error} If not connected, circuit open, or timeout
   *
   * @example
   * ```typescript
   * // Throws on error
   * const result = await bridge.sendOrThrow<{ path: string }>('create_scene', {
   *   scene_path: 'res://scenes/player.tscn'
   * });
   * console.log(result.path); // Guaranteed to exist if no throw
   * ```
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
   * Handle incoming WebSocket message.
   *
   * Parses the JSON message and routes it appropriately:
   * - Events (messages with `event` field) are emitted via EventEmitter
   * - Responses (messages with `id` field) resolve pending request promises
   *
   * @param data - Raw JSON string from WebSocket
   * @internal
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
   * Disconnect from the Godot plugin.
   *
   * Closes the WebSocket connection gracefully:
   * - Cancels any scheduled reconnection attempts
   * - Closes the WebSocket with code 1000 (normal closure)
   * - Rejects all pending requests with "Client disconnected" error
   *
   * After disconnecting, `isPluginConnected()` returns false and
   * `send()` will throw until `connect()` is called again.
   *
   * @example
   * ```typescript
   * bridge.disconnect();
   * console.log(bridge.isPluginConnected()); // false
   * ```
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
   * Get current connection status including circuit breaker state.
   *
   * Useful for diagnostics and conditional logic based on connection health.
   *
   * @returns Status object with connection and circuit breaker information
   *
   * @example
   * ```typescript
   * const status = bridge.getStatus();
   * if (status.connected && status.circuitState === 'closed') {
   *   // Healthy connection - safe to send commands
   * } else if (status.circuitState === 'open') {
   *   // Circuit open - too many failures, will fail fast
   * }
   * ```
   *
   * @see {@link BridgeStatus} for status structure
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
   * Check if currently connected to the Godot plugin.
   *
   * Note: This only checks the WebSocket connection state, not the circuit breaker.
   * For a full health check, use `getStatus()` and also check `circuitState`.
   *
   * @returns true if WebSocket is connected, false otherwise
   *
   * @example
   * ```typescript
   * if (bridge.isPluginConnected()) {
   *   await bridge.send('echo', { msg: 'test' });
   * }
   * ```
   */
  isPluginConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current circuit breaker state.
   *
   * - `CLOSED`: Normal operation, requests allowed
   * - `OPEN`: Too many failures, requests blocked (fail fast)
   * - `HALF_OPEN`: Testing if service recovered
   *
   * @returns Current circuit state
   *
   * @see {@link CircuitState} for possible values
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Manually reset the circuit breaker to closed state.
   *
   * Use this for manual recovery when you know the plugin has been restarted
   * or the underlying issue has been resolved.
   *
   * @example
   * ```typescript
   * // After restarting Godot
   * bridge.resetCircuitBreaker();
   * await bridge.connect();
   * ```
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Try to connect without throwing errors.
   *
   * This is the recommended way to attempt connection when the plugin
   * may not be running (optional plugin usage). Returns a boolean
   * instead of throwing, making it safe for initialization.
   *
   * @returns true if connection succeeded, false if it failed
   *
   * @example
   * ```typescript
   * // At startup
   * const connected = await bridge.tryConnect();
   * if (connected) {
   *   console.log('Godot plugin available - using real-time mode');
   * } else {
   *   console.log('Plugin not available - using fallback mode');
   * }
   * ```
   *
   * @see {@link connect} for a throwing variant
   */
  async tryConnect(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // High-level API methods for common operations
  // ==========================================

  /**
   * Echo test to verify plugin communication is working.
   *
   * Sends a message to the plugin and expects it echoed back.
   * Useful for connection testing and debugging.
   *
   * @param message - Arbitrary data to echo back
   * @returns The same data echoed from the plugin
   *
   * @throws {Error} If not connected or plugin error
   *
   * @example
   * ```typescript
   * const result = await bridge.echo({ test: 'hello', timestamp: Date.now() });
   * console.log(result); // { test: 'hello', timestamp: ... }
   * ```
   */
  async echo(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('echo', message);
  }

  /**
   * Create a new scene file in Godot.
   *
   * Creates a PackedScene with the specified root node type and saves it
   * to the given path. The scene file is immediately available in the editor.
   *
   * @param scenePath - Godot resource path (e.g., 'res://scenes/player.tscn')
   * @param rootType - Node type for the root node (default: 'Node2D')
   * @returns Object containing the created scene path
   *
   * @throws {Error} If scene path is invalid
   * @throws {Error} If root type is not a valid Godot node class
   * @throws {Error} If file cannot be written
   *
   * @example
   * ```typescript
   * // 2D game scene
   * await bridge.createScene('res://scenes/level1.tscn', 'Node2D');
   *
   * // 3D game scene
   * await bridge.createScene('res://scenes/world.tscn', 'Node3D');
   *
   * // UI scene
   * await bridge.createScene('res://ui/menu.tscn', 'Control');
   * ```
   */
  async createScene(scenePath: string, rootType: string = 'Node2D'): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('create_scene', {
      scene_path: scenePath,
      root_type: rootType,
    });
  }

  /**
   * Open an existing scene in the Godot editor.
   *
   * Makes the scene the currently edited scene, allowing subsequent
   * node operations to work on it.
   *
   * @param scenePath - Godot resource path to open (e.g., 'res://scenes/player.tscn')
   * @returns Object containing the opened scene path
   *
   * @throws {Error} If scene file does not exist (NOT_FOUND)
   * @throws {Error} If scene cannot be loaded (LOAD_FAILED)
   *
   * @example
   * ```typescript
   * await bridge.openScene('res://scenes/player.tscn');
   * // Now can add/edit nodes in this scene
   * await bridge.addNode('Sprite2D', 'PlayerSprite');
   * ```
   */
  async openScene(scenePath: string): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('open_scene', {
      scene_path: scenePath,
    });
  }

  /**
   * Save the current scene or a specific scene.
   *
   * If scenePath is omitted, saves the currently edited scene.
   * If scenePath is provided, that scene must be currently open.
   *
   * @param scenePath - Optional specific scene path to save
   * @returns Object containing the saved scene path
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If specified scene is not open (NOT_OPEN)
   * @throws {Error} If save fails (SAVE_FAILED)
   *
   * @example
   * ```typescript
   * // Save current scene
   * await bridge.saveScene();
   *
   * // Save specific scene (must be open)
   * await bridge.saveScene('res://scenes/player.tscn');
   * ```
   */
  async saveScene(scenePath?: string): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('save_scene', {
      scene_path: scenePath || '',
    });
  }

  /**
   * Get information about the currently edited scene.
   *
   * Returns null if no scene is currently open in the editor.
   *
   * @returns Scene info object or null if no scene open
   *
   * @example
   * ```typescript
   * const scene = await bridge.getCurrentScene();
   * if (scene) {
   *   console.log(`Editing: ${scene.path}`);
   *   console.log(`Root: ${scene.root_name} (${scene.root_type})`);
   * } else {
   *   console.log('No scene open');
   * }
   * ```
   */
  async getCurrentScene(): Promise<{ path: string; root_name: string; root_type: string } | null> {
    return this.sendOrThrow<{ path: string; root_name: string; root_type: string } | null>('get_current_scene', {});
  }

  /**
   * Get the hierarchical structure of a scene's node tree.
   *
   * Returns a nested dictionary representing all nodes in the scene.
   * If scenePath is omitted, uses the currently open scene.
   *
   * @param scenePath - Optional scene path to inspect (uses current if omitted)
   * @param maxDepth - Maximum depth to traverse (default: 10, max: 50)
   * @returns Nested structure with name, type, path, script, and children for each node
   *
   * @throws {Error} If no scene open and scenePath not provided (NO_SCENE)
   * @throws {Error} If specified scene not found (NOT_FOUND)
   *
   * @example
   * ```typescript
   * const tree = await bridge.getSceneTree();
   * console.log(JSON.stringify(tree, null, 2));
   * // {
   * //   "name": "Player",
   * //   "type": "CharacterBody2D",
   * //   "path": "/root/Player",
   * //   "script": "res://scripts/player.gd",
   * //   "children": [...]
   * // }
   * ```
   */
  async getSceneTree(scenePath?: string, maxDepth: number = 10): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('get_scene_tree', {
      scene_path: scenePath || '',
      max_depth: maxDepth,
    });
  }

  /**
   * Add a new node to the currently edited scene.
   *
   * Creates a node of the specified type and adds it as a child of the
   * parent node. Supports setting initial properties on creation.
   *
   * @param nodeType - Godot node class name (e.g., 'Sprite2D', 'CharacterBody2D')
   * @param nodeName - Name for the new node
   * @param parentPath - Path to parent node (default: '.' for scene root)
   * @param properties - Optional initial properties to set
   * @returns Object with the created node's name, type, and full path
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If parent node not found (PARENT_NOT_FOUND)
   * @throws {Error} If node type is invalid (CREATE_FAILED)
   *
   * @example
   * ```typescript
   * // Add sprite to root
   * await bridge.addNode('Sprite2D', 'PlayerSprite');
   *
   * // Add to specific parent with properties
   * await bridge.addNode(
   *   'CollisionShape2D',
   *   'Hitbox',
   *   'Player',
   *   { disabled: false }
   * );
   *
   * // Add with position
   * await bridge.addNode('Label', 'ScoreLabel', 'UI', {
   *   text: 'Score: 0',
   *   position: { x: 10, y: 10 }
   * });
   * ```
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
   * Edit properties of an existing node in the current scene.
   *
   * Can modify node properties and/or rename the node. All changes
   * are registered with Godot's undo/redo system.
   *
   * @param nodePath - Path to the node to edit (e.g., 'Player', 'Player/Sprite')
   * @param properties - Properties to modify (e.g., { visible: false, position: { x: 0, y: 0 } })
   * @param newName - Optional new name for the node
   * @returns Object with the node's (potentially new) name, type, and path
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If node not found (NOT_FOUND)
   * @throws {Error} If neither properties nor newName provided (NO_CHANGES)
   *
   * @example
   * ```typescript
   * // Update position
   * await bridge.editNode('Player', { position: { x: 100, y: 200 } });
   *
   * // Rename node
   * await bridge.editNode('OldName', undefined, 'NewName');
   *
   * // Both at once
   * await bridge.editNode('Enemy', { visible: false }, 'DisabledEnemy');
   * ```
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
   * Remove a node from the current scene.
   *
   * The node and all its children are removed. This action is
   * registered with Godot's undo/redo system.
   *
   * @param nodePath - Path to the node to remove
   * @returns Object confirming the removed node name
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If node not found (NOT_FOUND)
   * @throws {Error} If trying to remove root node (CANNOT_REMOVE_ROOT)
   *
   * @example
   * ```typescript
   * // Remove a child node
   * await bridge.removeNode('Player/OldSprite');
   *
   * // Remove multiple nodes (call sequentially)
   * await bridge.removeNode('Enemy1');
   * await bridge.removeNode('Enemy2');
   * ```
   */
  async removeNode(nodePath: string): Promise<{ removed: string }> {
    return this.sendOrThrow<{ removed: string }>('remove_node', {
      node_path: nodePath,
    });
  }

  /**
   * Get properties of a node in the current scene.
   *
   * By default, returns only commonly-used properties for the node type.
   * Set includeAll to true to get all exported properties.
   *
   * @param nodePath - Path to the node to inspect
   * @param includeAll - If true, includes all exported properties (default: false)
   * @returns Object with node info and properties dictionary
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If node not found (NOT_FOUND)
   *
   * @example
   * ```typescript
   * // Get common properties
   * const info = await bridge.getNodeProperties('Player/Sprite');
   * console.log(info.properties.position); // { x: 0, y: 0 }
   * console.log(info.properties.visible); // true
   *
   * // Get all properties
   * const full = await bridge.getNodeProperties('Player', true);
   * ```
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
   * Write a GDScript file to the project.
   *
   * Creates or overwrites a script file. Parent directories are
   * created automatically if they don't exist.
   *
   * @param scriptPath - Godot resource path (e.g., 'res://scripts/player.gd')
   * @param content - Complete GDScript content to write
   * @param overwrite - If false, fails if file exists (default: true)
   * @returns Object containing the script path
   *
   * @throws {Error} If script path is invalid (VALIDATION_ERROR)
   * @throws {Error} If file exists and overwrite is false (EXISTS)
   * @throws {Error} If write fails (WRITE_FAILED)
   *
   * @example
   * ```typescript
   * const script = `extends CharacterBody2D
   *
   * var speed = 200.0
   *
   * func _physics_process(delta):
   *     var velocity = Input.get_vector("left", "right", "up", "down")
   *     velocity = velocity.normalized() * speed
   *     move_and_slide()
   * `;
   *
   * await bridge.writeScript('res://scripts/player.gd', script);
   * ```
   */
  async writeScript(scriptPath: string, content: string, overwrite: boolean = true): Promise<{ path: string }> {
    return this.sendOrThrow<{ path: string }>('write_script', {
      script_path: scriptPath,
      content: content,
      overwrite: overwrite,
    });
  }

  /**
   * Attach a script to a node in the current scene.
   *
   * The script must exist and be compatible with the node's type
   * (i.e., the script's extends must match or be a parent of the node type).
   *
   * @param nodePath - Path to the node to attach script to
   * @param scriptPath - Godot resource path to the script
   * @returns Object with node path and attached script path
   *
   * @throws {Error} If no scene is open (NO_SCENE)
   * @throws {Error} If node not found (NODE_NOT_FOUND)
   * @throws {Error} If script not found (SCRIPT_NOT_FOUND)
   * @throws {Error} If script is incompatible (INCOMPATIBLE)
   *
   * @example
   * ```typescript
   * // First write the script
   * await bridge.writeScript('res://scripts/enemy.gd', 'extends Node2D\n...');
   *
   * // Then attach it
   * await bridge.attachScript('Enemy', 'res://scripts/enemy.gd');
   * ```
   */
  async attachScript(nodePath: string, scriptPath: string): Promise<{ node_path: string; script_path: string }> {
    return this.sendOrThrow<{ node_path: string; script_path: string }>('attach_script', {
      node_path: nodePath,
      script_path: scriptPath,
    });
  }

  /**
   * Read the content of a GDScript file.
   *
   * @param scriptPath - Godot resource path to the script
   * @returns Object with script path, content, and size in characters
   *
   * @throws {Error} If script file not found (NOT_FOUND)
   * @throws {Error} If read fails (READ_FAILED)
   *
   * @example
   * ```typescript
   * const script = await bridge.getScriptContent('res://scripts/player.gd');
   * console.log(`Script (${script.size} chars):`);
   * console.log(script.content);
   * ```
   */
  async getScriptContent(scriptPath: string): Promise<{ path: string; content: string; size: number }> {
    return this.sendOrThrow<{ path: string; content: string; size: number }>('get_script_content', {
      script_path: scriptPath,
    });
  }

  /**
   * Run the Godot project in the editor.
   *
   * Starts the project using EditorInterface. If no scene is specified,
   * runs the main scene defined in project settings.
   *
   * @param scene - Optional specific scene to run (default: main scene)
   * @param debug - Whether to run with debugging enabled (default: true)
   * @returns Object with status and scene that was launched
   *
   * @throws {Error} If project is already running (ALREADY_RUNNING)
   * @throws {Error} If specified scene not found (SCENE_NOT_FOUND)
   *
   * @example
   * ```typescript
   * // Run main scene
   * await bridge.runProject();
   *
   * // Run specific scene
   * await bridge.runProject('res://scenes/test_level.tscn');
   *
   * // Run without debug
   * await bridge.runProject(undefined, false);
   * ```
   */
  async runProject(scene?: string, debug: boolean = true): Promise<{ status: string; scene: string }> {
    return this.sendOrThrow<{ status: string; scene: string }>('run_project', {
      scene: scene || '',
      debug: debug,
    });
  }

  /**
   * Stop the currently running project.
   *
   * @returns Object confirming stopped status
   *
   * @throws {Error} If no project is running (NOT_RUNNING)
   *
   * @example
   * ```typescript
   * await bridge.runProject();
   * // ... later
   * await bridge.stopProject();
   * ```
   */
  async stopProject(): Promise<{ status: string }> {
    return this.sendOrThrow<{ status: string }>('stop_project', {});
  }

  /**
   * Get comprehensive information about the Godot project.
   *
   * Returns project settings, current scene info, autoloads, and more.
   *
   * @returns Object containing project metadata and settings
   *
   * @example
   * ```typescript
   * const info = await bridge.getProjectInfo();
   * console.log(`Project: ${info.name} v${info.version}`);
   * console.log(`Godot: ${info.godot_version}`);
   * console.log(`Main scene: ${info.main_scene}`);
   * console.log(`Currently running: ${info.is_running}`);
   * ```
   */
  async getProjectInfo(): Promise<Record<string, unknown>> {
    return this.sendOrThrow<Record<string, unknown>>('get_project_info', {});
  }
}

// ==========================================
// Singleton Management
// ==========================================

/** Singleton instance for the application */
let pluginBridgeInstance: GodotPluginBridge | null = null;

/**
 * Get the singleton GodotPluginBridge instance.
 *
 * This is the recommended way to access the bridge throughout the application.
 * Creates the instance on first call with default configuration.
 *
 * @returns The singleton GodotPluginBridge instance
 *
 * @example
 * ```typescript
 * import { getGodotPluginBridge } from './bridge/GodotPluginBridge.js';
 *
 * const bridge = getGodotPluginBridge();
 * await bridge.connect();
 * await bridge.createScene('res://test.tscn');
 * ```
 */
export function getGodotPluginBridge(): GodotPluginBridge {
  if (!pluginBridgeInstance) {
    pluginBridgeInstance = new GodotPluginBridge();
  }
  return pluginBridgeInstance;
}

/**
 * Reset the singleton instance (for testing purposes).
 *
 * Disconnects the current instance and clears the singleton.
 * The next call to `getGodotPluginBridge()` will create a fresh instance.
 *
 * **Warning:** Only use this in tests. In production code, the singleton
 * should persist for the lifetime of the application.
 *
 * @example
 * ```typescript
 * // In test teardown
 * afterEach(() => {
 *   resetGodotPluginBridge();
 * });
 * ```
 */
export function resetGodotPluginBridge(): void {
  if (pluginBridgeInstance) {
    pluginBridgeInstance.disconnect();
    pluginBridgeInstance = null;
  }
}

/**
 * Convenience function to try connecting to the Godot plugin.
 *
 * Gets the singleton instance and attempts to connect. Returns false
 * if connection fails (plugin not running, connection refused, etc.).
 *
 * @returns true if connection succeeded, false otherwise
 *
 * @example
 * ```typescript
 * import { tryConnectToPlugin } from './bridge/GodotPluginBridge.js';
 *
 * // At application startup
 * if (await tryConnectToPlugin()) {
 *   console.log('Real-time plugin mode enabled');
 * } else {
 *   console.log('Fallback to headless mode');
 * }
 * ```
 */
export async function tryConnectToPlugin(): Promise<boolean> {
  const bridge = getGodotPluginBridge();
  return bridge.tryConnect();
}
