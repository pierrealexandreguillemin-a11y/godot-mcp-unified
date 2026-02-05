/**
 * Bridge Integration Tests
 * ISO/IEC 29119 compliant
 *
 * These tests require a running Godot instance with the MCP plugin enabled.
 * Run with: npm run test:integration
 *
 * Prerequisites:
 * 1. Open Godot Editor
 * 2. Enable the godot_mcp plugin in Project Settings > Plugins
 * 3. Verify plugin is running: console should show "[MCP] Plugin started on ws://localhost:6505"
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  GodotPluginBridge,
  getGodotPluginBridge,
  resetGodotPluginBridge,
} from '../../src/bridge/GodotPluginBridge.js';

// Skip these tests if GODOT_MCP_INTEGRATION is not set
const runIntegrationTests = process.env.GODOT_MCP_INTEGRATION === 'true';
const describeIntegration = runIntegrationTests ? describe : describe.skip;

describeIntegration('Bridge Integration Tests', () => {
  let bridge: GodotPluginBridge;

  beforeAll(async () => {
    resetGodotPluginBridge();
    bridge = getGodotPluginBridge();

    const connected = await bridge.tryConnect();
    if (!connected) {
      throw new Error(
        'Failed to connect to Godot plugin. ' +
        'Ensure Godot is running with the MCP plugin enabled on port 6505.'
      );
    }
  }, 10000);

  afterAll(() => {
    bridge.disconnect();
  });

  describe('echo command', () => {
    it('should echo back the sent message', async () => {
      const testData = { msg: 'hello', timestamp: Date.now() };
      const result = await bridge.echo(testData);
      expect(result).toEqual(testData);
    });

    it('should handle complex objects', async () => {
      const testData = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };
      const result = await bridge.echo(testData);
      expect(result).toEqual(testData);
    });
  });

  describe('project info', () => {
    it('should return project information', async () => {
      const info = await bridge.getProjectInfo();
      expect(info).toBeDefined();
      expect(info.godot_version).toBeDefined();
    });
  });

  describe('current scene', () => {
    it('should return current scene or null', async () => {
      const scene = await bridge.getCurrentScene();
      // May be null if no scene is open
      if (scene !== null) {
        expect(scene.path).toBeDefined();
        expect(scene.root_name).toBeDefined();
        expect(scene.root_type).toBeDefined();
      }
    });
  });

  describe('scene operations', () => {
    const testScenePath = 'res://test_integration_scene.tscn';

    afterAll(async () => {
      // Cleanup: remove test scene
      // Note: This requires a delete_file action in the plugin
    });

    it('should create a new scene', async () => {
      const result = await bridge.createScene(testScenePath, 'Node2D');
      expect(result.path).toBe(testScenePath);
    });

    it('should open the created scene', async () => {
      const result = await bridge.openScene(testScenePath);
      expect(result.path).toBe(testScenePath);
    });

    it('should get scene tree', async () => {
      await bridge.openScene(testScenePath);
      const tree = await bridge.getSceneTree(testScenePath);
      expect(tree).toBeDefined();
      expect(tree.name).toBeDefined();
      expect(tree.type).toBe('Node2D');
    });

    it('should add a node to the scene', async () => {
      await bridge.openScene(testScenePath);
      const result = await bridge.addNode('Sprite2D', 'TestSprite', '.');
      expect(result.name).toBe('TestSprite');
      expect(result.type).toBe('Sprite2D');
    });

    it('should edit node properties', async () => {
      await bridge.openScene(testScenePath);
      const result = await bridge.editNode('TestSprite', {
        position: { x: 100, y: 200 },
      });
      expect(result.name).toBe('TestSprite');
    });

    it('should get node properties', async () => {
      await bridge.openScene(testScenePath);
      const props = await bridge.getNodeProperties('TestSprite');
      expect(props.name).toBe('TestSprite');
      expect(props.type).toBe('Sprite2D');
      expect(props.properties).toBeDefined();
    });

    it('should remove a node', async () => {
      await bridge.openScene(testScenePath);
      // Add a node to remove
      await bridge.addNode('Node2D', 'NodeToRemove', '.');
      const result = await bridge.removeNode('NodeToRemove');
      expect(result.removed).toBe('NodeToRemove');
    });

    it('should save the scene', async () => {
      await bridge.openScene(testScenePath);
      const result = await bridge.saveScene();
      expect(result.path).toBe(testScenePath);
    });
  });

  describe('script operations', () => {
    const testScriptPath = 'res://test_integration_script.gd';
    const testScriptContent = `extends Node2D

func _ready():
    print("Test script ready")
`;

    it('should write a script file', async () => {
      const result = await bridge.writeScript(testScriptPath, testScriptContent);
      expect(result.path).toBe(testScriptPath);
    });

    it('should read script content', async () => {
      const result = await bridge.getScriptContent(testScriptPath);
      expect(result.path).toBe(testScriptPath);
      expect(result.content).toBe(testScriptContent);
    });
  });

  describe('connection resilience', () => {
    it('should maintain connection across multiple requests', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await bridge.echo({ iteration: i });
        expect(result.iteration).toBe(i);
      }
    });

    it('should report correct connection status', () => {
      const status = bridge.getStatus();
      expect(status.connected).toBe(true);
      expect(status.circuitState).toBe('closed');
    });
  });
});
