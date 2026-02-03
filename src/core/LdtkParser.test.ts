/**
 * LDtk Parser Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 */

import {
  parseLdtkProject,
  convertLevel,
  convertAllLevels,
  pixelToGridCoords,
  tileFlipFlags,
  LdtkProject,
  LdtkLevel,
  LdtkLayerInstance,
} from './LdtkParser';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMinimalProject(overrides?: Partial<LdtkProject>): LdtkProject {
  return {
    jsonVersion: '1.5.3',
    worldGridWidth: 256,
    worldGridHeight: 256,
    defaultGridSize: 16,
    defs: { tilesets: [] },
    levels: [],
    ...overrides,
  };
}

function createTileLayer(overrides?: Partial<LdtkLayerInstance>): LdtkLayerInstance {
  return {
    __identifier: 'Tiles',
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
      { src: [32, 16], px: [48, 32], f: 1, t: 5, a: 1 },
    ],
    autoLayerTiles: [],
    intGridCsv: [],
    entityInstances: [],
    ...overrides,
  };
}

function createEntityLayer(overrides?: Partial<LdtkLayerInstance>): LdtkLayerInstance {
  return {
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
    entityInstances: [
      {
        __identifier: 'Player',
        __grid: [2, 3],
        __pivot: [0.5, 1],
        __worldX: 32,
        __worldY: 48,
        width: 16,
        height: 32,
        px: [32, 48],
        fieldInstances: [
          { __identifier: 'health', __type: 'Int', __value: 100 },
          { __identifier: 'name', __type: 'String', __value: 'Hero' },
        ],
      },
    ],
    ...overrides,
  };
}

function createIntGridLayer(overrides?: Partial<LdtkLayerInstance>): LdtkLayerInstance {
  return {
    __identifier: 'Collision',
    __type: 'IntGrid',
    __cWid: 4,
    __cHei: 4,
    __gridSize: 16,
    __pxTotalOffsetX: 0,
    __pxTotalOffsetY: 0,
    __tilesetRelPath: null,
    gridTiles: [],
    autoLayerTiles: [],
    intGridCsv: [
      1, 1, 0, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
      0, 0, 1, 1,
    ],
    entityInstances: [],
    ...overrides,
  };
}

