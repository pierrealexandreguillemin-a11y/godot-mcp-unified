/**
 * GodotBridge Integration Tests
 * Tests real TCP communication with a mock Godot server
 * No actual Godot required
 */

import { createServer, Server, Socket } from 'net';
import { GodotBridge } from './GodotBridge.js';

const TEST_PORT = 16550; // Different from default to avoid conflicts

/**
 * Mock Godot server that responds to bridge commands
 */
class MockGodotServer {
  private server: Server;
  private clients: Socket[] = [];
  private responseHandlers: Map<string, (params: Record<string, unknown>) => unknown> = new Map();

  constructor(private port: number) {
    this.server = createServer((socket) => {
      this.clients.push(socket);
      let buffer = '';

      socket.on('data', (data) => {
        buffer += data.toString('utf8');

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const message = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (message.trim()) {
            this.handleMessage(socket, message);
          }
        }
      });

      socket.on('close', () => {
        this.clients = this.clients.filter((c) => c !== socket);
      });
    });

    // Default handlers
    this.responseHandlers.set('ping', () => ({
      message: 'pong',
      version: '1.0.0',
    }));

    this.responseHandlers.set('get_editor_info', () => ({
      godot_version: { major: 4, minor: 5, patch: 1, status: 'stable' },
      editor_scale: 1.0,
      current_path: 'res://',
      playing: false,
    }));

    this.responseHandlers.set('validate_script', (params) => {
      const path = params.path as string;
      if (path.includes('error')) {
        return {
          valid: false,
          errors: [
            { message: 'Undefined variable "foo"', line: 10, column: 5 },
            { message: 'Expected ")"', line: 15 },
          ],
        };
      }
      return { valid: true, errors: [] };
    });

    this.responseHandlers.set('get_open_scenes', () => ({
      scenes: [
        { name: 'Main', path: 'res://scenes/main.tscn', type: 'Node2D' },
        { name: 'Player', path: 'res://scenes/player.tscn', type: 'CharacterBody2D' },
      ],
    }));

    this.responseHandlers.set('get_selected_nodes', () => ({
      nodes: [{ name: 'Player', type: 'CharacterBody2D', path: '/root/Main/Player' }],
    }));

    this.responseHandlers.set('get_autoloads', () => ({
      autoloads: [
        { name: 'GameManager', path: '*res://scripts/game_manager.gd' },
        { name: 'SaveSystem', path: '*res://scripts/save_system.gd' },
      ],
    }));

