/**
 * Bridge Protocol Types - Communication protocol for MCP ↔ Godot plugin
 *
 * This module defines the JSON message format for WebSocket communication
 * between the MCP server (Node.js) and the Godot MCP plugin (GDScript).
 *
 * ## Message Flow
 *
 * ```
 * MCP Server                           Godot Plugin
 *     │                                     │
 *     │──── BridgeRequest ─────────────────►│
 *     │     { id, action, params }          │
 *     │                                     │
 *     │◄─── BridgeResponse ─────────────────│
 *     │     { id, success, result/error }   │
 *     │                                     │
 *     │◄─── BridgeEvent ────────────────────│
 *     │     { event, data }                 │
 *     │                                     │
 * ```
 *
 * ## Request/Response Correlation
 *
 * Each request includes a UUID v4 `id`. The corresponding response
 * echoes the same `id` to enable correlation. Events do not have
 * an `id` field - they are fire-and-forget notifications.
 *
 * ## Compliance
 *
 * - ISO/IEC 25010:2023 - Reliability (type safety, clear contracts)
 * - MCP Specification 2025-11-25 (compatible message format)
 *
 * @module bridge/BridgeProtocol
 * @see {@link GodotPluginBridge} for the client implementation
 */

/**
 * Request message sent from MCP server to Godot plugin.
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "action": "create_scene",
 *   "params": {
 *     "scene_path": "res://scenes/player.tscn",
 *     "root_type": "CharacterBody2D"
 *   }
 * }
 * ```
 */
export interface BridgeRequest {
  /** Unique request identifier (UUID v4) for response correlation */
  id: string;
  /** Action to execute - matches GDScript command handler method name */
  action: BridgeAction | string;
  /** Action parameters in snake_case (e.g., scene_path, node_type) */
  params: Record<string, unknown>;
}

/**
 * Response message from Godot plugin to MCP server.
 *
 * @example Success response
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "success": true,
 *   "result": { "path": "res://scenes/player.tscn" }
 * }
 * ```
 *
 * @example Error response
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "Scene not found: res://missing.tscn"
 *   }
 * }
 * ```
 */
export interface BridgeResponse {
  /** Request ID echoed from the corresponding BridgeRequest */
  id: string;
  /** true if action completed successfully, false if error occurred */
  success: boolean;
  /** Result data (present only when success=true) */
  result?: unknown;
  /** Error details (present only when success=false) */
  error?: BridgeError;
}

/**
 * Error structure in bridge responses.
 *
 * Common error codes used by the Godot plugin:
 * - `NO_SCENE` - No scene is currently open
 * - `NOT_FOUND` - Resource/node/scene not found
 * - `VALIDATION_ERROR` - Parameter validation failed
 * - `CREATE_FAILED` - Failed to create resource
 * - `SAVE_FAILED` - Failed to save resource
 * - `INCOMPATIBLE` - Type mismatch (e.g., script incompatible with node)
 */
export interface BridgeError {
  /** Error code for programmatic handling (e.g., 'NOT_FOUND', 'VALIDATION_ERROR') */
  code?: string;
  /** Human-readable error message for logging/display */
  message: string;
}

/**
 * Real-time event broadcast from Godot plugin.
 *
 * Events are fire-and-forget notifications - they do not have an `id` field
 * and do not expect a response. Used for notifying the MCP server of changes
 * happening in the Godot editor.
 *
 * @example Scene created event
 * ```json
 * {
 *   "event": "scene_created",
 *   "data": {
 *     "path": "res://scenes/player.tscn",
 *     "root_type": "CharacterBody2D"
 *   }
 * }
 * ```
 *
 * @example Node added event
 * ```json
 * {
 *   "event": "node_added",
 *   "data": {
 *     "name": "Sprite2D",
 *     "type": "Sprite2D",
 *     "path": "/root/Player/Sprite2D"
 *   }
 * }
 * ```
 */
export interface BridgeEvent {
  /** Event type identifier (see BridgeEventType for known types) */
  event: BridgeEventType | string;
  /** Event-specific payload data */
  data: Record<string, unknown>;
}

/**
 * Supported bridge actions.
 *
 * These action names map directly to command handler methods in the Godot plugin:
 * - `scene_commands.gd`: Scene operations
 * - `node_commands.gd`: Node operations
 * - `script_commands.gd`: Script operations
 * - `project_commands.gd`: Project operations
 *
 * @see {@link GodotPluginBridge} for high-level API methods that wrap these actions
 */