function createLevel(overrides?: Partial<LdtkLevel>): LdtkLevel {
  return {
    identifier: 'Level_0',
    uid: 0,
    worldX: 0,
    worldY: 0,
    pxWid: 256,
    pxHei: 256,
    layerInstances: [],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('LdtkParser', () => {
  // ==========================================================================
  // parseLdtkProject
  // ==========================================================================
  describe('parseLdtkProject', () => {
    it('should parse valid minimal LDtk JSON', () => {
      const project = createMinimalProject();
      const result = parseLdtkProject(JSON.stringify(project));
      expect(result.jsonVersion).toBe('1.5.3');
      expect(result.levels).toEqual([]);
      expect(result.defs.tilesets).toEqual([]);
    });

    it('should parse project with levels', () => {
      const project = createMinimalProject({
        levels: [createLevel({ identifier: 'World' })],
      });
      const result = parseLdtkProject(JSON.stringify(project));
      expect(result.levels).toHaveLength(1);
      expect(result.levels[0].identifier).toBe('World');
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseLdtkProject('not json {')).toThrow('Invalid JSON');
    });

    it('should throw on null root', () => {
      expect(() => parseLdtkProject('null')).toThrow('root must be an object');
    });

    it('should throw on non-object root', () => {
      expect(() => parseLdtkProject('"string"')).toThrow('root must be an object');
    });

    it('should throw on missing jsonVersion', () => {
      expect(() => parseLdtkProject(JSON.stringify({ levels: [], defs: {} }))).toThrow('missing jsonVersion');
    });

    it('should throw on missing levels array', () => {
      expect(() => parseLdtkProject(JSON.stringify({ jsonVersion: '1.0' }))).toThrow('missing levels array');
    });

    it('should throw on missing defs', () => {
      expect(() => parseLdtkProject(JSON.stringify({ jsonVersion: '1.0', levels: [] }))).toThrow('missing defs object');
    });

    it('should throw on non-string jsonVersion', () => {
      expect(() => parseLdtkProject(JSON.stringify({
        jsonVersion: 1,
        levels: [],
        defs: {},
      }))).toThrow('missing jsonVersion');
    });

    it('should preserve tileset definitions', () => {
      const project = createMinimalProject({
        defs: {
          tilesets: [
            {
              uid: 1,
              identifier: 'Terrain',
              relPath: 'tilesets/terrain.png',
              pxWid: 256,
              pxHei: 256,
              tileGridSize: 16,
            },
          ],
        },
      });
      const result = parseLdtkProject(JSON.stringify(project));
      expect(result.defs.tilesets).toHaveLength(1);
      expect(result.defs.tilesets[0].identifier).toBe('Terrain');
    });
  });

  // ==========================================================================
  // pixelToGridCoords
  // ==========================================================================
  describe('pixelToGridCoords', () => {
    it('should convert pixel origin to grid origin', () => {
      expect(pixelToGridCoords(0, 0, 16)).toEqual({ gridX: 0, gridY: 0 });
    });

    it('should convert exact grid-aligned pixels', () => {
      expect(pixelToGridCoords(32, 48, 16)).toEqual({ gridX: 2, gridY: 3 });
    });

    it('should floor non-aligned pixels', () => {
      expect(pixelToGridCoords(15, 31, 16)).toEqual({ gridX: 0, gridY: 1 });
    });

    it('should work with different grid sizes', () => {
      expect(pixelToGridCoords(24, 24, 8)).toEqual({ gridX: 3, gridY: 3 });
    });

    it('should throw on zero grid size', () => {
      expect(() => pixelToGridCoords(0, 0, 0)).toThrow('Grid size must be positive');
    });

    it('should throw on negative grid size', () => {
      expect(() => pixelToGridCoords(0, 0, -1)).toThrow('Grid size must be positive');
    });
  });

  // ==========================================================================
  // tileFlipFlags
  // ==========================================================================
  describe('tileFlipFlags', () => {
    it('should return no flips for f=0', () => {
      expect(tileFlipFlags(0)).toEqual({ flipX: false, flipY: false });
    });

    it('should return X flip for f=1', () => {
      expect(tileFlipFlags(1)).toEqual({ flipX: true, flipY: false });
    });

    it('should return Y flip for f=2', () => {
      expect(tileFlipFlags(2)).toEqual({ flipX: false, flipY: true });
    });

    it('should return both flips for f=3', () => {
      expect(tileFlipFlags(3)).toEqual({ flipX: true, flipY: true });
    });
  });

  // ==========================================================================
  // convertLevel - Tile layers
  // ==========================================================================
  describe('convertLevel - Tile layers', () => {
    it('should convert tile layer with grid tiles', () => {
      const level = createLevel({
        layerInstances: [createTileLayer()],
      });
      const result = convertLevel(level);
      expect(result.identifier).toBe('Level_0');
      expect(result.layers).toHaveLength(1);

      const tileLayer = result.layers[0];
      expect(tileLayer.type).toBe('tiles');
      if (tileLayer.type === 'tiles') {
        expect(tileLayer.name).toBe('Tiles');
        expect(tileLayer.tiles).toHaveLength(3);
        expect(tileLayer.gridSize).toBe(16);
        expect(tileLayer.tilesetRelPath).toBe('tilesets/terrain.png');
      }
    });

    it('should convert tile positions correctly', () => {
      const level = createLevel({
        layerInstances: [createTileLayer()],
      });
      const result = convertLevel(level);
      const tileLayer = result.layers[0];
      if (tileLayer.type === 'tiles') {
        // First tile: px=[0,0], src=[0,0]
        expect(tileLayer.tiles[0]).toEqual({
          gridX: 0, gridY: 0,
          atlasX: 0, atlasY: 0,
          flipX: false, flipY: false,
          tileId: 0,
        });
        // Third tile: px=[48,32], src=[32,16], f=1
        expect(tileLayer.tiles[2]).toEqual({
          gridX: 3, gridY: 2,
          atlasX: 2, atlasY: 1,
          flipX: true, flipY: false,
          tileId: 5,
        });
      }
    });

    it('should handle AutoLayer tiles', () => {
      const level = createLevel({
        layerInstances: [createTileLayer({
          __type: 'AutoLayer',
          gridTiles: [],
          autoLayerTiles: [
            { src: [0, 0], px: [16, 16], f: 0, t: 0, a: 1 },
          ],
        })],
      });
      const result = convertLevel(level);
      expect(result.layers).toHaveLength(1);
      if (result.layers[0].type === 'tiles') {
        expect(result.layers[0].tiles).toHaveLength(1);
        expect(result.layers[0].tiles[0].gridX).toBe(1);
      }
    });

    it('should preserve layer offsets', () => {
      const level = createLevel({
        layerInstances: [createTileLayer({
          __pxTotalOffsetX: 8,
          __pxTotalOffsetY: -4,
        })],
      });
      const result = convertLevel(level);
      if (result.layers[0].type === 'tiles') {
        expect(result.layers[0].offsetX).toBe(8);
        expect(result.layers[0].offsetY).toBe(-4);
      }
    });

    it('should handle empty tile layer', () => {
      const level = createLevel({
        layerInstances: [createTileLayer({ gridTiles: [] })],
      });
      const result = convertLevel(level);
      if (result.layers[0].type === 'tiles') {
        expect(result.layers[0].tiles).toHaveLength(0);
      }
    });
  });

  // ==========================================================================
  // convertLevel - Entity layers
  // ==========================================================================
  describe('convertLevel - Entity layers', () => {
    it('should convert entity layer', () => {
      const level = createLevel({
        layerInstances: [createEntityLayer()],
      });
      const result = convertLevel(level);
      expect(result.layers).toHaveLength(1);

      const entityLayer = result.layers[0];
      expect(entityLayer.type).toBe('entities');
      if (entityLayer.type === 'entities') {
        expect(entityLayer.entities).toHaveLength(1);
        const player = entityLayer.entities[0];
        expect(player.identifier).toBe('Player');
        expect(player.gridX).toBe(2);
        expect(player.gridY).toBe(3);
        expect(player.pixelX).toBe(32);
        expect(player.pixelY).toBe(48);
        expect(player.width).toBe(16);
        expect(player.height).toBe(32);
      }
    });

    it('should convert entity field instances to fields map', () => {
      const level = createLevel({
        layerInstances: [createEntityLayer()],
      });
      const result = convertLevel(level);
      if (result.layers[0].type === 'entities') {
        const entity = result.layers[0].entities[0];
        expect(entity.fields).toEqual({
          health: 100,
          name: 'Hero',
        });
      }
    });

    it('should handle entity with no fields', () => {
      const level = createLevel({
        layerInstances: [createEntityLayer({
          entityInstances: [{
            __identifier: 'Coin',
            __grid: [5, 5],
            __pivot: [0.5, 0.5],
            __worldX: 80,
            __worldY: 80,
            width: 8,
            height: 8,
            px: [80, 80],
            fieldInstances: [],
          }],
        })],
      });
      const result = convertLevel(level);
      if (result.layers[0].type === 'entities') {
        expect(result.layers[0].entities[0].fields).toEqual({});
      }
    });
  });

  // ==========================================================================
  // convertLevel - IntGrid / Collision layers
  // ==========================================================================
  describe('convertLevel - IntGrid layers', () => {
    it('should not generate collision layer by default', () => {
      const level = createLevel({
        layerInstances: [createIntGridLayer()],
      });
      const result = convertLevel(level, false);
      // No collision layers and no tile layers (no autoLayerTiles)
      expect(result.layers).toHaveLength(0);
    });

    it('should generate collision layer when createCollision=true', () => {
      const level = createLevel({
        layerInstances: [createIntGridLayer()],
      });
      const result = convertLevel(level, true);
      expect(result.layers.length).toBeGreaterThanOrEqual(1);

      const collisionLayer = result.layers.find((l) => l.type === 'collision');
      expect(collisionLayer).toBeDefined();
      if (collisionLayer && collisionLayer.type === 'collision') {
        expect(collisionLayer.name).toBe('Collision');
        expect(collisionLayer.gridSize).toBe(16);
        // Non-zero cells from the fixture: [0,0]=1, [1,0]=1, [0,1]=1, [3,2]=1, [2,3]=1, [3,3]=1
        expect(collisionLayer.cells).toHaveLength(6);
      }
    });

    it('should skip zero-value cells in IntGrid', () => {
      const level = createLevel({
        layerInstances: [createIntGridLayer({
          __cWid: 2,
          __cHei: 2,
          intGridCsv: [0, 0, 0, 1],
        })],
      });
      const result = convertLevel(level, true);
      const collisionLayer = result.layers.find((l) => l.type === 'collision');
      if (collisionLayer && collisionLayer.type === 'collision') {
        expect(collisionLayer.cells).toHaveLength(1);
        expect(collisionLayer.cells[0]).toEqual({ gridX: 1, gridY: 1, value: 1 });
      }
    });

    it('should convert IntGrid with auto-tiles', () => {
      const level = createLevel({
        layerInstances: [createIntGridLayer({
          autoLayerTiles: [
            { src: [0, 0], px: [0, 0], f: 0, t: 0, a: 1 },
          ],
          __tilesetRelPath: 'auto_tiles.png',
        })],
      });
      const result = convertLevel(level, true);
      // Should have both collision and tiles layers
      const tileLayer = result.layers.find((l) => l.type === 'tiles');
      const collisionLayer = result.layers.find((l) => l.type === 'collision');
      expect(tileLayer).toBeDefined();
      expect(collisionLayer).toBeDefined();
      if (tileLayer?.type === 'tiles') {
        expect(tileLayer.name).toBe('Collision_tiles');
        expect(tileLayer.tiles).toHaveLength(1);
      }
    });
  });

  // ==========================================================================
  // convertLevel - Mixed layers
  // ==========================================================================
  describe('convertLevel - Mixed layers', () => {
    it('should handle level with null layerInstances', () => {
      const level = createLevel({ layerInstances: null });
      const result = convertLevel(level);
      expect(result.layers).toHaveLength(0);
    });

    it('should convert multiple layer types', () => {
      const level = createLevel({
        layerInstances: [
          createTileLayer(),
          createEntityLayer(),
          createIntGridLayer(),
        ],
      });
      const result = convertLevel(level, true);
      const types = result.layers.map((l) => l.type);
      expect(types).toContain('tiles');
      expect(types).toContain('entities');
      expect(types).toContain('collision');
    });

    it('should preserve world position', () => {
      const level = createLevel({
        worldX: 512,
        worldY: 256,
        pxWid: 320,
        pxHei: 320,
      });
      const result = convertLevel(level);
      expect(result.worldX).toBe(512);
      expect(result.worldY).toBe(256);
      expect(result.widthPx).toBe(320);
      expect(result.heightPx).toBe(320);
    });
  });

  // ==========================================================================
  // convertAllLevels
  // ==========================================================================
  describe('convertAllLevels', () => {
    it('should convert empty project', () => {
      const project = createMinimalProject();
      const result = convertAllLevels(project);
      expect(result).toEqual([]);
    });

    it('should convert all levels', () => {
      const project = createMinimalProject({
        levels: [
          createLevel({ identifier: 'Level_0', uid: 0 }),
          createLevel({ identifier: 'Level_1', uid: 1 }),
          createLevel({ identifier: 'Level_2', uid: 2 }),
        ],
      });
      const result = convertAllLevels(project);
      expect(result).toHaveLength(3);
      expect(result[0].identifier).toBe('Level_0');
      expect(result[1].identifier).toBe('Level_1');
      expect(result[2].identifier).toBe('Level_2');
    });

    it('should pass includeCollision flag to each level', () => {
      const project = createMinimalProject({
        levels: [
          createLevel({
            identifier: 'WithCollision',
            layerInstances: [createIntGridLayer()],
          }),
        ],
      });

      const withoutCollision = convertAllLevels(project, false);
      const withCollision = convertAllLevels(project, true);

      const hasCollisionWithout = withoutCollision[0].layers.some((l) => l.type === 'collision');
      const hasCollisionWith = withCollision[0].layers.some((l) => l.type === 'collision');

      expect(hasCollisionWithout).toBe(false);
      expect(hasCollisionWith).toBe(true);
    });
  });
});
