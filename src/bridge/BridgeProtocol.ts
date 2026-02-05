/**
 * Bridge Protocol Types
 * Defines the communication protocol between MCP server and Godot plugin
 *
 * ISO/IEC 25010 compliant - Type safety for reliability
 */

/**
 * Request message sent from MCP to Godot plugin
 */
export interface BridgeRequest {
  /** Unique request identifier (UUID v4) */
  id: string;
  /** Action to execute (e.g., 'create_scene', 'add_node') */
  action: BridgeAction | string;
  /** Action parameters */
  params: Record<string, unknown>;
}

/**
 * Response message from Godot plugin to MCP
 */
export interface BridgeResponse {
  /** Request ID this response corresponds to */
  id: string;
  /** Whether the action succeeded */
  success: boolean;
  /** Result data on success */
  result?: unknown;
  /** Error details on failure */
  error?: BridgeError;
}

/**
 * Error structure in bridge responses
 */
export interface BridgeError {
  /** Error code for programmatic handling */
  code?: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Real-time event from Godot plugin
 */
export interface BridgeEvent {
  /** Event type identifier */
  event: BridgeEventType | string;
  /** Event payload */
  data: Record<string, unknown>;
}

/**
 * Supported bridge actions
 */
export type BridgeAction =
  // Scene operations
  | 'create_scene'
  | 'open_scene'
  | 'save_scene'
  | 'get_current_scene'
  | 'get_scene_tree'
  // Node operations
  | 'add_node'
  | 'edit_node'
  | 'remove_node'
  | 'get_node_properties'
  // Script operations
  | 'write_script'
  | 'attach_script'
  | 'get_script_content'
  // Project operations
  | 'run_project'
  | 'stop_project'
  | 'get_project_info'
  // Utility
  | 'echo';

/**
 * Event types emitted by Godot plugin
 */
export type BridgeEventType =
  | 'scene_modified'
  | 'scene_opened'
  | 'scene_closed'
  | 'node_added'
  | 'node_removed'
  | 'node_modified'
  | 'script_modified'
  | 'project_started'
  | 'project_stopped';

/**
 * Bridge connection status
 */
export interface BridgeStatus {
  /** Whether connected to Godot plugin */
  connected: boolean;
  /** Circuit breaker state */
  circuitState: 'closed' | 'open' | 'half-open';
  /** Number of reconnect attempts made */
  reconnectAttempts: number;
  /** Timestamp of last successful message */
  lastMessageTime?: number;
}

/**
 * Configuration for GodotBridge
 */
export interface GodotBridgeConfig {
  /** WebSocket host */
  host: string;
  /** WebSocket port */
  port: number;
  /** Reconnect interval in milliseconds */
  reconnectInterval: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  /** Request timeout in milliseconds */
  requestTimeout: number;
}

/**
 * Pending request tracker
 */
export interface PendingRequest {
  resolve: (value: BridgeResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  action: string;
  startTime: number;
}
