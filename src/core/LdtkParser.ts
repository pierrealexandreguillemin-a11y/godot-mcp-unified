/**
 * LDtk JSON Parser
 * Parses LDtk level editor files and converts to Godot-compatible structures
 *
 * ISO/IEC 5055 compliant - strict validation
 * ISO/IEC 25010 compliant - data integrity
 */

// ============================================================================
// LDtk JSON Types (subset of LDtk spec)
// ============================================================================

export interface LdtkGridTile {
  /** Pixel coords of tile in the tileset */
  src: [number, number];
  /** Pixel coords of tile in the layer */
  px: [number, number];
  /** Flip flags: bit 0 = X flip, bit 1 = Y flip */
  f: number;
  /** Tile ID in the tileset */
  t: number;
  /** Alpha/opacity (0-1) */
  a: number;
}

export interface LdtkFieldInstance {
  __identifier: string;
  __type: string;
  __value: unknown;
}

export interface LdtkEntityInstance {
  __identifier: string;
  __grid: [number, number];
  __pivot: [number, number];
  __worldX: number;
  __worldY: number;
  width: number;
  height: number;
  px: [number, number];
  fieldInstances: LdtkFieldInstance[];
}

export interface LdtkLayerInstance {
  __identifier: string;
  __type: 'IntGrid' | 'Entities' | 'Tiles' | 'AutoLayer';
  __cWid: number;
  __cHei: number;
  __gridSize: number;
  __pxTotalOffsetX: number;
  __pxTotalOffsetY: number;
  __tilesetRelPath: string | null;
  gridTiles: LdtkGridTile[];
  autoLayerTiles: LdtkGridTile[];
  intGridCsv: number[];
  entityInstances: LdtkEntityInstance[];
}

export interface LdtkLevel {
  identifier: string;
  uid: number;
  worldX: number;
  worldY: number;
  pxWid: number;
  pxHei: number;
  layerInstances: LdtkLayerInstance[] | null;
}

export interface LdtkTilesetDef {
  uid: number;
  identifier: string;
  relPath: string | null;
  pxWid: number;
  pxHei: number;
  tileGridSize: number;
}

export interface LdtkDefs {
  tilesets: LdtkTilesetDef[];
}

export interface LdtkProject {
  jsonVersion: string;
  worldGridWidth: number;
  worldGridHeight: number;
  defaultGridSize: number;
  defs: LdtkDefs;
  levels: LdtkLevel[];
}

// ============================================================================
// Converted (intermediate) Types
// ============================================================================

export interface LdtkConvertedTile {
  /** Grid position */
  gridX: number;
  gridY: number;
  /** Source position in tileset (atlas coords) */
  atlasX: number;
  atlasY: number;
  /** Flip flags */
  flipX: boolean;
  flipY: boolean;
  /** Tile ID */
  tileId: number;
}

export interface LdtkConvertedTileLayer {
  name: string;
  type: 'tiles';
  gridSize: number;
  gridWidth: number;
  gridHeight: number;
  tilesetRelPath: string | null;
  tiles: LdtkConvertedTile[];
  offsetX: number;
  offsetY: number;
}

export interface LdtkConvertedEntity {
  identifier: string;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  fields: Record<string, unknown>;
}

export interface LdtkConvertedEntityLayer {
  name: string;
  type: 'entities';
  entities: LdtkConvertedEntity[];
}

export interface LdtkConvertedCollisionCell {
  gridX: number;
  gridY: number;
  value: number;
}

export interface LdtkConvertedCollisionLayer {
  name: string;
  type: 'collision';
  gridSize: number;
  gridWidth: number;
  gridHeight: number;
  cells: LdtkConvertedCollisionCell[];
}

export type LdtkConvertedLayer =
  | LdtkConvertedTileLayer
  | LdtkConvertedEntityLayer
  | LdtkConvertedCollisionLayer;

export interface LdtkConvertedLevel {
  identifier: string;
  uid: number;
  worldX: number;
  worldY: number;
  widthPx: number;
  heightPx: number;
  layers: LdtkConvertedLayer[];
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse raw LDtk JSON string into typed project structure.
 * Validates the basic structure before returning.
 */
export function parseLdtkProject(jsonString: string): LdtkProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON: failed to parse LDtk file');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid LDtk file: root must be an object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.jsonVersion !== 'string') {
    throw new Error('Invalid LDtk file: missing jsonVersion field');
  }

  if (!Array.isArray(obj.levels)) {
    throw new Error('Invalid LDtk file: missing levels array');
  }

  if (!obj.defs || typeof obj.defs !== 'object') {
    throw new Error('Invalid LDtk file: missing defs object');
  }

  return obj as unknown as LdtkProject;
}

/**
 * Convert pixel coordinates to grid coordinates
 */
export function pixelToGridCoords(
  pixelX: number,
  pixelY: number,
  gridSize: number,
): { gridX: number; gridY: number } {
  if (gridSize <= 0) {
    throw new Error('Grid size must be positive');
  }
  return {
    gridX: Math.floor(pixelX / gridSize),
    gridY: Math.floor(pixelY / gridSize),
  };
}

