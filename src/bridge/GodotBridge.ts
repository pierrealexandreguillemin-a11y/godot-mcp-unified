/**
 * GodotBridge - TCP client for bidirectional communication with Godot Editor
 * Connects to the MCP Bridge plugin running in Godot
 * ISO/IEC 25010 compliant
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';

export interface BridgeCommand {
  command: string;
  params?: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface EditorInfo {
  godot_version: {
    major: number;
    minor: number;
    patch: number;
    status: string;
  };
  editor_scale: number;
  current_path: string;
  playing: boolean;
}

export interface ScriptValidationResult {
  valid: boolean;
  errors: Array<{ message: string; line?: number; column?: number }>;
}

export interface OpenScene {
  name: string;
  path: string;
  type: string;
}

export interface SelectedNode {
  name: string;
  type: string;
  path: string;
}

export interface Autoload {
  name: string;
  path: string;
}

const DEFAULT_PORT = 6550;
const DEFAULT_HOST = '127.0.0.1';
const CONNECTION_TIMEOUT = 5000;
const REQUEST_TIMEOUT = 10000;

/**
 * Client for communicating with Godot Editor via MCP Bridge plugin
 */
export class GodotBridge extends EventEmitter {
  private socket: Socket | null = null;
  private host: string;
  private port: number;
  private connected: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: BridgeResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private buffer: string = '';

  constructor(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT) {
    super();
    this.host = host;
    this.port = port;
  }

  /**
   * Connect to Godot Editor
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error(`Connection timeout after ${CONNECTION_TIMEOUT}ms`));
      }, CONNECTION_TIMEOUT);

      this.socket = new Socket();

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(Buffer.isBuffer(data) ? data : Buffer.from(data));
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        this.connected = false;
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        // Reject all pending requests
        for (const [_id, pending] of this.pendingRequests) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Disconnect from Godot Editor
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * Check if connected to Godot Editor
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send a command to Godot Editor
   */
  async send(command: BridgeCommand): Promise<BridgeResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to Godot Editor');
    }

    const id = `req_${++this.requestId}`;
    const request = {
      id,
      command: command.command,
      params: command.params || {},
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const data = JSON.stringify(request) + '\n';
      this.socket!.write(data, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  /**
   * Handle incoming data from Godot
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf8');

    // Process complete JSON messages (newline-delimited)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const message = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (message.trim()) {
        this.processMessage(message);
      }
    }
  }

  /**
   * Process a complete JSON message
   */
  private processMessage(message: string): void {
    try {
      const response = JSON.parse(message) as BridgeResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        pending.resolve(response);
      } else {
        // Unsolicited message (event from Godot)
        this.emit('message', response);
      }
    } catch {
      this.emit('error', new Error(`Failed to parse response: ${message}`));
    }
  }

  // High-level API methods

  /**
   * Ping Godot Editor to check connection
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.send({ command: 'ping' });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Get Godot Editor information
   */
  async getEditorInfo(): Promise<EditorInfo> {
    const response = await this.send({ command: 'get_editor_info' });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get editor info');
    }
    return response.result as unknown as EditorInfo;
  }

  /**
   * Validate a GDScript file using Godot's parser
   */
  async validateScript(path: string): Promise<ScriptValidationResult> {
    const response = await this.send({
      command: 'validate_script',
      params: { path },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to validate script');
    }
    return response.result as unknown as ScriptValidationResult;
  }

  /**
   * Reload a script in the editor
   */
  async reloadScript(path: string): Promise<void> {
    const response = await this.send({
      command: 'reload_script',
      params: { path },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reload script');
    }
  }

  /**
   * Get currently open scenes in the editor
   */
  async getOpenScenes(): Promise<OpenScene[]> {
    const response = await this.send({ command: 'get_open_scenes' });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get open scenes');
    }
    return (response.result as { scenes: OpenScene[] }).scenes;
  }

  /**
   * Reload a scene from disk
   */
  async reloadScene(path: string): Promise<void> {
    const response = await this.send({
      command: 'reload_scene',
      params: { path },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reload scene');
    }
  }

  /**
   * Get currently selected nodes in the scene tree
   */
  async getSelectedNodes(): Promise<SelectedNode[]> {
    const response = await this.send({ command: 'get_selected_nodes' });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get selected nodes');
    }
    return (response.result as { nodes: SelectedNode[] }).nodes;
  }

  /**
   * Execute GDScript code in the editor (for advanced use cases)
   */
  async executeCode(code: string): Promise<string> {
    const response = await this.send({
      command: 'execute_code',
      params: { code },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to execute code');
    }
    return (response.result as { output: string }).output;
  }

  /**
   * Get project autoloads
   */
  async getAutoloads(): Promise<Autoload[]> {
    const response = await this.send({ command: 'get_autoloads' });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get autoloads');
    }
    return (response.result as { autoloads: Autoload[] }).autoloads;
  }

  /**
   * Get project settings with optional filter
   */
  async getProjectSettings(
    filter?: string
  ): Promise<Array<{ name: string; value: string; type: number }>> {
    const response = await this.send({
      command: 'get_project_settings',
      params: { filter: filter || '' },
    });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get project settings');
    }
    return (response.result as { settings: Array<{ name: string; value: string; type: number }> })
      .settings;
  }
}

// Singleton instance for easy access
let globalBridge: GodotBridge | null = null;

/**
 * Get the global GodotBridge instance
 */
export function getGodotBridge(): GodotBridge {
  if (!globalBridge) {
    globalBridge = new GodotBridge();
  }
  return globalBridge;
}

/**
 * Try to connect to Godot Editor, returns false if connection fails
 */
export async function tryConnectToGodot(): Promise<boolean> {
  const bridge = getGodotBridge();
  if (bridge.isConnected()) {
    return true;
  }
  try {
    await bridge.connect();
    return true;
  } catch {
    return false;
  }
}
