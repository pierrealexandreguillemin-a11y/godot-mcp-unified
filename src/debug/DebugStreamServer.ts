/**
 * Debug Stream Server
 * WebSocket server for real-time debug output streaming
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getActiveProcess } from '../core/ProcessManager.js';
import { logDebug, logError } from '../utils/Logger.js';

export const DEFAULT_DEBUG_STREAM_PORT = 9999;
export const DEFAULT_POLL_INTERVAL_MS = 100;

export interface DebugMessage {
  type: 'stdout' | 'stderr' | 'system';
  timestamp: string;
  content: string;
}

export interface DebugStreamStatus {
  running: boolean;
  port?: number;
  clientCount: number;
  lastMessageTime?: string;
}

/**
 * Singleton server instance for debug streaming
 */
class DebugStreamServerImpl {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastOutputIndex: number = 0;
  private lastErrorIndex: number = 0;
  private port: number = DEFAULT_DEBUG_STREAM_PORT;
  private lastMessageTime: string | undefined = undefined;

  /**
   * Start the WebSocket server
   */
  start(port: number = DEFAULT_DEBUG_STREAM_PORT, pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
    if (this.wss) {
      throw new Error('Debug stream server is already running');
    }

    this.port = port;
    this.lastOutputIndex = 0;
    this.lastErrorIndex = 0;

    try {
      this.wss = new WebSocketServer({ port, host: 'localhost' });

      this.wss.on('connection', (ws: WebSocket) => {
        logDebug(`Debug stream: Client connected (total: ${this.clients.size + 1})`);
        this.clients.add(ws);

        // Send welcome message
        const welcomeMsg: DebugMessage = {
          type: 'system',
          timestamp: new Date().toISOString(),
          content: `Connected to Godot MCP debug stream on port ${port}`,
        };
        ws.send(JSON.stringify(welcomeMsg));

        ws.on('close', () => {
          this.clients.delete(ws);
          logDebug(`Debug stream: Client disconnected (remaining: ${this.clients.size})`);
        });

        ws.on('error', (error: Error) => {
          logError(`Debug stream: Client error - ${error.message}`);
          this.clients.delete(ws);
        });
      });

      this.wss.on('error', (error: Error) => {
        logError(`Debug stream: Server error - ${error.message}`);
      });

      // Start polling for debug output
      this.pollInterval = setInterval(() => this.poll(), pollIntervalMs);

      logDebug(`Debug stream server started on ws://localhost:${port}`);
    } catch (error: unknown) {
      this.wss = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start debug stream server: ${errorMessage}`);
    }
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (!this.wss) {
      throw new Error('Debug stream server is not running');
    }

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Send disconnect message to all clients
    const disconnectMsg: DebugMessage = {
      type: 'system',
      timestamp: new Date().toISOString(),
      content: 'Debug stream server shutting down',
    };
    this.broadcast(disconnectMsg);

    // Close all client connections
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // Close the server
    this.wss.close();
    this.wss = null;

    logDebug('Debug stream server stopped');
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: DebugMessage): void {
    if (this.clients.size === 0) {
      return;
    }

    this.lastMessageTime = message.timestamp;
    const messageStr = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }

  /**
   * Get current server status
   */
  getStatus(): DebugStreamStatus {
    return {
      running: this.wss !== null,
      port: this.wss ? this.port : undefined,
      clientCount: this.clients.size,
      lastMessageTime: this.lastMessageTime,
    };
  }

  /**
   * Poll ProcessManager for new output
   */
  private poll(): void {
    const process = getActiveProcess();
    if (!process) {
      return;
    }

    // Check for new stdout lines
    while (this.lastOutputIndex < process.output.length) {
      const line = process.output[this.lastOutputIndex];
      if (line && line.trim()) {
        this.broadcast({
          type: 'stdout',
          timestamp: new Date().toISOString(),
          content: line,
        });
      }
      this.lastOutputIndex++;
    }

    // Check for new stderr lines
    while (this.lastErrorIndex < process.errors.length) {
      const line = process.errors[this.lastErrorIndex];
      if (line && line.trim()) {
        this.broadcast({
          type: 'stderr',
          timestamp: new Date().toISOString(),
          content: line,
        });
      }
      this.lastErrorIndex++;
    }
  }

  /**
   * Reset output indices when a new Godot process starts.
   * Called externally by ProcessManager to ensure new process output
   * is captured from the beginning.
   * @public
   */
  resetIndices(): void {
    this.lastOutputIndex = 0;
    this.lastErrorIndex = 0;
  }
}

// Export singleton instance
export const debugStreamServer = new DebugStreamServerImpl();
