/**
 * TileMap Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateTileSet } from './CreateTileSetTool';
import { handleCreateTileMapLayer } from './CreateTileMapLayerTool';
import { handleSetTile } from './SetTileTool';
import { handlePaintTiles } from './PaintTilesTool';

describe('TileMap Tools', () => {
  describe('CreateTileSet', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateTileSet({
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 16, y: 16 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when tileSize is missing', async () => {
      const result = await handleCreateTileSet({
        projectPath: '/path/to/project',
        tilesetPath: 'res://tilesets/main.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('tileSize');
    });

    it('should return error for invalid tileSize format', async () => {
      const result = await handleCreateTileSet({
        projectPath: '/non/existent/path',
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('tileSize: Invalid input');
    });

    it('should return error for non-positive tileSize', async () => {
      const result = await handleCreateTileSet({
        projectPath: '/non/existent/path',
        tilesetPath: 'res://tilesets/main.tres',
        tileSize: { x: 0, y: 16 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be positive');
    });
  });

  describe('CreateTileMapLayer', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCreateTileMapLayer({
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when tilesetPath is missing', async () => {
      const result = await handleCreateTileMapLayer({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('tilesetPath');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleCreateTileMapLayer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Ground',
        tilesetPath: 'res://tilesets/main.tres',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('SetTile', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleSetTile({
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 0,
        atlasCoords: { x: 0, y: 0 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error for invalid position format', async () => {
      const result = await handleSetTile({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: 'invalid',
        sourceId: 0,
        atlasCoords: { x: 0, y: 0 },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('position: Invalid input');
    });

    it('should return error for invalid atlasCoords format', async () => {
      const result = await handleSetTile({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        position: { x: 0, y: 0 },
        sourceId: 0,
        atlasCoords: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('atlasCoords: Invalid input');
    });
  });

  describe('PaintTiles', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handlePaintTiles({
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error for empty tiles array', async () => {
      const result = await handlePaintTiles({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('tiles: Too small');
    });

    it('should return error for tile with invalid position', async () => {
      const result = await handlePaintTiles({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        tilemapNodePath: 'Ground',
        tiles: [{ position: 'invalid', sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('position: Invalid input');
    });
  });
});
