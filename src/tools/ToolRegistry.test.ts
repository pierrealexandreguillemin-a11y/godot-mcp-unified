/**
 * ToolRegistry Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for tool registry, definitions, handlers, and READ_ONLY_MODE filtering
 */

import { jest } from '@jest/globals';
import {
  toolRegistry,
  getAllToolDefinitions,
  getToolHandler,
  isToolRegistered,
  getRegisteredToolNames,
} from './ToolRegistry.js';

describe('ToolRegistry', () => {

  describe('toolRegistry', () => {
    it('should be a Map instance', () => {
      expect(toolRegistry).toBeInstanceOf(Map);
    });

    it('should contain registered tool entries', () => {
      expect(toolRegistry.size).toBeGreaterThan(0);
    });

    it('should contain known system tools', () => {
      expect(toolRegistry.has('get_godot_version')).toBe(true);
      expect(toolRegistry.has('system_health')).toBe(true);
    });

    it('should contain known scene tools', () => {
      expect(toolRegistry.has('create_scene')).toBe(true);
      expect(toolRegistry.has('add_node')).toBe(true);
      expect(toolRegistry.has('get_node_tree')).toBe(true);
    });

    it('should contain known script tools', () => {
      expect(toolRegistry.has('list_scripts')).toBe(true);
      expect(toolRegistry.has('read_script')).toBe(true);
      expect(toolRegistry.has('write_script')).toBe(true);
    });

    it('should have definition, handler, and readOnly in each entry', () => {
      for (const [name, registration] of toolRegistry) {
        expect(registration).toHaveProperty('definition');
        expect(registration).toHaveProperty('handler');
        expect(registration).toHaveProperty('readOnly');
        expect(typeof registration.handler).toBe('function');
        expect(typeof registration.readOnly).toBe('boolean');
        expect(registration.definition.name).toBeDefined();
        // Ensure the definition name matches the registry key or is a valid string
        expect(typeof registration.definition.name).toBe('string');
      }
    });
  });

  describe('getAllToolDefinitions', () => {
    it('should return an array', () => {
      const defs = getAllToolDefinitions();
      expect(Array.isArray(defs)).toBe(true);
    });

    it('should return tool definitions with name, description, and inputSchema', () => {
      const defs = getAllToolDefinitions();
      expect(defs.length).toBeGreaterThan(0);

      for (const def of defs) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(typeof def.name).toBe('string');
        expect(typeof def.description).toBe('string');
        expect(def.inputSchema).toHaveProperty('type', 'object');
        expect(def.inputSchema).toHaveProperty('properties');
        expect(def.inputSchema).toHaveProperty('required');
      }
    });

    it('should include known tool names in the definitions', () => {
      const defs = getAllToolDefinitions();
      const names = defs.map((d) => d.name);
      expect(names).toContain('get_godot_version');
      expect(names).toContain('create_scene');
      expect(names).toContain('list_scripts');
    });
  });

  describe('getToolHandler', () => {
    it('should return a handler function for a known tool', () => {
      const handler = getToolHandler('get_godot_version');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should return undefined for an unknown tool', () => {
      const handler = getToolHandler('nonexistent_tool_xyz');
      expect(handler).toBeUndefined();
    });

    it('should return different handlers for different tools', () => {
      const handler1 = getToolHandler('get_godot_version');
      const handler2 = getToolHandler('create_scene');
      expect(handler1).not.toBe(handler2);
    });
  });

  describe('isToolRegistered', () => {
    it('should return true for a registered tool', () => {
      expect(isToolRegistered('get_godot_version')).toBe(true);
      expect(isToolRegistered('create_scene')).toBe(true);
      expect(isToolRegistered('list_scripts')).toBe(true);
    });

    it('should return false for an unregistered tool', () => {
      expect(isToolRegistered('nonexistent_tool_xyz')).toBe(false);
      expect(isToolRegistered('')).toBe(false);
    });
  });

  describe('getRegisteredToolNames', () => {
    it('should return an array of strings', () => {
      const names = getRegisteredToolNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(typeof name).toBe('string');
      }
    });

    it('should include known tool names', () => {
      const names = getRegisteredToolNames();
      expect(names).toContain('get_godot_version');
      expect(names).toContain('system_health');
      expect(names).toContain('create_scene');
      expect(names).toContain('add_node');
      expect(names).toContain('list_scripts');
      expect(names).toContain('batch_operations');
    });

    it('should match the size of the registry', () => {
      const names = getRegisteredToolNames();
      expect(names.length).toBe(toolRegistry.size);
    });
  });

  describe('READ_ONLY_MODE filtering', () => {
    it('should have both readOnly true and false tools in the registry', () => {
      const readOnlyTools = Array.from(toolRegistry.values()).filter((t) => t.readOnly);
      const writeTools = Array.from(toolRegistry.values()).filter((t) => !t.readOnly);
      expect(readOnlyTools.length).toBeGreaterThan(0);
      expect(writeTools.length).toBeGreaterThan(0);
    });

    it('should filter write tools when READ_ONLY_MODE is active', async () => {
      // Save current env and set READ_ONLY_MODE
      const originalReadOnly = process.env.READ_ONLY_MODE;
      process.env.READ_ONLY_MODE = 'true';

      try {
        // Re-import the module to pick up the new env var
        jest.resetModules();
        const freshMod = await import('./ToolRegistry.js');
        const allDefs = freshMod.getAllToolDefinitions();

        // Count write tools in the full registry
        const writeToolCount = Array.from(freshMod.toolRegistry.values()).filter(
          (t) => !t.readOnly
        ).length;

        // If READ_ONLY_MODE is true, write tools should be filtered out
        // The definitions count should be less than the total registry size
        if (writeToolCount > 0) {
          expect(allDefs.length).toBeLessThan(freshMod.toolRegistry.size);
        }

        // Verify no write tool definitions are returned
        const readOnlyToolNames = Array.from(freshMod.toolRegistry.entries())
          .filter(([, reg]) => reg.readOnly)
          .map(([, reg]) => reg.definition.name);

        for (const def of allDefs) {
          expect(readOnlyToolNames).toContain(def.name);
        }
      } finally {
        // Restore
        if (originalReadOnly === undefined) {
          delete process.env.READ_ONLY_MODE;
        } else {
          process.env.READ_ONLY_MODE = originalReadOnly;
        }
      }
    });

    it('should return all tools when READ_ONLY_MODE is not active', () => {
      // By default READ_ONLY_MODE is not set, so all tools should be returned
      // (current env should not have READ_ONLY_MODE=true)
      if (process.env.READ_ONLY_MODE !== 'true') {
        const defs = getAllToolDefinitions();
        expect(defs.length).toBe(toolRegistry.size);
      }
    });
  });
});
