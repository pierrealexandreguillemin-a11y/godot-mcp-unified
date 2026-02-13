/**
 * Tool Annotations Tests
 * ISO/IEC 29119 compliant - verifies MCP ToolAnnotations on all tools
 *
 * Ensures every registered tool has valid annotations after getAllToolDefinitions()
 * and that readOnlyHint matches the readOnly registration field.
 */

import { jest } from '@jest/globals';

// Mock bridge to prevent real connections
jest.mock('../bridge/BridgeExecutor.js', () => ({
  executeWithBridge: jest.fn(async (
    _action: string,
    _params: Record<string, unknown>,
    fallback: () => Promise<unknown>,
  ) => fallback()),
  isBridgeAvailable: jest.fn(() => false),
  tryInitializeBridge: jest.fn(async () => false),
}));

import {
  toolRegistry,
  getAllToolDefinitions,
  TOOL_ANNOTATIONS,
} from './ToolRegistry.js';
import { ToolAnnotations } from '../server/types.js';

describe('Tool Annotations', () => {
  const toolDefinitions = getAllToolDefinitions();
  const registeredTools = Array.from(toolRegistry.entries());

  describe('Coverage', () => {
    it('should have annotations for every registered tool', () => {
      for (const def of toolDefinitions) {
        expect(def.annotations).toBeDefined();
        expect(typeof def.annotations).toBe('object');
      }
    });

    it('should have TOOL_ANNOTATIONS entry for every registered tool', () => {
      const annotatedNames = Object.keys(TOOL_ANNOTATIONS);
      const registeredNames = Array.from(toolRegistry.keys());

      for (const name of registeredNames) {
        expect(annotatedNames).toContain(name);
      }
    });

    it('should not have annotations for non-existent tools', () => {
      const registeredNames = new Set(toolRegistry.keys());
      for (const name of Object.keys(TOOL_ANNOTATIONS)) {
        expect(registeredNames.has(name)).toBe(true);
      }
    });
  });

  describe('readOnlyHint consistency', () => {
    // These tools are readOnly=true in the registry (available in READ_ONLY_MODE)
    // but have real side effects (spawning/killing processes), so their MCP
    // readOnlyHint is overridden to false for semantic correctness.
    const sideEffectOverrides = new Set(['stop_project', 'launch_editor', 'run_project']);

    it('should default readOnlyHint from readOnly field for standard tools', () => {
      for (const [name, registration] of registeredTools) {
        if (sideEffectOverrides.has(name)) continue;
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def).toBeDefined();
        expect(def!.annotations?.readOnlyHint).toBe(registration.readOnly);
      }
    });

    it('should override readOnlyHint to false for side-effect tools', () => {
      for (const name of sideEffectOverrides) {
        const registration = toolRegistry.get(name);
        expect(registration?.readOnly).toBe(true); // registry says readOnly
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def!.annotations?.readOnlyHint).toBe(false); // annotation overrides
      }
    });

    it('should mark pure read-only tools with readOnlyHint: true', () => {
      const readOnlyTools = registeredTools.filter(
        ([name, r]) => r.readOnly && !sideEffectOverrides.has(name),
      );
      for (const [name] of readOnlyTools) {
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def!.annotations?.readOnlyHint).toBe(true);
      }
    });

    it('should mark write tools with readOnlyHint: false', () => {
      const writeTools = registeredTools.filter(([, r]) => !r.readOnly);
      for (const [name] of writeTools) {
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def!.annotations?.readOnlyHint).toBe(false);
      }
    });
  });

  describe('Destructive tools', () => {
    const destructiveTools = ['remove_node', 'delete_script', 'stop_project', 'stop_debug_stream'];

    it('should mark destructive tools with destructiveHint: true', () => {
      for (const name of destructiveTools) {
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def).toBeDefined();
        expect(def!.annotations?.destructiveHint).toBe(true);
      }
    });
  });

  describe('Open-world tools', () => {
    const openWorldTools = [
      'launch_editor', 'run_project', 'export_project', 'export_pack',
      'bake_navigation_mesh', 'import_asset', 'reimport_assets',
      'convert_3to4', 'import_ldtk_level', 'start_debug_stream',
    ];

    it('should mark open-world tools with openWorldHint: true', () => {
      for (const name of openWorldTools) {
        const def = toolDefinitions.find((d) => d.name === name);
        expect(def).toBeDefined();
        expect(def!.annotations?.openWorldHint).toBe(true);
      }
    });
  });

  describe('Annotation shape', () => {
    const validAnnotationKeys: (keyof ToolAnnotations)[] = [
      'title',
      'readOnlyHint',
      'destructiveHint',
      'idempotentHint',
      'openWorldHint',
    ];

    it('should only contain valid annotation keys', () => {
      for (const def of toolDefinitions) {
        const keys = Object.keys(def.annotations!);
        for (const key of keys) {
          expect(validAnnotationKeys).toContain(key);
        }
      }
    });

    it('should have a title string for every tool', () => {
      for (const name of Object.keys(TOOL_ANNOTATIONS)) {
        const annotation = TOOL_ANNOTATIONS[name];
        expect(annotation.title).toBeDefined();
        expect(typeof annotation.title).toBe('string');
        expect(annotation.title!.length).toBeGreaterThan(0);
      }
    });

    it('should have boolean values for hint fields', () => {
      for (const def of toolDefinitions) {
        const ann = def.annotations!;
        if (ann.readOnlyHint !== undefined) expect(typeof ann.readOnlyHint).toBe('boolean');
        if (ann.destructiveHint !== undefined) expect(typeof ann.destructiveHint).toBe('boolean');
        if (ann.idempotentHint !== undefined) expect(typeof ann.idempotentHint).toBe('boolean');
        if (ann.openWorldHint !== undefined) expect(typeof ann.openWorldHint).toBe('boolean');
      }
    });
  });

  describe('Tool count', () => {
    it('should have 83 tools registered', () => {
      expect(toolRegistry.size).toBe(83);
    });

    it('should return 83 tool definitions', () => {
      expect(toolDefinitions.length).toBe(83);
    });

    it('should have 83 entries in TOOL_ANNOTATIONS', () => {
      expect(Object.keys(TOOL_ANNOTATIONS).length).toBe(83);
    });
  });
});
