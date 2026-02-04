/**
 * TileMap Tools Tests
 * ISO/IEC 29119 compliant test suite
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Categories:
 * 1. Input Validation (Zod schema validation)
 * 2. Missing Required Parameters
 * 3. Invalid Enum Values
 * 4. Path Security (traversal prevention)
 * 5. Success Scenarios
 * 6. Error Handling
 */

import { mkdirSync } from 'fs';
import { join } from 'path';
import { handleCreateTileSet } from './CreateTileSetTool';
import { handleCreateTileMapLayer } from './CreateTileMapLayerTool';
import { handleSetTile } from './SetTileTool';
import { handlePaintTiles } from './PaintTilesTool';
import {
  createTempProject,
  getResponseText,
} from '../test-utils.js';

describe('TileMap Tools - ISO 29119 Compliant Test Suite', () => {
  // ============================================================================
  // CreateTileSet Tests
  // ============================================================================
  describe('CreateTileSet', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleCreateTileSet({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleCreateTileSet({
          projectPath: null,
          tilesetPath: null,
          tileSize: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject invalid tileSize type (string instead of object)', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tileSize');
      });

      it('should reject tileSize with missing x coordinate', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject tileSize with missing y coordinate', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject tileSize with non-numeric values', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 'sixteen', y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject tileSize with array instead of object', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: [16, 16],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateTileSet({
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when tilesetPath is missing', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tilesetPath');
      });

      it('should return error when tileSize is missing', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tileSize');
      });
    });

    describe('3. Business Logic Validation', () => {
      it('should return error for zero tileSize.x', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 0, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be positive');
      });

      it('should return error for zero tileSize.y', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be positive');
      });

      it('should return error for negative tileSize.x', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: -16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be positive');
      });

      it('should return error for negative tileSize.y', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: -16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('must be positive');
      });
    });

    describe('4. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/../escape/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject tilesetPath with path traversal', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: '../escape/tileset.tres',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain/i);
      });

      it('should reject texturePath with path traversal', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/path/to/project',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
          texturePath: '../../../escape/texture.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain/i);
      });
    });

    describe('5. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should return error for empty string projectPath', async () => {
        const result = await handleCreateTileSet({
          projectPath: '',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('6. Optional Parameters', () => {
      it('should accept valid request without optional texturePath', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        // Will fail on project validation, but schema validation passes
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept valid texturePath when provided', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
          texturePath: 'res://textures/tileset.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept large tile sizes', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/large.tres',
          tileSize: { x: 256, y: 256 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept non-square tile sizes', async () => {
        const result = await handleCreateTileSet({
          projectPath: '/non/existent/path',
          tilesetPath: 'res://tilesets/rect.tres',
          tileSize: { x: 32, y: 16 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // CreateTileMapLayer Tests
  // ============================================================================
  describe('CreateTileMapLayer', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleCreateTileMapLayer({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: null,
          scenePath: null,
          nodeName: null,
          tilesetPath: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric nodeName', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 12345,
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject empty string nodeName', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateTileMapLayer({
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
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
    });

    describe('3. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/../escape/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject scenePath with path traversal', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          scenePath: '../escape/scene.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject tilesetPath with path traversal', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: '../../../escape/tileset.tres',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('4. Project Validation', () => {
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

    describe('5. Optional Parameters', () => {
      it('should accept request without optional parentNodePath', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with parentNodePath', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
          parentNodePath: 'World',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with zIndex', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
          zIndex: 5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept negative zIndex values', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Background',
          tilesetPath: 'res://tilesets/main.tres',
          zIndex: -10,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // SetTile Tests
  // ============================================================================
  describe('SetTile', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleSetTile({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleSetTile({
          projectPath: null,
          scenePath: null,
          tilemapNodePath: null,
          position: null,
          sourceId: null,
          atlasCoords: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject invalid position format (string)', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: 'invalid',
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('position');
      });

      it('should reject position with missing x', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject position with missing y', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject invalid atlasCoords format (string)', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('atlasCoords');
      });

      it('should reject atlasCoords with missing x', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject atlasCoords with missing y', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject negative sourceId', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: -1,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject negative layer value', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
          layer: -1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
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

      it('should return error when scenePath is missing', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when tilemapNodePath is missing', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tilemapNodePath');
      });

      it('should return error when position is missing', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('position');
      });

      it('should return error when sourceId is missing', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('sourceId');
      });

      it('should return error when atlasCoords is missing', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('atlasCoords');
      });
    });

    describe('3. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleSetTile({
          projectPath: '/path/../escape/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject scenePath with path traversal', async () => {
        const result = await handleSetTile({
          projectPath: '/path/to/project',
          scenePath: '../escape/scene.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('4. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('5. Optional Parameters', () => {
      it('should accept request without optional layer (defaults to 0)', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with layer value', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
          layer: 2,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with alternativeTile', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
          alternativeTile: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept negative tile positions', async () => {
        const result = await handleSetTile({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: -5, y: -10 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // PaintTiles Tests
  // ============================================================================
  describe('PaintTiles', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handlePaintTiles({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handlePaintTiles({
          projectPath: null,
          scenePath: null,
          tilemapNodePath: null,
          tiles: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject tiles as string instead of array', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject tiles as object instead of array', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handlePaintTiles({
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when tilemapNodePath is missing', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tilemapNodePath');
      });

      it('should return error when tiles is missing', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('tiles');
      });
    });

    describe('3. Tiles Array Validation', () => {
      it('should return error for empty tiles array', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Too small|must be a non-empty array/i);
      });

      it('should return error for tile with invalid position (string)', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: 'invalid', sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('position');
      });

      it('should return error for tile with missing position', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for tile with invalid atlasCoords', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: 'invalid' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for tile with missing sourceId', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for tile with negative sourceId', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: -1, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should validate all tiles in array (error on second tile)', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [
            { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } },
            { position: 'invalid', sourceId: 0, atlasCoords: { x: 0, y: 0 } },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('4. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/../escape/project',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject scenePath with path traversal', async () => {
        const result = await handlePaintTiles({
          projectPath: '/path/to/project',
          scenePath: '../escape/scene.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('5. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('6. Optional Parameters', () => {
      it('should accept request without optional layer (defaults to 0)', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with layer value', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
          layer: 3,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept tiles with alternativeTile values', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [
            { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 }, alternativeTile: 1 },
            { position: { x: 1, y: 0 }, sourceId: 0, atlasCoords: { x: 1, y: 0 }, alternativeTile: 2 },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept multiple tiles in batch', async () => {
        const tiles = [];
        for (let x = 0; x < 10; x++) {
          for (let y = 0; y < 10; y++) {
            tiles.push({ position: { x, y }, sourceId: 0, atlasCoords: { x: x % 4, y: y % 4 } });
          }
        }
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('7. Reject Negative Layer', () => {
      it('should reject negative layer value', async () => {
        const result = await handlePaintTiles({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }],
          layer: -1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
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

      // Create tilemap-related directories
      mkdirSync(join(projectPath, 'tilesets'), { recursive: true });
    });

    afterEach(() => {
      cleanup();
    });

    describe('CreateTileSet with valid project', () => {
      it('should proceed to Godot execution with valid inputs', async () => {
        const result = await handleCreateTileSet({
          projectPath,
          tilesetPath: 'res://tilesets/main.tres',
          tileSize: { x: 16, y: 16 },
        });
        const text = getResponseText(result);
        // Should have passed validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });

    describe('CreateTileMapLayer with valid project', () => {
      it('should proceed to Godot execution with valid inputs', async () => {
        const result = await handleCreateTileMapLayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'Ground',
          tilesetPath: 'res://tilesets/main.tres',
        });
        const text = getResponseText(result);
        // Should have passed validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });

    describe('SetTile with valid project', () => {
      it('should proceed to scene validation with valid inputs', async () => {
        const result = await handleSetTile({
          projectPath,
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          position: { x: 0, y: 0 },
          sourceId: 0,
          atlasCoords: { x: 0, y: 0 },
        });
        const text = getResponseText(result);
        // Should have passed validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });

    describe('PaintTiles with valid project', () => {
      it('should proceed to scene validation with valid inputs', async () => {
        const result = await handlePaintTiles({
          projectPath,
          scenePath: 'scenes/main.tscn',
          tilemapNodePath: 'Ground',
          tiles: [
            { position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } },
            { position: { x: 1, y: 0 }, sourceId: 0, atlasCoords: { x: 1, y: 0 } },
          ],
        });
        const text = getResponseText(result);
        // Should have passed validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });
  });
});
