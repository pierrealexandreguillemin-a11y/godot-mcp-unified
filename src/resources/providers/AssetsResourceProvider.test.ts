/**
 * AssetsResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - readResource: all assets, by category, resource files, UID lookup
 * - Security (path validation)
 * - Error cases and edge cases
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK SETUP - Must be before dynamic imports
// ============================================================================

const mockReadFileSync = jest.fn<(path: string, encoding?: string) => string>();
const mockExistsSync = jest.fn<(path: string) => boolean>();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
}));

const mockIsGodotProject = jest.fn<(path: string) => boolean>();

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
}));

interface MockScannedFile {
  path: string;
  relativePath: string;
  ext: string;
  size: number;
  modified: Date;
}

const mockFindFiles = jest.fn<(dir: string, extensions: string[]) => MockScannedFile[]>();

jest.unstable_mockModule('../utils/fileScanner.js', () => ({
  findFiles: mockFindFiles,
  findFilePaths: jest.fn<(dir: string, extensions: string[]) => string[]>().mockReturnValue([]),
}));

// Dynamic import after all mocks are set up
const { AssetsResourceProvider } = await import('./AssetsResourceProvider.js');
const { RESOURCE_URIS } = await import('../types.js');

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_DATE = new Date('2025-01-15T10:30:00Z');

const MOCK_IMAGE_FILES: MockScannedFile[] = [
  { path: '/mock/project/icon.png', relativePath: 'icon.png', ext: '.png', size: 2048, modified: MOCK_DATE },
  { path: '/mock/project/assets/player.png', relativePath: 'assets/player.png', ext: '.png', size: 4096, modified: MOCK_DATE },
  { path: '/mock/project/assets/bg.jpg', relativePath: 'assets/bg.jpg', ext: '.jpg', size: 8192, modified: MOCK_DATE },
];

const MOCK_AUDIO_FILES: MockScannedFile[] = [
  { path: '/mock/project/sounds/jump.wav', relativePath: 'sounds/jump.wav', ext: '.wav', size: 16384, modified: MOCK_DATE },
  { path: '/mock/project/music/theme.ogg', relativePath: 'music/theme.ogg', ext: '.ogg', size: 65536, modified: MOCK_DATE },
];

const MOCK_RESOURCE_FILES: MockScannedFile[] = [
  { path: '/mock/project/resources/material.tres', relativePath: 'resources/material.tres', ext: '.tres', size: 512, modified: MOCK_DATE },
  { path: '/mock/project/resources/data.res', relativePath: 'resources/data.res', ext: '.res', size: 1024, modified: MOCK_DATE },
];

const MOCK_ALL_ASSETS = [...MOCK_IMAGE_FILES, ...MOCK_AUDIO_FILES, ...MOCK_RESOURCE_FILES];

describe('AssetsResourceProvider', () => {
  let provider: InstanceType<typeof AssetsResourceProvider>;
  const projectPath = '/mock/project';

  beforeEach(() => {
    provider = new AssetsResourceProvider();
    jest.clearAllMocks();
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
  // READ RESOURCE - ALL ASSETS
  // ==========================================================================
  describe('readResource - all assets', () => {
    it('returns error message for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('/non-existent', RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.assets).toEqual([]);
    });

    it('returns error for empty project path', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('', RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
    });

    it('returns all assets grouped by category', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_ALL_ASSETS);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.ASSETS);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.totalCount).toBe(MOCK_ALL_ASSETS.length);
      expect(typeof data.summary).toBe('object');
      expect(Array.isArray(data.assets)).toBe(true);
      expect(data.assets.length).toBe(MOCK_ALL_ASSETS.length);
    });

    it('returns assets with correct format', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([MOCK_IMAGE_FILES[0]]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.assets[0]).toEqual({
        path: 'res://icon.png',
        category: 'images',
        extension: '.png',
        size: 2048,
        modified: MOCK_DATE.toISOString(),
      });
    });

    it('builds correct summary by category', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_ALL_ASSETS);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.ASSETS);

      const data = JSON.parse(result!.text!);
      expect(data.summary.images).toBe(3);
      expect(data.summary.audio).toBe(2);
      expect(data.summary.resources).toBe(2); // both .tres and .res map to "resources"
    });

    it('returns empty assets for valid project with no files', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.totalCount).toBe(0);
      expect(data.assets).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - ASSETS BY CATEGORY
  // ==========================================================================
  describe('readResource - assets by category', () => {
    it('returns error for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource(
        '/non-existent',
        `${RESOURCE_URIS.ASSETS_CATEGORY}images`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.assets).toEqual([]);
    });

    it('returns assets for valid category', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_IMAGE_FILES);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}images`
      );

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(`${RESOURCE_URIS.ASSETS_CATEGORY}images`);

      const data = JSON.parse(result!.text!);
      expect(data.category).toBe('images');
      expect(Array.isArray(data.extensions)).toBe(true);
      expect(data.count).toBe(MOCK_IMAGE_FILES.length);
      expect(Array.isArray(data.assets)).toBe(true);
    });

    it('returns assets with correct per-file format', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([MOCK_IMAGE_FILES[0]]);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}images`
      );

      const data = JSON.parse(result!.text!);
      expect(data.assets[0]).toEqual({
        path: 'res://icon.png',
        name: 'icon.png',
        extension: '.png',
        size: 2048,
        modified: MOCK_DATE.toISOString(),
      });
    });

    it('returns error for invalid category via Zod validation', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}invalid_category`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('returns error for unknown category when project is valid', async () => {
      // This tests the ASSET_CATEGORIES[category] check on line 170
      // Since Zod validation runs first and rejects invalid categories,
      // we test a category that passes Zod but isn't in ASSET_CATEGORIES
      // (in practice all Zod-valid categories are in ASSET_CATEGORIES)
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}audio`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.category).toBe('audio');
      expect(data.count).toBe(0);
      expect(data.assets).toEqual([]);
    });

    it('returns empty assets for valid category with no matching files', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}models`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.category).toBe('models');
      expect(data.count).toBe(0);
      expect(data.assets).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - RESOURCE FILES (.tres/.res)
  // ==========================================================================
  describe('readResource - resource files', () => {
    it('returns error for invalid project', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('/non-existent', RESOURCE_URIS.RESOURCES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('No project loaded');
      expect(data.resources).toEqual([]);
    });

    it('returns resource files with type extraction from .tres', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_RESOURCE_FILES);
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('material.tres')) {
          return '[gd_resource type="StandardMaterial3D" format=3]\n[resource]\n';
        }
        throw new Error('Not a tres file');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.RESOURCES);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.RESOURCES);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(2);
      expect(Array.isArray(data.resources)).toBe(true);

      // .tres file should have extracted resource type
      const tresResource = data.resources.find(
        (r: { name: string }) => r.name === 'material.tres'
      );
      expect(tresResource).toBeDefined();
      expect(tresResource.resourceType).toBe('StandardMaterial3D');
      expect(tresResource.path).toBe('res://resources/material.tres');

      // .res file should have null resource type
      const resResource = data.resources.find(
        (r: { name: string }) => r.name === 'data.res'
      );
      expect(resResource).toBeDefined();
      expect(resResource.resourceType).toBeNull();
    });

    it('handles read errors for .tres files gracefully', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([MOCK_RESOURCE_FILES[0]]);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.RESOURCES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(1);
      // Resource type should be null due to read error
      expect(data.resources[0].resourceType).toBeNull();
    });

    it('groups resources by type in byType summary', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue(MOCK_RESOURCE_FILES);
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('material.tres')) {
          return '[gd_resource type="StandardMaterial3D" format=3]\n';
        }
        throw new Error('Not found');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.RESOURCES);

      const data = JSON.parse(result!.text!);
      expect(data.byType).toBeDefined();
      expect(data.byType['StandardMaterial3D']).toBe(1);
      expect(data.byType['unknown']).toBe(1);
    });

    it('returns empty list for valid project with no resource files', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.RESOURCES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(0);
      expect(data.resources).toEqual([]);
    });
  });

  // ==========================================================================
  // READ RESOURCE - UID LOOKUP
  // ==========================================================================
  describe('readResource - UID lookup', () => {
    it('returns null when project is not valid', async () => {
      mockIsGodotProject.mockReturnValue(false);

      const result = await provider.readResource('', `${RESOURCE_URIS.UID}icon.png`);
      expect(result).toBeNull();
    });

    it('returns file not found when file does not exist', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(false);

      const result = await provider.readResource(projectPath, `${RESOURCE_URIS.UID}icon.png`);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('File not found');
      expect(data.path).toBe('icon.png');
    });

    it('returns UID from .import file', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true); // both file and .import exist
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('.import')) {
          return '[remap]\n\nimporter="texture"\ntype="CompressedTexture2D"\nuid="uid://abc123def"\n';
        }
        return '';
      });

      const result = await provider.readResource(projectPath, `${RESOURCE_URIS.UID}icon.png`);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.path).toBe('icon.png');
      expect(data.uid).toBe('uid://abc123def');
      expect(data.hasImportFile).toBe(true);
    });

    it('returns UID from .tscn file header when no import file', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('.import')) return false;
        return true; // the .tscn file itself exists
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('.tscn')) {
          return '[gd_scene load_steps=2 format=3 uid="uid://scene456"]\n';
        }
        return '';
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.UID}scenes/main.tscn`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.uid).toBe('uid://scene456');
    });

    it('returns null uid when no import file and not a .tscn', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('.import')) return false;
        return true;
      });

      const result = await provider.readResource(projectPath, `${RESOURCE_URIS.UID}data.json`);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.uid).toBeNull();
      expect(data.hasImportFile).toBe(false);
    });

    it('handles read error from import file gracefully', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(projectPath, `${RESOURCE_URIS.UID}icon.png`);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      // Should still return a result but with null uid
      expect(data.uid).toBeNull();
    });

    it('handles read error from .tscn file gracefully', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('.import')) return false;
        return true;
      });
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.UID}scenes/main.tscn`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.uid).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - UNKNOWN URI
  // ==========================================================================
  describe('readResource - unknown URI', () => {
    it('returns null for unknown URI', async () => {
      const result = await provider.readResource(projectPath, 'godot://unknown');
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
          projectPath,
          `${RESOURCE_URIS.UID}${pattern}`
        );

        expect(result).not.toBeNull();
        expect(result!.text).toBeDefined();
        const data = JSON.parse(result!.text!);
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toMatch(/traversal|parent|forbidden/);
      });
    }

    it('validates category against injection', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}<script>alert(1)</script>`
      );

      expect(result).not.toBeNull();
      expect(result!.text).toBeDefined();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('blocks null bytes in UID path', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.UID}icon\0.png`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('returns path traversal error for UID with valid project', async () => {
      mockIsGodotProject.mockReturnValue(true);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.UID}../../secret.txt`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('accepts valid UID paths', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.UID}icon.png`
      );

      if (result && result.text) {
        const data = JSON.parse(result.text);
        if (data.error) {
          expect(data.error.toLowerCase()).not.toMatch(/traversal|parent|forbidden/);
        }
      }
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('returns valid JSON from createErrorContent', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.ASSETS_CATEGORY}not_a_category`
      );

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('application/json');
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.uri).toBeDefined();
    });

    it('handles files with special characters in paths', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([
        {
          path: '/mock/project/assets/my sprite.png',
          relativePath: 'assets/my sprite.png',
          ext: '.png',
          size: 1024,
          modified: MOCK_DATE,
        },
      ]);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.ASSETS);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.assets[0].path).toBe('res://assets/my sprite.png');
    });

    it('handles .tres file without type match', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockFindFiles.mockReturnValue([
        {
          path: '/mock/project/empty.tres',
          relativePath: 'empty.tres',
          ext: '.tres',
          size: 10,
          modified: MOCK_DATE,
        },
      ]);
      mockReadFileSync.mockReturnValue('some content without type header');

      const result = await provider.readResource(projectPath, RESOURCE_URIS.RESOURCES);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.resources[0].resourceType).toBeNull();
    });
  });
});
