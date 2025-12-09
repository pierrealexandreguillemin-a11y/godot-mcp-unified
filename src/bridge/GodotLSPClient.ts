/**
 * GodotLSPClient - Language Server Protocol client for Godot 4
 * Connects to Godot's built-in LSP server for real script diagnostics
 * ISO/IEC 25010 compliant
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';

/** LSP Diagnostic severity levels */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/** LSP Position in a document */
export interface Position {
  line: number;
  character: number;
}

/** LSP Range in a document */
export interface Range {
  start: Position;
  end: Position;
}

/** LSP Diagnostic message */
export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
}

/** Published diagnostics for a file */
export interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: Diagnostic[];
}

/** Script error in simplified format */
export interface ScriptDiagnostic {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string | number;
}

interface LSPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

const DEFAULT_LSP_PORT = 6005;
const CONNECTION_TIMEOUT = 10000;
const REQUEST_TIMEOUT = 30000;

/**
 * LSP Client for Godot 4's built-in language server
 * Start Godot with: godot --lsp-port=6005
 */
export class GodotLSPClient extends EventEmitter {
  private socket: Socket | null = null;
  private host: string;
  private port: number;
  private connected: boolean = false;
  private initialized: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private buffer: string = '';
  private diagnosticsCache: Map<string, Diagnostic[]> = new Map();

  constructor(host: string = '127.0.0.1', port: number = DEFAULT_LSP_PORT) {
    super();
    this.host = host;
    this.port = port;
  }

