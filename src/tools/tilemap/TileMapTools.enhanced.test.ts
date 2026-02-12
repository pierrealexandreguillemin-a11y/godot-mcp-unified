/**
 * TileMap Tools Enhanced Tests
 * ISO/IEC 29119 compliant - covers uncovered Godot execution paths
 *
 * The existing TileMapTools.test.ts covers validation and security.
 * These tests mock Godot to cover:
 * - Godot path not found (~line 66 in each tool)
 * - Successful execution and response building
 * - stderr with "Failed to" message handling
 * - Error catch blocks
 */

import { jest } from '@jest/globals';
import { mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

// Define mock functions at module scope BEFORE mock module declarations
const mockDetectGodotPath = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();

jest.mock('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: jest.fn(() => true),
  normalizePath: jest.fn((p: string) => p),
  normalizeHandlerPaths: jest.fn(<T,>(args: T) => args),
  isValidGodotPathSync: jest.fn(() => true),
  isValidGodotPath: jest.fn(async () => true),
  getPlatformGodotPaths: jest.fn(() => []),
  clearPathCache: jest.fn(),
  getPathCacheStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
}));

jest.mock('../../core/GodotExecutor.js', () => ({
  executeOperation: mockExecuteOperation,
  getGodotVersion: jest.fn(async () => '4.2.stable'),
  isGodot44OrLater: jest.fn(() => false),
}));

// Mock BridgeExecutor to always use fallback (no bridge connected)
jest.mock('../../bridge/BridgeExecutor.js', () => ({
  executeWithBridge: jest.fn(async (
    _action: string,
    _params: Record<string, unknown>,
    fallback: () => Promise<unknown>,
  ) => await fallback()),
  isBridgeAvailable: jest.fn(() => false),
  tryInitializeBridge: jest.fn(async () => false),
}));

import { handleCreateTileSet } from './CreateTileSetTool.js';
import { handleCreateTileMapLayer } from './CreateTileMapLayerTool.js';
import { handleSetTile } from './SetTileTool.js';
import { handlePaintTiles } from './PaintTilesTool.js';

describe('TileMap Tools Enhanced Tests', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    mkdirSync(join(projectPath, 'tilesets'), { recursive: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================================
  // CreateTileSet - Happy Path / Error Handling
  // ============================================================================
  describe('CreateTileSet Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should create tileset successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'TileSet created',
        stderr: '',
      });

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('TileSet created successfully');
      expect(getResponseText(result)).toContain('16x16');
    });

    it('should create tileset with texture path', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'TileSet created with texture',
        stderr: '',
      });

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 32, y: 32 },
        texturePath: 'res://textures/tileset.png',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('tileset.png');
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to create tileset: invalid path',
      });

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create TileSet');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Process crashed'));

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create TileSet');
      expect(getResponseText(result)).toContain('Process crashed');
    });

    it('should handle non-Error exception', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue('unexpected');

      const result = await handleCreateTileSet({
        projectPath,
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });

  // ============================================================================
  // CreateTileMapLayer - Happy Path / Error Handling
  // ============================================================================
  describe('CreateTileMapLayer Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should create tilemap layer successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Node added',
        stderr: '',
      });

      const result = await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('TileMapLayer created successfully');
      expect(getResponseText(result)).toContain('Ground');
    });

    it('should pass zIndex when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Node added',
        stderr: '',
      });

      const result = await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Foreground',
        tilesetPath: 'res://tilesets/main.tres',
        zIndex: 5,
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Z-Index: 5');
    });

    it('should pass parentNodePath when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
        parentNodePath: 'World',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'add_node',
        expect.objectContaining({
          parentNodePath: 'World',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to add node',
      });

      const result = await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create TileMapLayer');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Timeout'));

      const result = await handleCreateTileMapLayer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create TileMapLayer');
      expect(getResponseText(result)).toContain('Timeout');
    });
  });

  // ============================================================================
  // SetTile - Happy Path / Error Handling
  // ============================================================================
  describe('SetTile Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleSetTile({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 0,
        atlasCoords: { x: 0, y: 0 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should set tile successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Tile set',
        stderr: '',
      });

      const result = await handleSetTile({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 5, y: 3 },
        sourceId: 0,
        atlasCoords: { x: 1, y: 2 },
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Tile set successfully');
      expect(getResponseText(result)).toContain('(5, 3)');
      expect(getResponseText(result)).toContain('(1, 2)');
    });

    it('should pass optional layer and alternativeTile', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleSetTile({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 1,
        atlasCoords: { x: 0, y: 0 },
        layer: 2,
        alternativeTile: 3,
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'set_tile',
        expect.objectContaining({
          layer: 2,
          alternativeTile: 3,
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to set tile: invalid source',
      });

      const result = await handleSetTile({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 0,
        atlasCoords: { x: 0, y: 0 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to set tile');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Godot crashed'));

      const result = await handleSetTile({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 0,
        atlasCoords: { x: 0, y: 0 },
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Godot crashed');
    });
  });

  // ============================================================================
  // PaintTiles - Happy Path / Error Handling
  // ============================================================================
  describe('PaintTiles Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should paint tiles successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Tiles painted',
        stderr: '',
      });

      const result = await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [
          { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } },
          { position: { x: 1, y: 0 }, sourceId: 0, atlasCoords: { x: 1, y: 0 } },
        ],
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Successfully painted 2 tiles');
    });

    it('should pass optional layer and alternativeTile values', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        layer: 2,
        tiles: [
          { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 }, alternativeTile: 1 },
        ],
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'paint_tiles',
        expect.objectContaining({
          layer: 2,
          tiles: expect.arrayContaining([
            expect.objectContaining({ alternativeTile: 1 }),
          ]),
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to paint tiles: invalid tilemap',
      });

      const result = await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to paint tiles');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Timeout exceeded'));

      const result = await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Timeout exceeded');
    });

    it('should handle non-Error exception', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(undefined);

      const result = await handlePaintTiles({
        projectPath,
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });
});