/**
 * Extract flip flags from LDtk tile flip value
 * Bit 0 = X flip, Bit 1 = Y flip
 */
export function tileFlipFlags(f: number): { flipX: boolean; flipY: boolean } {
  return {
    flipX: (f & 1) !== 0,
    flipY: (f & 2) !== 0,
  };
}

/**
 * Convert a single LDtk layer instance to an intermediate representation
 */
function convertLayer(
  layer: LdtkLayerInstance,
  includeCollision: boolean,
): LdtkConvertedLayer[] {
  const results: LdtkConvertedLayer[] = [];

  if (layer.__type === 'Tiles' || layer.__type === 'AutoLayer') {
    const tiles = layer.__type === 'Tiles' ? layer.gridTiles : layer.autoLayerTiles;
    const gridSize = layer.__gridSize;

    const convertedTiles: LdtkConvertedTile[] = tiles.map((tile) => {
      const grid = pixelToGridCoords(tile.px[0], tile.px[1], gridSize);
      const atlas = pixelToGridCoords(tile.src[0], tile.src[1], gridSize);
      const flags = tileFlipFlags(tile.f);

      return {
        gridX: grid.gridX,
        gridY: grid.gridY,
        atlasX: atlas.gridX,
        atlasY: atlas.gridY,
        flipX: flags.flipX,
        flipY: flags.flipY,
        tileId: tile.t,
      };
    });

    results.push({
      name: layer.__identifier,
      type: 'tiles',
      gridSize,
      gridWidth: layer.__cWid,
      gridHeight: layer.__cHei,
      tilesetRelPath: layer.__tilesetRelPath,
      tiles: convertedTiles,
      offsetX: layer.__pxTotalOffsetX,
      offsetY: layer.__pxTotalOffsetY,
    });
  }

  if (layer.__type === 'Entities') {
    const entities: LdtkConvertedEntity[] = layer.entityInstances.map((entity) => {
      const fields: Record<string, unknown> = {};
      for (const field of entity.fieldInstances) {
        fields[field.__identifier] = field.__value;
      }
      return {
        identifier: entity.__identifier,
        gridX: entity.__grid[0],
        gridY: entity.__grid[1],
        pixelX: entity.px[0],
        pixelY: entity.px[1],
        width: entity.width,
        height: entity.height,
        fields,
      };
    });

    results.push({
      name: layer.__identifier,
      type: 'entities',
      entities,
    });
  }

  if (layer.__type === 'IntGrid' && includeCollision) {
    const cells: LdtkConvertedCollisionCell[] = [];
    const gridSize = layer.__gridSize;

    for (let i = 0; i < layer.intGridCsv.length; i++) {
      const value = layer.intGridCsv[i];
      if (value > 0) {
        const gridX = i % layer.__cWid;
        const gridY = Math.floor(i / layer.__cWid);
        cells.push({ gridX, gridY, value });
      }
    }

    results.push({
      name: layer.__identifier,
      type: 'collision',
      gridSize,
      gridWidth: layer.__cWid,
      gridHeight: layer.__cHei,
      cells,
    });
  }

  // IntGrid layers can also have auto-tiles
  if (layer.__type === 'IntGrid' && layer.autoLayerTiles.length > 0) {
    const gridSize = layer.__gridSize;
    const convertedTiles: LdtkConvertedTile[] = layer.autoLayerTiles.map((tile) => {
      const grid = pixelToGridCoords(tile.px[0], tile.px[1], gridSize);
      const atlas = pixelToGridCoords(tile.src[0], tile.src[1], gridSize);
      const flags = tileFlipFlags(tile.f);

      return {
        gridX: grid.gridX,
        gridY: grid.gridY,
        atlasX: atlas.gridX,
        atlasY: atlas.gridY,
        flipX: flags.flipX,
        flipY: flags.flipY,
        tileId: tile.t,
      };
    });

    results.push({
      name: `${layer.__identifier}_tiles`,
      type: 'tiles',
      gridSize,
      gridWidth: layer.__cWid,
      gridHeight: layer.__cHei,
      tilesetRelPath: layer.__tilesetRelPath,
      tiles: convertedTiles,
      offsetX: layer.__pxTotalOffsetX,
      offsetY: layer.__pxTotalOffsetY,
    });
  }

  return results;
}

/**
 * Convert a single LDtk level to intermediate representation
 */
export function convertLevel(
  level: LdtkLevel,
  includeCollision = false,
): LdtkConvertedLevel {
  const layers: LdtkConvertedLayer[] = [];

  if (level.layerInstances) {
    for (const layer of level.layerInstances) {
      layers.push(...convertLayer(layer, includeCollision));
    }
  }

  return {
    identifier: level.identifier,
    uid: level.uid,
    worldX: level.worldX,
    worldY: level.worldY,
    widthPx: level.pxWid,
    heightPx: level.pxHei,
    layers,
  };
}

/**
 * Convert all levels in an LDtk project
 */
export function convertAllLevels(
  project: LdtkProject,
  includeCollision = false,
): LdtkConvertedLevel[] {
  return project.levels.map((level) => convertLevel(level, includeCollision));
}
