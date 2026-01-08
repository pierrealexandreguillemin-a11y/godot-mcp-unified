/**
 * AssetsResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - Security (path validation)
 */

import { AssetsResourceProvider } from './AssetsResourceProvider.js';
import { RESOURCE_URIS } from '../types.js';

describe('AssetsResourceProvider', () => {
  let provider: AssetsResourceProvider;

  beforeEach(() => {
    provider = new AssetsResourceProvider();
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      RESOURCE_URIS.ASSETS,
      RESOURCE_URIS.RESOURCES,
      `${RESOURCE_URIS.ASSETS_CATEGORY}images`,
      `${RESOURCE_URIS.ASSETS_CATEGORY}audio`,
      `${RESOURCE_URIS.ASSETS_CATEGORY}models`,
      `${RESOURCE_URIS.UID}icon.png`,
      `${RESOURCE_URIS.UID}assets/sprites/player.png`,
    ];

    const invalidUris = [
      'godot://project/info',
      'godot://scenes',
      'godot://scripts',
      'godot://debug/output',
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
      expect(provider.prefix).toBe('assets');
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
        expect.objectContaining({ uri: RESOURCE_URIS.ASSETS })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.RESOURCES })
      );
    });

    it('includes category-specific resources', async () => {
      const resources = await provider.listResources('/non-existent-path');
      const categories = ['images', 'audio', 'models', 'fonts', 'shaders'];

      for (const category of categories) {
        expect(resources).toContainEqual(
          expect.objectContaining({
            uri: `${RESOURCE_URIS.ASSETS_CATEGORY}${category}`,
          })
        );
      }
    });

    it('all resources have required properties', async () => {
      const resources = await provider.listResources('/non-existent-path');

      for (const resource of resources) {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.mimeType).toBe('application/json');
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

    it('returns assets list structure for invalid project', async () => {
      const result = await provider.readResource('/non-existent', RESOURCE_URIS.ASSETS);
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.assets).toEqual([]);
    });

    it('returns resources list structure for invalid project', async () => {
      const result = await provider.readResource('/non-existent', RESOURCE_URIS.RESOURCES);
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.resources).toEqual([]);
    });

    it('returns category assets structure for invalid project', async () => {
      const result = await provider.readResource(
        '/non-existent',
        `${RESOURCE_URIS.ASSETS_CATEGORY}images`
      );
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.assets).toEqual([]);
    });

    it('returns error for invalid category', async () => {
      const result = await provider.readResource(
        '/non-existent',
        `${RESOURCE_URIS.ASSETS_CATEGORY}invalid_category`
      );
      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('returns null for UID without project', async () => {
      const result = await provider.readResource('', `${RESOURCE_URIS.UID}icon.png`);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SECURITY - PATH VALIDATION
  // ==========================================================================
  describe('security', () => {
    const traversalPatterns = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'assets/../../../secret',
    ];

    for (const pattern of traversalPatterns) {
      it(`blocks path traversal in UID: ${pattern}`, async () => {
        const result = await provider.readResource(
          '/mock/project',
          `${RESOURCE_URIS.UID}${pattern}`
        );

        // Security: path traversal MUST return an error response, not null
        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });
    }

    it('validates category against injection', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.ASSETS_CATEGORY}<script>alert(1)</script>`
      );

      // Security: injection MUST return an error response
      expect(result).not.toBeNull();
      expect(result!.text).toBeDefined();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('accepts valid UID paths', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.UID}icon.png`
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
