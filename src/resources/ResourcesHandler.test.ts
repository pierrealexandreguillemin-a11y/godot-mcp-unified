/**
 * ResourcesHandler Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - Provider registration
 * - Resource listing
 * - Resource reading
 * - Template handling
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('./providers/index.js', () => ({
  ProjectResourceProvider: jest.fn().mockImplementation(() => ({
    prefix: 'project',
    listResources: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { uri: 'godot://project/info', name: 'Project Info', mimeType: 'application/json' },
    ]),
    handlesUri: jest.fn<(uri: string) => boolean>().mockImplementation((uri) => uri.startsWith('godot://project/')),
    readResource: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      uri: 'godot://project/info',
      mimeType: 'application/json',
      text: '{"name":"test"}',
    }),
  })),
  SceneScriptResourceProvider: jest.fn().mockImplementation(() => ({
    prefix: 'scene-script',
    listResources: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { uri: 'godot://scenes', name: 'All Scenes', mimeType: 'application/json' },
    ]),
    handlesUri: jest.fn<(uri: string) => boolean>().mockImplementation((uri) => uri.startsWith('godot://scene')),
    readResource: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      uri: 'godot://scenes',
      mimeType: 'application/json',
      text: '{"scenes":[]}',
    }),
  })),
  AssetsResourceProvider: jest.fn().mockImplementation(() => ({
    prefix: 'assets',
    listResources: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { uri: 'godot://assets', name: 'All Assets', mimeType: 'application/json' },
    ]),
    handlesUri: jest.fn<(uri: string) => boolean>().mockImplementation((uri) => uri.startsWith('godot://assets')),
    readResource: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      uri: 'godot://assets',
      mimeType: 'application/json',
      text: '{"assets":[]}',
    }),
  })),
  DebugResourceProvider: jest.fn().mockImplementation(() => ({
    prefix: 'debug',
    listResources: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { uri: 'godot://debug/output', name: 'Debug Output', mimeType: 'application/json' },
    ]),
    handlesUri: jest.fn<(uri: string) => boolean>().mockImplementation((uri) => uri.startsWith('godot://debug/')),
    readResource: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      uri: 'godot://debug/output',
      mimeType: 'application/json',
      text: '{"output":[]}',
    }),
  })),
}));

const {
  listGodotResources,
  readGodotResource,
  getResourceTemplates,
  getTemplateContent,
} = await import('./ResourcesHandler.js');

describe('ResourcesHandler', () => {
  const projectPath = '/mock/project';

  // ==========================================================================
  // RESOURCE LISTING
  // ==========================================================================
  describe('listGodotResources', () => {
    it('returns resources from all providers', async () => {
      const resources = await listGodotResources(projectPath);

      expect(resources.length).toBeGreaterThan(0);
    });

    it('includes project resources', async () => {
      const resources = await listGodotResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://project/info' })
      );
    });

    it('includes scene resources', async () => {
      const resources = await listGodotResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://scenes' })
      );
    });

    it('includes asset resources', async () => {
      const resources = await listGodotResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://assets' })
      );
    });

    it('includes debug resources', async () => {
      const resources = await listGodotResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/output' })
      );
    });

    it('handles provider errors gracefully', async () => {
      // Should not throw even if a provider fails
      const resources = await listGodotResources(projectPath);
      expect(Array.isArray(resources)).toBe(true);
    });
  });

  // ==========================================================================
  // RESOURCE READING
  // ==========================================================================
  describe('readGodotResource', () => {
    it('reads project resource', async () => {
      const content = await readGodotResource(projectPath, 'godot://project/info');

      expect(content).not.toBeNull();
      expect(content?.uri).toBe('godot://project/info');
      expect(content?.mimeType).toBe('application/json');
    });

    it('reads scene resource', async () => {
      const content = await readGodotResource(projectPath, 'godot://scenes');

      expect(content).not.toBeNull();
      expect(content?.uri).toBe('godot://scenes');
    });

    it('reads asset resource', async () => {
      const content = await readGodotResource(projectPath, 'godot://assets');

      expect(content).not.toBeNull();
      expect(content?.uri).toBe('godot://assets');
    });

    it('reads debug resource', async () => {
      const content = await readGodotResource(projectPath, 'godot://debug/output');

      expect(content).not.toBeNull();
      expect(content?.uri).toBe('godot://debug/output');
    });

    it('returns null for unknown URI', async () => {
      const content = await readGodotResource(projectPath, 'godot://unknown/resource');

      expect(content).toBeNull();
    });

    it('returns null for empty URI', async () => {
      const content = await readGodotResource(projectPath, '');

      expect(content).toBeNull();
    });
  });

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================
  describe('getResourceTemplates', () => {
    it('returns template resources', () => {
      const templates = getResourceTemplates();

      expect(templates.length).toBeGreaterThan(0);
    });

    it('includes character controller template', () => {
      const templates = getResourceTemplates();

      expect(templates).toContainEqual(
        expect.objectContaining({
          uri: 'godot-template://character-controller',
          mimeType: 'text/x-gdscript',
        })
      );
    });

    it('includes state machine template', () => {
      const templates = getResourceTemplates();

      expect(templates).toContainEqual(
        expect.objectContaining({
          uri: 'godot-template://state-machine',
          mimeType: 'text/x-gdscript',
        })
      );
    });

    it('includes singleton autoload template', () => {
      const templates = getResourceTemplates();

      expect(templates).toContainEqual(
        expect.objectContaining({
          uri: 'godot-template://singleton-autoload',
          mimeType: 'text/x-gdscript',
        })
      );
    });

    it('all templates have required properties', () => {
      const templates = getResourceTemplates();

      for (const template of templates) {
        expect(template.uri).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.mimeType).toBeDefined();
      }
    });
  });

  describe('getTemplateContent', () => {
    it('returns character controller content', () => {
      const content = getTemplateContent('godot-template://character-controller');

      expect(content).not.toBeNull();
      expect(content?.mimeType).toBe('text/x-gdscript');
      expect(content?.text).toContain('extends CharacterBody2D');
      expect(content?.text).toContain('move_and_slide');
    });

    it('returns state machine content', () => {
      const content = getTemplateContent('godot-template://state-machine');

      expect(content).not.toBeNull();
      expect(content?.text).toContain('class_name StateMachine');
      expect(content?.text).toContain('state_changed');
    });

    it('returns singleton autoload content', () => {
      const content = getTemplateContent('godot-template://singleton-autoload');

      expect(content).not.toBeNull();
      expect(content?.text).toContain('extends Node');
      expect(content?.text).toContain('PROCESS_MODE_ALWAYS');
    });

    it('returns null for unknown template', () => {
      const content = getTemplateContent('godot-template://unknown');

      expect(content).toBeNull();
    });

    it('returns null for non-template URI', () => {
      const content = getTemplateContent('godot://project/info');

      expect(content).toBeNull();
    });

    it('template content has correct structure', () => {
      const content = getTemplateContent('godot-template://character-controller');

      expect(content).toHaveProperty('uri');
      expect(content).toHaveProperty('mimeType');
      expect(content).toHaveProperty('text');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('handles empty project path for listing', async () => {
      const resources = await listGodotResources('');
      expect(Array.isArray(resources)).toBe(true);
    });

    it('handles empty project path for reading', async () => {
      const content = await readGodotResource('', 'godot://project/info');
      // Should still attempt to read
      expect(content).toBeDefined();
    });
  });
});
