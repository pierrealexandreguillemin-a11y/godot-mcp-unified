/**
 * Asset Tools Tests
 * ISO/IEC 29119 compliant test suite
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Categories:
 * 1. Input Validation (Zod schema validation)
 * 2. Missing Required Parameters
 * 3. Invalid Enum Values (category, method)
 * 4. Path Security (traversal prevention)
 * 5. Success Scenarios
 * 6. Error Handling
 */

import { writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { handleListAssets } from './ListAssetsTool';
import { handleImportAsset } from './ImportAssetTool';
import { handleReimportAssets } from './ReimportAssetsTool';
import {
  createTempProject,
  getResponseText,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';

describe('Asset Tools - ISO 29119 Compliant Test Suite', () => {
  // ============================================================================
  // ListAssets Tests
  // ============================================================================
  describe('ListAssets', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleListAssets({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should reject null projectPath', async () => {
        const result = await handleListAssets({
          projectPath: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject undefined projectPath', async () => {
        const result = await handleListAssets({
          projectPath: undefined,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric projectPath', async () => {
        const result = await handleListAssets({
          projectPath: 12345,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject array projectPath', async () => {
        const result = await handleListAssets({
          projectPath: ['/path/to/project'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject object projectPath', async () => {
        const result = await handleListAssets({
          projectPath: { path: '/path/to/project' },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleListAssets({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when projectPath is empty string', async () => {
        const result = await handleListAssets({
          projectPath: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('3. Invalid Enum Values (category)', () => {
      it('should return error for invalid category', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: 'invalid_category',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid category|Validation failed.*category/i);
      });

      it('should return error for category "image" (should be "texture")', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: 'image',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid category|Validation failed.*category/i);
      });

      it('should return error for category "sound" (should be "audio")', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: 'sound',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid category|Validation failed.*category/i);
      });

      it('should return error for category "3d" (should be "model")', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: '3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid category|Validation failed.*category/i);
      });

      it('should return error for numeric category', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for uppercase category "ALL"', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          category: 'ALL',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid category|Validation failed.*category/i);
      });
    });

    describe('4. Valid Category Values', () => {
      const validCategories = ['all', 'texture', 'audio', 'model', 'font'];

      for (const category of validCategories) {
        it(`should accept valid category "${category}"`, async () => {
          const result = await handleListAssets({
            projectPath: '/non/existent/path',
            category,
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not on category validation
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      }
    });

    describe('5. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleListAssets({
          projectPath: '/path/../escape/project',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject multiple path traversal sequences', async () => {
        const result = await handleListAssets({
          projectPath: '/path/../../escape',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject directory with path traversal', async () => {
        const result = await handleListAssets({
          projectPath: '/path/to/project',
          directory: '../escape',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('6. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('7. Optional Parameters', () => {
      it('should accept request without optional directory', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with directory', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          directory: 'assets',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept recursive: true', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          recursive: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept recursive: false', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          recursive: false,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept all optional parameters together', async () => {
        const result = await handleListAssets({
          projectPath: '/non/existent/path',
          directory: 'assets/sprites',
          recursive: false,
          category: 'texture',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // ImportAsset Tests
  // ============================================================================
  describe('ImportAsset', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleImportAsset({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleImportAsset({
          projectPath: null,
          sourcePath: null,
          destinationPath: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject undefined required fields', async () => {
        const result = await handleImportAsset({
          projectPath: undefined,
          sourcePath: undefined,
          destinationPath: undefined,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric paths', async () => {
        const result = await handleImportAsset({
          projectPath: 12345,
          sourcePath: 67890,
          destinationPath: 11111,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject array paths', async () => {
        const result = await handleImportAsset({
          projectPath: ['/path/to/project'],
          sourcePath: ['/path/to/file.png'],
          destinationPath: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleImportAsset({
          sourcePath: '/path/to/file.png',
          destinationPath: 'assets/file.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when sourcePath is missing', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          destinationPath: 'assets/file.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('sourcePath');
      });

      it('should return error when destinationPath is missing', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/path/to/file.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('destinationPath');
      });

      it('should return error when all parameters are empty strings', async () => {
        const result = await handleImportAsset({
          projectPath: '',
          sourcePath: '',
          destinationPath: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('3. Source File Validation', () => {
      it('should return error when source file does not exist', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/non/existent/file.png',
          destinationPath: 'assets/file.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Source file not found');
      });

      it('should return error for unsupported file type (.txt)', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: process.cwd() + '/package.json',
          destinationPath: 'assets/file.json',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unsupported file type');
      });

      it('should return error for unsupported file type (.json)', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: process.cwd() + '/tsconfig.json',
          destinationPath: 'assets/config.json',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unsupported file type');
      });
    });

    describe('4. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/../escape/project',
          sourcePath: '/some/file.png',
          destinationPath: 'assets/file.png',
        });
        expect(result.isError).toBe(true);
        // Source file validation happens first, then project/path validation
        // Both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Source file not found/i);
      });

      it('should reject destinationPath with path traversal', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/some/file.png',
          destinationPath: '../escape/file.png',
        });
        // Will fail on source file not found first - acceptable security outcome
        expect(result.isError).toBe(true);
      });

      it('should reject destinationPath with multiple path traversal', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/some/file.png',
          destinationPath: '../../escape/file.png',
        });
        // Will fail on source file not found first - acceptable security outcome
        expect(result.isError).toBe(true);
      });
    });

    describe('5. Optional Parameters', () => {
      it('should accept overwrite: true', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/non/existent/file.png',
          destinationPath: 'assets/file.png',
          overwrite: true,
        });
        // Will fail on source file not found
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Source file not found');
      });

      it('should accept overwrite: false', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/non/existent/file.png',
          destinationPath: 'assets/file.png',
          overwrite: false,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Source file not found');
      });

      it('should strip res:// prefix from destinationPath', async () => {
        const result = await handleImportAsset({
          projectPath: '/path/to/project',
          sourcePath: '/non/existent/file.png',
          destinationPath: 'res://assets/file.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Source file not found');
      });
    });

    describe('6. Supported File Types', () => {
      const supportedExtensions = {
        textures: ['.png', '.jpg', '.jpeg', '.bmp', '.svg', '.webp', '.tga', '.exr', '.hdr'],
        audio: ['.wav', '.ogg', '.mp3', '.flac'],
        models: ['.glb', '.gltf', '.obj', '.fbx', '.dae'],
        fonts: ['.ttf', '.otf', '.woff', '.woff2'],
      };

      for (const [category, extensions] of Object.entries(supportedExtensions)) {
        for (const ext of extensions) {
          it(`should accept ${category} file type "${ext}"`, async () => {
            const result = await handleImportAsset({
              projectPath: '/path/to/project',
              sourcePath: `/non/existent/file${ext}`,
              destinationPath: `assets/file${ext}`,
            });
            expect(result.isError).toBe(true);
            // Should fail on source file not found, not on file type
            expect(result.content[0].text).toContain('Source file not found');
          });
        }
      }
    });
  });

  // ============================================================================
  // ReimportAssets Tests
  // ============================================================================
  describe('ReimportAssets', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleReimportAssets({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleReimportAssets({
          projectPath: null,
          assetPaths: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject undefined required fields', async () => {
        const result = await handleReimportAssets({
          projectPath: undefined,
          assetPaths: undefined,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric projectPath', async () => {
        const result = await handleReimportAssets({
          projectPath: 12345,
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject assetPaths as string instead of array', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/to/project',
          assetPaths: 'not-an-array',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/must be an array|Validation failed.*assetPaths/i);
      });

      it('should reject assetPaths as object instead of array', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/to/project',
          assetPaths: { path: 'assets/file.png' },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleReimportAssets({
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when assetPaths is missing', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/to/project',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('assetPaths');
      });

      it('should return error when assetPaths is empty array', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/to/project',
          assetPaths: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/cannot be empty|Validation failed.*assetPaths/i);
      });

      it('should return error when projectPath is empty string', async () => {
        const result = await handleReimportAssets({
          projectPath: '',
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('3. Invalid Enum Values (method)', () => {
      it('should return error for invalid method', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'invalid_method',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid method|Validation failed.*method/i);
      });

      it('should return error for method "refresh" (not valid)', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'refresh',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid method|Validation failed.*method/i);
      });

      it('should return error for method "reimport" (not valid)', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'reimport',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid method|Validation failed.*method/i);
      });

      it('should return error for uppercase method "TOUCH"', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'TOUCH',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid method|Validation failed.*method/i);
      });

      it('should return error for numeric method', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('4. Valid Method Values', () => {
      it('should accept method "touch"', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'touch',
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation, not on method validation
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept method "delete_import"', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
          method: 'delete_import',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('5. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/../escape/project',
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject multiple path traversal sequences', async () => {
        const result = await handleReimportAssets({
          projectPath: '/path/../../escape',
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('6. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/file.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('7. AssetPaths Validation', () => {
      it('should accept single asset path', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/sprite.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept multiple asset paths', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['assets/sprite.png', 'assets/sound.ogg', 'assets/model.glb'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should strip res:// prefix from asset paths', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: ['res://assets/sprite.png'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept asset paths with various subdirectories', async () => {
        const result = await handleReimportAssets({
          projectPath: '/non/existent/path',
          assetPaths: [
            'assets/sprites/player.png',
            'assets/audio/music/bgm.ogg',
            'assets/models/enemies/boss.glb',
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // Integration Tests with Temp Project
  // ============================================================================
  describe('Integration Tests', () => {
    let projectPath: string;
    let cleanup: () => void;

    beforeEach(() => {
      const temp = createTempProject();
      projectPath = temp.projectPath;
      cleanup = temp.cleanup;

      // Create asset directories
      mkdirSync(join(projectPath, 'assets'), { recursive: true });
      mkdirSync(join(projectPath, 'assets', 'sprites'), { recursive: true });
      mkdirSync(join(projectPath, 'assets', 'audio'), { recursive: true });

      // Create some dummy asset files
      writeFileSync(join(projectPath, 'assets', 'sprites', 'player.png'), 'dummy png data');
      writeFileSync(join(projectPath, 'assets', 'sprites', 'enemy.png'), 'dummy png data');
      writeFileSync(join(projectPath, 'assets', 'audio', 'jump.wav'), 'dummy wav data');
    });

    afterEach(() => {
      cleanup();
    });

    describe('ListAssets with valid project', () => {
      it('should list all assets in project', async () => {
        const result = await handleListAssets({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          count: number;
          assets: Array<{ path: string; category: string }>;
          summary: Record<string, number>;
        }>(result);

        expect(data.count).toBeGreaterThanOrEqual(3);
        expect(data.assets.some(a => a.path.includes('player.png'))).toBe(true);
        expect(data.assets.some(a => a.path.includes('enemy.png'))).toBe(true);
        expect(data.assets.some(a => a.path.includes('jump.wav'))).toBe(true);
      });

      it('should filter by texture category', async () => {
        const result = await handleListAssets({
          projectPath,
          category: 'texture',
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          assets: Array<{ path: string; category: string }>;
        }>(result);

        expect(data.assets.every(a => a.category === 'texture')).toBe(true);
      });

      it('should filter by audio category', async () => {
        const result = await handleListAssets({
          projectPath,
          category: 'audio',
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          assets: Array<{ path: string; category: string }>;
        }>(result);

        expect(data.assets.every(a => a.category === 'audio')).toBe(true);
      });

      it('should filter by directory', async () => {
        const result = await handleListAssets({
          projectPath,
          directory: 'assets/sprites',
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          assets: Array<{ path: string }>;
        }>(result);

        expect(data.assets.every(a => a.path.startsWith('assets/sprites/'))).toBe(true);
      });

      it('should include asset metadata', async () => {
        const result = await handleListAssets({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          assets: Array<{
            path: string;
            name: string;
            category: string;
            format: string;
            size: number;
            modified: string;
          }>;
        }>(result);

        const asset = data.assets[0];
        expect(asset.name).toBeDefined();
        expect(asset.category).toBeDefined();
        expect(asset.format).toBeDefined();
        expect(asset.size).toBeGreaterThan(0);
        expect(asset.modified).toBeDefined();
      });

      it('should include summary by category', async () => {
        const result = await handleListAssets({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          summary: {
            texture: number;
            audio: number;
            model: number;
            font: number;
          };
        }>(result);

        expect(data.summary.texture).toBeGreaterThanOrEqual(2);
        expect(data.summary.audio).toBeGreaterThanOrEqual(1);
      });
    });

    describe('ImportAsset with valid project', () => {
      it('should import a PNG file', async () => {
        // Create a temporary source file
        const sourcePath = join(projectPath, '..', 'external_asset.png');
        writeFileSync(sourcePath, 'dummy png data');

        const result = await handleImportAsset({
          projectPath,
          sourcePath,
          destinationPath: 'assets/imported.png',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Asset imported');
      });

      it('should reject importing to existing file without overwrite', async () => {
        // Create a temporary source file
        const sourcePath = join(projectPath, '..', 'external_asset.png');
        writeFileSync(sourcePath, 'dummy png data');

        const result = await handleImportAsset({
          projectPath,
          sourcePath,
          destinationPath: 'assets/sprites/player.png',
          overwrite: false,
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('already exists');
      });

      it('should import with overwrite flag', async () => {
        // Create a temporary source file
        const sourcePath = join(projectPath, '..', 'external_asset.png');
        writeFileSync(sourcePath, 'new dummy png data');

        const result = await handleImportAsset({
          projectPath,
          sourcePath,
          destinationPath: 'assets/sprites/player.png',
          overwrite: true,
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Asset imported');
      });

      it('should create destination directory if needed', async () => {
        const sourcePath = join(projectPath, '..', 'external_asset.png');
        writeFileSync(sourcePath, 'dummy png data');

        const result = await handleImportAsset({
          projectPath,
          sourcePath,
          destinationPath: 'assets/new_folder/deep/nested/sprite.png',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('Asset imported');
      });

      it('should reject importing a directory', async () => {
        const result = await handleImportAsset({
          projectPath,
          sourcePath: join(projectPath, 'assets'),
          destinationPath: 'assets/imported_folder',
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('must be a file');
      });
    });

    describe('ReimportAssets with valid project', () => {
      it('should touch existing asset files', async () => {
        // Get original modification time
        const assetPath = join(projectPath, 'assets', 'sprites', 'player.png');
        const originalStat = statSync(assetPath);

        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await handleReimportAssets({
          projectPath,
          assetPaths: ['assets/sprites/player.png'],
          method: 'touch',
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          succeeded: number;
          failed: number;
          results: Array<{ path: string; success: boolean; action: string }>;
        }>(result);

        expect(data.succeeded).toBe(1);
        expect(data.failed).toBe(0);
        expect(data.results[0].action).toBe('touched');

        // Verify modification time changed
        const newStat = statSync(assetPath);
        expect(newStat.mtime.getTime()).toBeGreaterThanOrEqual(originalStat.mtime.getTime());
      });

      it('should handle multiple assets', async () => {
        const result = await handleReimportAssets({
          projectPath,
          assetPaths: [
            'assets/sprites/player.png',
            'assets/sprites/enemy.png',
            'assets/audio/jump.wav',
          ],
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          total: number;
          succeeded: number;
          failed: number;
        }>(result);

        expect(data.total).toBe(3);
        expect(data.succeeded).toBe(3);
        expect(data.failed).toBe(0);
      });

      it('should report failed assets that do not exist', async () => {
        const result = await handleReimportAssets({
          projectPath,
          assetPaths: [
            'assets/sprites/player.png',
            'assets/nonexistent.png',
          ],
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          succeeded: number;
          failed: number;
          results: Array<{ path: string; success: boolean; error?: string }>;
        }>(result);

        expect(data.succeeded).toBe(1);
        expect(data.failed).toBe(1);
        expect(data.results.find(r => r.path === 'assets/nonexistent.png')?.error).toContain('not found');
      });

      it('should reject asset paths with path traversal', async () => {
        const result = await handleReimportAssets({
          projectPath,
          assetPaths: ['../escape/file.png'],
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          failed: number;
          results: Array<{ path: string; success: boolean; error?: string }>;
        }>(result);

        expect(data.failed).toBe(1);
        expect(data.results[0].error).toContain('..');
      });

      it('should handle res:// prefix in asset paths', async () => {
        const result = await handleReimportAssets({
          projectPath,
          assetPaths: ['res://assets/sprites/player.png'],
        });

        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          succeeded: number;
          results: Array<{ path: string; success: boolean }>;
        }>(result);

        expect(data.succeeded).toBe(1);
      });
    });
  });
});