    this.responseHandlers.set('get_project_settings', (params) => {
      const filter = (params.filter as string) || '';
      const allSettings = [
        { name: 'application/config/name', value: 'Test Project', type: 4 },
        { name: 'application/run/main_scene', value: 'res://scenes/main.tscn', type: 4 },
        { name: 'display/window/size/viewport_width', value: '1920', type: 2 },
      ];
      return {
        settings: filter
          ? allSettings.filter((s) => s.name.includes(filter))
          : allSettings,
      };
    });
  }

  private handleMessage(socket: Socket, message: string): void {
    try {
      const request = JSON.parse(message);
      const { id, command, params } = request;

      const handler = this.responseHandlers.get(command);
      if (handler) {
        const result = handler(params || {});
        this.sendResponse(socket, { id, success: true, result });
      } else {
        this.sendResponse(socket, {
          id,
          success: false,
          error: { code: 'unknown_command', message: `Unknown command: ${command}` },
        });
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  private sendResponse(socket: Socket, response: Record<string, unknown>): void {
    socket.write(JSON.stringify(response) + '\n');
  }

  setHandler(command: string, handler: (params: Record<string, unknown>) => unknown): void {
    this.responseHandlers.set(command, handler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, '127.0.0.1', () => resolve());
    });
  }

  async stop(): Promise<void> {
    for (const client of this.clients) {
      client.destroy();
    }
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

describe('GodotBridge Integration', () => {
  let mockServer: MockGodotServer;
  let bridge: GodotBridge;

  beforeAll(async () => {
    mockServer = new MockGodotServer(TEST_PORT);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    bridge = new GodotBridge('127.0.0.1', TEST_PORT);
  });

  afterEach(() => {
    bridge.disconnect();
  });

  describe('connection', () => {
    it('should connect to mock server', async () => {
      await bridge.connect();
      expect(bridge.isConnected()).toBe(true);
    });

    it('should emit connected event', async () => {
      const connectedPromise = new Promise<void>((resolve) => {
        bridge.on('connected', resolve);
      });
      await bridge.connect();
      await connectedPromise;
    });

    it('should disconnect cleanly', async () => {
      await bridge.connect();
      bridge.disconnect();
      expect(bridge.isConnected()).toBe(false);
    });
  });

  describe('ping', () => {
    it('should ping successfully', async () => {
      await bridge.connect();
      const result = await bridge.ping();
      expect(result).toBe(true);
    });
  });

  describe('getEditorInfo', () => {
    it('should get editor info', async () => {
      await bridge.connect();
      const info = await bridge.getEditorInfo();

      expect(info.godot_version.major).toBe(4);
      expect(info.godot_version.minor).toBe(5);
      expect(info.playing).toBe(false);
    });
  });

  describe('validateScript', () => {
    it('should validate a valid script', async () => {
      await bridge.connect();
      const result = await bridge.validateScript('res://scripts/player.gd');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid script', async () => {
      await bridge.connect();
      const result = await bridge.validateScript('res://scripts/error_script.gd');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Undefined variable');
    });
  });

  describe('getOpenScenes', () => {
    it('should get open scenes', async () => {
      await bridge.connect();
      const scenes = await bridge.getOpenScenes();

      expect(scenes).toHaveLength(2);
      expect(scenes[0].name).toBe('Main');
      expect(scenes[0].path).toContain('res://');
    });
  });

  describe('getSelectedNodes', () => {
    it('should get selected nodes', async () => {
      await bridge.connect();
      const nodes = await bridge.getSelectedNodes();

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Player');
      expect(nodes[0].path).toContain('/root/');
    });
  });

  describe('getAutoloads', () => {
    it('should get autoloads', async () => {
      await bridge.connect();
      const autoloads = await bridge.getAutoloads();

      expect(autoloads).toHaveLength(2);
      expect(autoloads[0].name).toBe('GameManager');
    });
  });

  describe('getProjectSettings', () => {
    it('should get all project settings', async () => {
      await bridge.connect();
      const settings = await bridge.getProjectSettings();

      expect(settings.length).toBeGreaterThan(0);
      expect(settings.some((s) => s.name.includes('application'))).toBe(true);
    });

    it('should filter project settings', async () => {
      await bridge.connect();
      const settings = await bridge.getProjectSettings('display');

      expect(settings.every((s) => s.name.includes('display'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      await bridge.connect();

      // Send raw command that doesn't exist
      const response = await bridge.send({ command: 'nonexistent_command' });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('unknown_command');
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      await bridge.connect();

      const [ping, info, scenes] = await Promise.all([
        bridge.ping(),
        bridge.getEditorInfo(),
        bridge.getOpenScenes(),
      ]);

      expect(ping).toBe(true);
      expect(info.godot_version.major).toBe(4);
      expect(scenes.length).toBe(2);
    });
  });
});

describe('GodotBridge Connection Errors', () => {
  it('should throw when sending without connection', async () => {
    const bridge = new GodotBridge('127.0.0.1', TEST_PORT);

    await expect(bridge.send({ command: 'ping' })).rejects.toThrow('Not connected');
  });

  it('should report not connected before connect() is called', () => {
    const bridge = new GodotBridge('127.0.0.1', TEST_PORT);
    expect(bridge.isConnected()).toBe(false);
  });
});