export type BridgeAction =
  // Scene operations (scene_commands.gd)
  /** Create a new scene file with specified root type */
  | 'create_scene'
  /** Open an existing scene in the editor */
  | 'open_scene'
  /** Save the current or specified scene */
  | 'save_scene'
  /** Get info about the currently edited scene */
  | 'get_current_scene'
  /** Get hierarchical node tree structure */
  | 'get_scene_tree'
  // Node operations (node_commands.gd)
  /** Add a new node to the current scene */
  | 'add_node'
  /** Edit properties of an existing node */
  | 'edit_node'
  /** Remove a node from the scene */
  | 'remove_node'
  /** Get properties of a node */
  | 'get_node_properties'
  // Script operations (script_commands.gd)
  /** Write a GDScript file */
  | 'write_script'
  /** Attach a script to a node */
  | 'attach_script'
  /** Read content of a script file */
  | 'get_script_content'
  // Project operations (project_commands.gd)
  /** Run the project in the editor */
  | 'run_project'
  /** Stop the running project */
  | 'stop_project'
  /** Get project information and settings */
  | 'get_project_info'
  // Utility
  /** Echo back params for testing connection */
  | 'echo';

/**
 * Event types emitted by the Godot plugin.
 *
 * Events are broadcast to all connected MCP clients when state changes
 * in the Godot editor. Subscribe to these via:
 *
 * ```typescript
 * bridge.on('event', (event: BridgeEvent) => {
 *   switch (event.event) {
 *     case 'scene_created':
 *       console.log(`New scene: ${event.data.path}`);
 *       break;
 *     case 'node_added':
 *       console.log(`Added node: ${event.data.name} (${event.data.type})`);
 *       break;
 *   }
 * });
 * ```
 */
export type BridgeEventType =
  // Scene events
  /** Emitted after create_scene succeeds */
  | 'scene_created'
  /** Emitted after open_scene succeeds */
  | 'scene_opened'
  /** Emitted after save_scene succeeds */
  | 'scene_saved'
  // Note: scene_modified and scene_closed require Godot editor signals not yet implemented
  // Node events
  /** Emitted after add_node succeeds */
  | 'node_added'
  /** Emitted after remove_node succeeds */
  | 'node_removed'
  /** Emitted after edit_node succeeds */
  | 'node_modified'
  // Script events
  /** Emitted after write_script succeeds */
  | 'script_created'
  /** Emitted after attach_script succeeds */
  | 'script_attached'
  /** Emitted when a script is detached from a node */
  | 'script_detached'
  // Note: script_modified requires Godot editor signals not yet implemented
  // Project events
  /** Emitted when run_project starts the game */
  | 'project_started'
  /** Emitted when stop_project stops the game */
  | 'project_stopped';

/**
 * Bridge connection status returned by `getStatus()`.
 *
 * Use this to check connection health and make decisions about
 * whether to use the bridge or fall back to other methods.
 *
 * @example
 * ```typescript
 * const status = bridge.getStatus();
 * if (status.connected && status.circuitState === 'closed') {
 *   // Fully healthy - use bridge
 * } else if (status.circuitState === 'open') {
 *   // Too many failures - use fallback
 * }
 * ```
 */
export interface BridgeStatus {
  /** true if WebSocket is currently connected */
  connected: boolean;
  /** Circuit breaker state: 'closed' (healthy), 'open' (blocked), 'half-open' (testing) */
  circuitState: 'closed' | 'open' | 'half-open';
  /** Number of reconnection attempts since last successful connect */
  reconnectAttempts: number;
  /** Unix timestamp (ms) of last received message, undefined if no messages yet */
  lastMessageTime?: number;
}

/**
 * Configuration options for GodotPluginBridge.
 *
 * All options have sensible defaults from NETWORK_CONFIG.
 * Override only what you need to customize.
 *
 * @example Custom configuration
 * ```typescript
 * const bridge = new GodotPluginBridge({
 *   port: 6506,  // Non-standard port
 *   requestTimeout: 60000  // Longer timeout for slow operations
 * });
 * ```
 */
export interface GodotBridgeConfig {
  /** WebSocket host to connect to (default: '127.0.0.1') */
  host: string;
  /** WebSocket port (default: NETWORK_CONFIG.GODOT_PLUGIN_PORT = 6505) */
  port: number;
  /** Base interval between reconnect attempts in ms (default: 3000) */
  reconnectInterval: number;
  /** Maximum reconnect attempts before giving up (default: 5) */
  maxReconnectAttempts: number;
  /** Timeout for individual requests in ms (default: 30000) */
  requestTimeout: number;
}

/**
 * Internal tracker for pending requests awaiting responses.
 *
 * Used by GodotPluginBridge to correlate responses with requests
 * and handle timeouts. Not typically used directly by consumers.
 *
 * @internal
 */
export interface PendingRequest {
  /** Promise resolve function to call with response */
  resolve: (value: BridgeResponse) => void;
  /** Promise reject function to call on timeout/error */
  reject: (error: Error) => void;
  /** Timeout handle for request expiration */
  timeout: NodeJS.Timeout;
  /** Action name for logging/debugging */
  action: string;
  /** Unix timestamp (ms) when request was sent, for latency tracking */
  startTime: number;
}
