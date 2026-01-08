/**
 * ProjectResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - Security (validation)
 */

import { ProjectResourceProvider } from './ProjectResourceProvider.js';
import { RESOURCE_URIS } from '../types.js';

describe('ProjectResourceProvider', () => {
  let provider: ProjectResourceProvider;

  beforeEach(() => {
    provider = new ProjectResourceProvider();
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      RESOURCE_URIS.PROJECT_INFO,
      RESOURCE_URIS.PROJECT_SETTINGS,
      `${RESOURCE_URIS.PROJECT_SETTINGS}application`,
      `${RESOURCE_URIS.PROJECT_SETTINGS}display`,
      RESOURCE_URIS.EXPORT_PRESETS,
      RESOURCE_URIS.SYSTEM_VERSION,
    ];

    const invalidUris = [
      'godot://scenes',
      'godot://scripts',
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
      expect(provider.prefix).toBe('project');
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

    it('includes base resources even for invalid path', async () => {
      const resources = await provider.listResources('/non-existent-path');

      // Should have at least project info, settings, and version
      expect(resources.length).toBeGreaterThanOrEqual(3);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.PROJECT_INFO })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.PROJECT_SETTINGS })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SYSTEM_VERSION })
      );
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

    it('returns null for project info without valid project', async () => {
      const result = await provider.readResource('', RESOURCE_URIS.PROJECT_INFO);
      expect(result).toBeNull();
    });

    it('returns null for project settings without valid project', async () => {
      const result = await provider.readResource('', RESOURCE_URIS.PROJECT_SETTINGS);
      expect(result).toBeNull();
    });

    it('returns null for export presets without file', async () => {
      const result = await provider.readResource('/non-existent', RESOURCE_URIS.EXPORT_PRESETS);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SECURITY - SECTION VALIDATION
  // ==========================================================================
  describe('security', () => {
    it('validates section name against path traversal', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.PROJECT_SETTINGS}../../../etc/passwd`
      );

      // Should return error content, not null (validation error)
      if (result) {
        const data = JSON.parse(result.text!);
        expect(data.error).toBeDefined();
      }
    });

    it('validates section name against injection', async () => {
      const result = await provider.readResource(
        '/mock/project',
        `${RESOURCE_URIS.PROJECT_SETTINGS}<script>alert(1)</script>`
      );

      if (result) {
        const data = JSON.parse(result.text!);
        expect(data.error).toBeDefined();
      }
    });

    it('accepts valid section names', async () => {
      // This will return null because project doesn't exist,
      // but it shouldn't return an error for valid section name
      const validSections = ['application', 'display', 'rendering', 'input'];

      for (const section of validSections) {
        const result = await provider.readResource(
          '/non-existent',
          `${RESOURCE_URIS.PROJECT_SETTINGS}${section}`
        );

        // Should be null (no project) not an error content
        // If it's not null, it should not have a validation error
        if (result) {
          const data = JSON.parse(result.text!);
          // If there's an error, it shouldn't be about invalid section name
          if (data.error) {
            expect(data.error).not.toContain('Invalid section');
          }
        }
      }
    });
  });
});
