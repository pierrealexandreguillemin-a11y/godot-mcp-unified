/**
 * SceneScriptResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - Security (path validation)
 */

import { SceneScriptResourceProvider } from './SceneScriptResourceProvider.js';
import { RESOURCE_URIS } from '../types.js';

describe('SceneScriptResourceProvider', () => {
  let provider: SceneScriptResourceProvider;

  beforeEach(() => {
    provider = new SceneScriptResourceProvider();
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      RESOURCE_URIS.SCENES,
      RESOURCE_URIS.SCRIPTS,
      RESOURCE_URIS.SCRIPT_ERRORS,
      `${RESOURCE_URIS.SCENE}main.tscn`,
      `${RESOURCE_URIS.SCENE}levels/world1.tscn`,
      `${RESOURCE_URIS.SCENE}main.tscn/tree`,
      `${RESOURCE_URIS.SCRIPT}player.gd`,
      `${RESOURCE_URIS.SCRIPT}entities/enemy.gd`,
    ];

    const invalidUris = [
      'godot://project/info',
      'godot://assets',
      'godot://debug/output',
      'godot://unknown',
    ];

    for (const uri of validUris) {
      it(`handles ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(true);
      });
    }

    for (const uri of invalidUris) {
      it(`does not handle ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(false);
      });
    }
  });

  // ==========================================================================
  // PREFIX
  // ==========================================================================
  describe('prefix', () => {
    it('has correct prefix', () => {
      expect(provider.prefix).toBe('scene-script');
    });
  });

  // ==========================================================================
  // RESOURCE LISTING STRUCTURE
  // ==========================================================================
  describe('listResources', () => {
    it('returns array of resources', async () => {
      const resources = await provider.listResources('/non-existent-path');
      expect(Array.isArray(resources)).toBe(true);
    });

    it('includes base resources', async () => {
      const resources = await provider.listResources('/non-existent-path');

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCENES })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCRIPTS })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SCRIPT_ERRORS })
      );
    });

    it('all resources have required properties', async () => {
      const resources = await provider.listResources('/non-existent-path');

      for (const resource of resources) {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.mimeType).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // READ RESOURCE - EDGE CASES
  // ==========================================================================
  describe('readResource', () => {
    it('returns null for unknown URI', async () => {
      const result = await provider.readResource('/path', 'godot://unknown');
      expect(result).toBeNull();
    });

    it('returns scenes list structure for invalid project', async () => {
      const result = await provider.readResource('/non-existent', RESOURCE_URIS.SCENES);
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.scenes).toEqual([]);
    });

    it('returns scripts list structure for invalid project', async () => {
      const result = await provider.readResource('/non-existent', RESOURCE_URIS.SCRIPTS);
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.scripts).toEqual([]);
    });

    it('returns script errors placeholder', async () => {
      const result = await provider.readResource('/any', RESOURCE_URIS.SCRIPT_ERRORS);
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.note).toContain('--check-only');
      expect(data.errors).toEqual([]);
      expect(data.warnings).toEqual([]);
    });
  });

  // ==========================================================================
  // SECURITY - PATH VALIDATION
  // ==========================================================================
  describe('security', () => {
    const traversalPatterns = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'scenes/../../../secret',
    ];

    for (const pattern of traversalPatterns) {
      it(`blocks path traversal in scene: ${pattern}`, async () => {
        const result = await provider.readResource(
          '/mock/project',
          `${RESOURCE_URIS.SCENE}${pattern}`
        );

        // Security: path traversal MUST return an error response, not null
        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });

      it(`blocks path traversal in script: ${pattern}`, async () => {
        const result = await provider.readResource(
          '/mock/project',
          `${RESOURCE_URIS.SCRIPT}${pattern}`
        );

        // Security: path traversal MUST return an error response, not null
        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });
    }

    it('accepts valid scene paths', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.SCENE}main.tscn`
      );

      // Valid path: may return null (not found) or result without security error
      if (result && result.text) {
        const data = JSON.parse(result.text);
        if (data.error) {
          // If there's an error, it should NOT be a security error
          expect(data.error.toLowerCase()).not.toMatch(/traversal|parent|forbidden/);
        }
      }
      // null result is acceptable for non-existent files
    });

    it('accepts valid script paths', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.SCRIPT}player.gd`
      );

      // Valid path: may return null (not found) or result without security error
      if (result && result.text) {
        const data = JSON.parse(result.text);
        if (data.error) {
          // If there's an error, it should NOT be a security error
          expect(data.error.toLowerCase()).not.toMatch(/traversal|parent|forbidden/);
        }
      }
      // null result is acceptable for non-existent files
    });
  });
});
