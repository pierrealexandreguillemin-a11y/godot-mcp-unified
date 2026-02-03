/**
 * ImportLdtkLevelTool Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions before mocking modules
const mockValidatePath = jest.fn<() => boolean>();
const mockIsGodotProject = jest.fn<() => boolean>();
const mockExistsSync = jest.fn<() => boolean>();
const mockReadFile = jest.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = jest.fn<(path: string, content: string, encoding: string) => Promise<void>>();
const mockEnsureDir = jest.fn<(path: string) => Promise<void>>();

// Mock modules using unstable_mockModule for ESM support
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: jest.fn(),
  validatePath: mockValidatePath,
  normalizeHandlerPaths: jest.fn(<T>(args: T) => args),
  normalizePath: jest.fn((p: string) => p),
}));

jest.unstable_mockModule('../../core/ParameterNormalizer.js', () => ({
  normalizeParameters: jest.fn(<T>(args: T) => args),
  convertCamelToSnakeCase: jest.fn((s: string) => s),
}));

jest.unstable_mockModule('../../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
}));

jest.unstable_mockModule('fs-extra', () => ({
  existsSync: mockExistsSync,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  ensureDir: mockEnsureDir,
}));

// Dynamic import after mocking
const { handleImportLdtkLevel } = await import('./ImportLdtkLevelTool.js');

// Minimal valid LDtk project fixture
function createLdtkJson(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    jsonVersion: '1.5.3',
    worldGridWidth: 256,
    worldGridHeight: 256,
    defaultGridSize: 16,
    defs: { tilesets: [] },
    levels: [
      {
        identifier: 'Level_0',
        uid: 0,
        worldX: 0,
        worldY: 0,
        pxWid: 256,
        pxHei: 256,
        layerInstances: [
          {
            __identifier: 'Ground',
            __type: 'Tiles',
            __cWid: 16,
            __cHei: 16,
            __gridSize: 16,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetRelPath: 'tilesets/terrain.png',
            gridTiles: [
              { src: [0, 0], px: [0, 0], f: 0, t: 0, a: 1 },
              { src: [16, 0], px: [16, 0], f: 0, t: 1, a: 1 },
            ],
            autoLayerTiles: [],
            intGridCsv: [],
            entityInstances: [],
          },
        ],
      },
    ],
    ...overrides,
  });
}

describe('ImportLdtkLevelTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 1. Input Validation
  // ============================================================================
  describe('Input Validation', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleImportLdtkLevel({
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when ldtkPath is missing', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ldtkPath');
    });

    it('should return error when all required parameters are missing', async () => {
      const result = await handleImportLdtkLevel({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Validation failed/i);
    });

    it('should return error for empty ldtkPath', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: '',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for non-string ldtkPath', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 123 as unknown as string,
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for non-boolean createCollision', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        createCollision: 'yes' as unknown as boolean,
      });
      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // 2. File Extension Validation
  // ============================================================================
  describe('File Extension Validation', () => {
    it('should return error for non-.ldtk extension', async () => {
      mockValidatePath.mockReturnValue(true);
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.json',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.ldtk');
    });

    it('should return error for .tscn extension', async () => {
      mockValidatePath.mockReturnValue(true);
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'scenes/level.tscn',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('.ldtk');
    });
  });

  // ============================================================================
  // 3. Path Security
  // ============================================================================
  describe('Path Security', () => {
    it('should return error for path traversal in projectPath', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/../../../etc/passwd',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
    });

    it('should return error for path traversal in ldtkPath', async () => {
      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: '../../../etc/world.ldtk',
      });
      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // 4. Project Validation
  // ============================================================================
  describe('Project Validation', () => {
    it('should return error for invalid project path', async () => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(false);
      const result = await handleImportLdtkLevel({
        projectPath: '/non/existent/path',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  // ============================================================================
  // 5. File Existence Validation
  // ============================================================================
  describe('File Existence Validation', () => {
    it('should return error when LDtk file does not exist', async () => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(false);

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('LDtk file not found');
    });
  });

  // ============================================================================
  // 6. Happy Path
  // ============================================================================
  describe('Happy Path', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should import all levels successfully', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('LDtk import successful');
      expect(result.content[0].text).toContain('Levels: 1');
      expect(result.content[0].text).toContain('Tiles: 2');
    });

    it('should import specific level by identifier', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        levelIdentifier: 'Level_0',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Levels: 1');
    });

    it('should return error for non-existent level identifier', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        levelIdentifier: 'NonExistent',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Level not found');
      // Available levels are listed in the possible solutions (content[1])
      const allText = result.content.map((c) => c.text).join(' ');
      expect(allText).toContain('Level_0');
    });

    it('should generate .tscn content with correct structure', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('[gd_scene');
      expect(content).toContain('[node name="Level_0" type="Node2D"]');
      expect(content).toContain('[node name="Ground" type="TileMapLayer" parent="."]');
    });

    it('should generate tile_map_data as PackedByteArray', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      // Verify PackedByteArray format with version header (1, 0)
      expect(content).toContain('tile_map_data = PackedByteArray(1, 0');
      // Verify tile_set SubResource reference
      expect(content).toContain('tile_set = SubResource');
    });

    it('should handle auto-tiles from IntGrid layers', async () => {
      const ldtkJson = JSON.stringify({
        jsonVersion: '1.5.3',
        worldGridWidth: 256,
        worldGridHeight: 256,
        defaultGridSize: 16,
        defs: { tilesets: [] },
        levels: [{
          identifier: 'Level_0',
          uid: 0,
          worldX: 0,
          worldY: 0,
          pxWid: 256,
          pxHei: 256,
          layerInstances: [{
            __identifier: 'AutoTiles',
            __type: 'IntGrid',
            __cWid: 16,
            __cHei: 16,
            __gridSize: 16,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetRelPath: 'tilesets/autotiles.png',
            gridTiles: [],
            // Auto-tiles generated from IntGrid rules
            autoLayerTiles: [
              { src: [0, 0], px: [0, 0], f: 0, t: 0, a: 1 },
              { src: [16, 0], px: [16, 0], f: 1, t: 1, a: 1 }, // flipX
              { src: [0, 16], px: [0, 16], f: 2, t: 2, a: 1 }, // flipY
            ],
            intGridCsv: [1, 1, 0, 0],
            entityInstances: [],
          }],
        }],
      });
      mockReadFile.mockResolvedValue(ldtkJson);

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBeUndefined();
      // Auto-tiles layer should be created with _tiles suffix
      expect(result.content[0].text).toContain('Tiles: 3');

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('AutoTiles_tiles');
      expect(content).toContain('TileMapLayer');
    });

    it('should use outputPath when specified', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        outputPath: 'scenes/imported',
      });

      const ensureCall = mockEnsureDir.mock.calls[0];
      expect((ensureCall as unknown[])[0]).toContain('scenes');
      expect((ensureCall as unknown[])[0]).toContain('imported');
    });

    it('should handle createCollision flag', async () => {
      const ldtkJson = JSON.stringify({
        jsonVersion: '1.5.3',
        worldGridWidth: 256,
        worldGridHeight: 256,
        defaultGridSize: 16,
        defs: { tilesets: [] },
        levels: [{
          identifier: 'Level_0',
          uid: 0,
          worldX: 0,
          worldY: 0,
          pxWid: 64,
          pxHei: 64,
          layerInstances: [{
            __identifier: 'Walls',
            __type: 'IntGrid',
            __cWid: 4,
            __cHei: 4,
            __gridSize: 16,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetRelPath: null,
            gridTiles: [],
            autoLayerTiles: [],
            intGridCsv: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
            entityInstances: [],
          }],
        }],
      });
      mockReadFile.mockResolvedValue(ldtkJson);

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        createCollision: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Collision: enabled');
    });

    it('should handle entity mapping', async () => {
      const ldtkJson = JSON.stringify({
        jsonVersion: '1.5.3',
        worldGridWidth: 256,
        worldGridHeight: 256,
        defaultGridSize: 16,
        defs: { tilesets: [] },
        levels: [{
          identifier: 'Level_0',
          uid: 0,
          worldX: 0,
          worldY: 0,
          pxWid: 256,
          pxHei: 256,
          layerInstances: [{
            __identifier: 'Entities',
            __type: 'Entities',
            __cWid: 16,
            __cHei: 16,
            __gridSize: 16,
            __pxTotalOffsetX: 0,
            __pxTotalOffsetY: 0,
            __tilesetRelPath: null,
            gridTiles: [],
            autoLayerTiles: [],
            intGridCsv: [],
            entityInstances: [{
              __identifier: 'Player',
              __grid: [2, 3],
              __pivot: [0.5, 1],
              __worldX: 32,
              __worldY: 48,
              width: 16,
              height: 32,
              px: [32, 48],
              fieldInstances: [],
            }],
          }],
        }],
      });
      mockReadFile.mockResolvedValue(ldtkJson);

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        entityMapping: [
          { ldtkIdentifier: 'Player', godotNodeType: 'CharacterBody2D' },
        ],
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Entities: 1');

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      expect(content).toContain('CharacterBody2D');
    });

    it('should report stats including tiles and entities', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.content[0].text).toContain('Layers: 1');
      expect(result.content[0].text).toContain('Tiles: 2');
      expect(result.content[0].text).toContain('Entities: 0');
    });

    it('should use tileSize override when specified', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());

      await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
        tileSize: { x: 32, y: 32 }, // Override LDtk's 16x16
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const content = (writeCall as unknown[])[1] as string;
      // TileSet should use overridden tile size
      expect(content).toContain('tile_size = Vector2i(32, 32)');
    });

    it('should handle project with no levels', async () => {
      const emptyProject = JSON.stringify({
        jsonVersion: '1.5.3',
        worldGridWidth: 256,
        worldGridHeight: 256,
        defaultGridSize: 16,
        defs: { tilesets: [] },
        levels: [],
      });
      mockReadFile.mockResolvedValue(emptyProject);

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No levels found');
    });
  });

  // ============================================================================
  // 7. Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockValidatePath.mockReturnValue(true);
      mockIsGodotProject.mockReturnValue(true);
      mockExistsSync.mockReturnValue(true);
    });

    it('should handle invalid JSON in LDtk file', async () => {
      mockReadFile.mockResolvedValue('not valid json {{{');

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to import LDtk level');
    });

    it('should handle file read failure', async () => {
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Permission denied');
    });

    it('should handle file write failure', async () => {
      mockReadFile.mockResolvedValue(createLdtkJson());
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Disk full');
    });

    it('should handle non-Error thrown during execution', async () => {
      mockReadFile.mockRejectedValue('string error');

      const result = await handleImportLdtkLevel({
        projectPath: '/path/to/project',
        ldtkPath: 'levels/world.ldtk',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });
  });
});