  /**
   * Connect to Godot LSP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error(`LSP connection timeout after ${CONNECTION_TIMEOUT}ms`));
      }, CONNECTION_TIMEOUT);

      this.socket = new Socket();

      this.socket.on('connect', async () => {
        clearTimeout(timeout);
        this.connected = true;
        this.emit('connected');

        try {
          await this.initialize();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        this.connected = false;
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.initialized = false;
        this.emit('disconnected');
        this.rejectAllPending('Connection closed');
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Disconnect from LSP server
   */
  disconnect(): void {
    if (this.socket) {
      this.sendNotification('shutdown', {});
      this.sendNotification('exit', {});
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.initialized = false;
  }

  /**
   * Check if connected and initialized
   */
  isReady(): boolean {
    return this.connected && this.initialized;
  }

  /**
   * Initialize the LSP connection
   */
  private async initialize(): Promise<void> {
    const initResult = await this.sendRequest('initialize', {
      processId: process.pid,
      capabilities: {
        textDocument: {
          publishDiagnostics: {
            relatedInformation: true,
          },
          synchronization: {
            dynamicRegistration: false,
            willSave: false,
            willSaveWaitUntil: false,
            didSave: true,
          },
        },
      },
      rootUri: null,
      workspaceFolders: null,
    });

    if (initResult) {
      this.sendNotification('initialized', {});
      this.initialized = true;
    }
  }

  /**
   * Open a document for diagnostics
   */
  async openDocument(uri: string, content: string, languageId: string = 'gdscript'): Promise<void> {
    this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text: content,
      },
    });
  }

  /**
   * Close a document
   */
  async closeDocument(uri: string): Promise<void> {
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  /**
   * Get diagnostics for a file (from cache, populated by server notifications)
   */
  getDiagnostics(uri: string): Diagnostic[] {
    return this.diagnosticsCache.get(uri) || [];
  }

  /**
   * Get all cached diagnostics
   */
  getAllDiagnostics(): Map<string, Diagnostic[]> {
    return new Map(this.diagnosticsCache);
  }

  /**
   * Convert LSP diagnostics to simplified format
   */
  convertDiagnostics(uri: string, diagnostics: Diagnostic[]): ScriptDiagnostic[] {
    const filePath = this.uriToPath(uri);
    return diagnostics.map((d) => ({
      file: filePath,
      line: d.range.start.line + 1, // LSP is 0-indexed
      column: d.range.start.character + 1,
      endLine: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      message: d.message,
      severity: this.severityToString(d.severity),
      code: d.code,
    }));
  }

  /**
   * Convert file path to LSP URI
   */
  pathToUri(filePath: string): string {
    // Convert to res:// format for Godot
    if (filePath.startsWith('res://')) {
      return filePath;
    }
    // Convert Windows path to URI
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.match(/^[a-zA-Z]:/)) {
      return `file:///${normalized}`;
    }
    return `file://${normalized}`;
  }

  /**
   * Convert LSP URI to file path
   */
  private uriToPath(uri: string): string {
    if (uri.startsWith('res://')) {
      return uri;
    }
    if (uri.startsWith('file:///')) {
      return uri.slice(8);
    }
    if (uri.startsWith('file://')) {
      return uri.slice(7);
    }
    return uri;
  }

  /**
   * Convert severity enum to string
   */
  private severityToString(severity?: DiagnosticSeverity): 'error' | 'warning' | 'info' | 'hint' {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return 'error';
      case DiagnosticSeverity.Warning:
        return 'warning';
      case DiagnosticSeverity.Information:
        return 'info';
      case DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'error';
    }
  }

  /**
   * Send an LSP request and wait for response
   */
  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to LSP server');
    }

    const id = ++this.requestId;
    const message: LSPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.writeMessage(message);
    });
  }

  /**
   * Send an LSP notification (no response expected)
   */
  private sendNotification(method: string, params: unknown): void {
    if (!this.socket || !this.connected) {
      return;
    }

    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.writeMessage(message);
  }

  /**
   * Write an LSP message to the socket
   */
  private writeMessage(message: LSPMessage): void {
    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    this.socket?.write(header + content);
  }

  /**
   * Handle incoming data from the socket
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf8');
    this.processBuffer();
  }

  /**
   * Process the buffer for complete LSP messages
   */
  private processBuffer(): void {
    while (true) {
      // Look for Content-Length header
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return; // Incomplete header
      }

      const header = this.buffer.slice(0, headerEnd);
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!lengthMatch) {
        // Invalid header, skip it
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(lengthMatch[1], 10);
      const contentStart = headerEnd + 4;
      const contentEnd = contentStart + contentLength;

      if (this.buffer.length < contentEnd) {
        return; // Incomplete content
      }

      const content = this.buffer.slice(contentStart, contentEnd);
      this.buffer = this.buffer.slice(contentEnd);

      try {
        const message = JSON.parse(content) as LSPMessage;
        this.handleMessage(message);
      } catch {
        this.emit('error', new Error(`Failed to parse LSP message: ${content.slice(0, 100)}`));
      }
    }
  }

  /**
   * Handle a complete LSP message
   */
  private handleMessage(message: LSPMessage): void {
    // Response to a request
    if (message.id !== undefined && !message.method) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Server notification
    if (message.method) {
      this.handleNotification(message.method, message.params);
    }
  }

  /**
   * Handle server notifications
   */
  private handleNotification(method: string, params: unknown): void {
    switch (method) {
      case 'textDocument/publishDiagnostics': {
        const diagParams = params as PublishDiagnosticsParams;
        this.diagnosticsCache.set(diagParams.uri, diagParams.diagnostics);
        this.emit('diagnostics', {
          uri: diagParams.uri,
          diagnostics: this.convertDiagnostics(diagParams.uri, diagParams.diagnostics),
        });
        break;
      }
      default:
        this.emit('notification', { method, params });
    }
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(reason: string): void {
    for (const [_id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let globalLSPClient: GodotLSPClient | null = null;

/**
 * Get the global LSP client instance
 */
export function getGodotLSPClient(): GodotLSPClient {
  if (!globalLSPClient) {
    globalLSPClient = new GodotLSPClient();
  }
  return globalLSPClient;
}

/**
 * Try to connect to Godot LSP server
 */
export async function tryConnectToLSP(): Promise<boolean> {
  const client = getGodotLSPClient();
  if (client.isReady()) {
    return true;
  }
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  }
}
