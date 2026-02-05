/**
 * Import LDtk Level Tool
 * Parses LDtk JSON files and generates Godot .tscn scenes
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logDebug } from '../../utils/Logger.js';
import {
  ImportLdtkLevelSchema,
  ImportLdtkLevelInput,
  LdtkEntityMappingInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';
import {
  parseLdtkProject,
  convertLevel,
  convertAllLevels,
  LdtkConvertedLevel,
  LdtkConvertedTileLayer,
  LdtkConvertedEntityLayer,
  LdtkConvertedCollisionLayer,
} from '../../core/LdtkParser.js';

export const importLdtkLevelDefinition: ToolDefinition = {
  name: 'import_ldtk_level',
  description: 'Import levels from an LDtk file and generate Godot .tscn scenes with TileMapLayer nodes',
  inputSchema: toMcpSchema(ImportLdtkLevelSchema),
};

/**
 * Generate Godot .tscn content from a converted LDtk level
 * Creates functional TileMapLayer nodes with actual tile data
 */
function generateTscn(
  level: LdtkConvertedLevel,
  entityMapping?: LdtkEntityMappingInput[],
  tileSizeOverride?: { x: number; y: number },
): string {
  const lines: string[] = [];
  let extResourceId = 0;
  const subResources: string[] = [];

  // Collect tileset references and create TileSet sub_resources
  const tilesetToExtId = new Map<string, number>();
  const layerToTileSetSubId = new Map<string, number>();
  let subResourceId = 1;

  for (const layer of level.layers) {
    if (layer.type === 'tiles' && layer.tilesetRelPath) {
      if (!tilesetToExtId.has(layer.tilesetRelPath)) {
        extResourceId++;
        tilesetToExtId.set(layer.tilesetRelPath, extResourceId);
      }
      // Create a TileSet sub_resource for each tile layer
      // Use tileSizeOverride if provided, otherwise use layer's gridSize
      const textureExtId = tilesetToExtId.get(layer.tilesetRelPath)!;
      const tileSize = tileSizeOverride?.x ?? layer.gridSize;
      layerToTileSetSubId.set(layer.name, subResourceId);
      subResources.push(generateTileSetSubResource(subResourceId, textureExtId, tileSize));
      subResourceId++;
    }
  }

  // Collect collision shape sub_resources
  const collisionShapeIds: Map<string, number[]> = new Map();
  for (const layer of level.layers) {
    if (layer.type === 'collision') {
      const shapeIds: number[] = [];
      // Use tileSizeOverride if provided for collision shapes
      const collisionSize = tileSizeOverride?.x ?? layer.gridSize;
      for (let i = 0; i < layer.cells.length; i++) {
        shapeIds.push(subResourceId);
        subResources.push(generateRectangleShapeSubResource(subResourceId, collisionSize));
        subResourceId++;
      }
      collisionShapeIds.set(layer.name, shapeIds);
    }
  }

  // Calculate load_steps (ext_resources + sub_resources + 1)
  const loadSteps = extResourceId + subResources.length + 1;
  lines.push(`[gd_scene load_steps=${loadSteps} format=3]`);
  lines.push('');

  // External resources (tileset textures)
  for (const [relPath, id] of tilesetToExtId) {
    lines.push(`[ext_resource type="Texture2D" path="res://${relPath}" id="${id}"]`);
  }

  if (tilesetToExtId.size > 0) {
    lines.push('');
  }

  // Sub resources (TileSets and collision shapes)
  for (const subRes of subResources) {
    lines.push(subRes);
    lines.push('');
  }

  // Root node
  lines.push(`[node name="${level.identifier}" type="Node2D"]`);

  // Generate child nodes per layer
  for (const layer of level.layers) {
    if (layer.type === 'tiles') {
      const tileSetSubId = layerToTileSetSubId.get(layer.name);
      lines.push('');
      lines.push(...generateTileLayerNode(layer, tileSetSubId));
    } else if (layer.type === 'entities') {
      lines.push('');
      lines.push(...generateEntityLayerNode(layer, entityMapping));
    } else if (layer.type === 'collision') {
      const shapeIds = collisionShapeIds.get(layer.name) || [];
      lines.push('');
      lines.push(...generateCollisionLayerNode(layer, shapeIds));
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate a TileSet sub_resource with atlas source
 */
function generateTileSetSubResource(id: number, textureExtId: number, gridSize: number): string {
  return `[sub_resource type="TileSet" id="${id}"]
tile_shape = 0
tile_size = Vector2i(${gridSize}, ${gridSize})
0:sources/0 = ExtResource("${textureExtId}")`;
}

/**
 * Generate a RectangleShape2D sub_resource for collision
 */
function generateRectangleShapeSubResource(id: number, gridSize: number): string {
  // RectangleShape2D size is full width/height (centered on position)
  return `[sub_resource type="RectangleShape2D" id="${id}"]
size = Vector2(${gridSize}, ${gridSize})`;
}

function generateTileLayerNode(layer: LdtkConvertedTileLayer, tileSetSubId?: number): string[] {
  const lines: string[] = [];
  lines.push(`[node name="${layer.name}" type="TileMapLayer" parent="."]`);

  if (tileSetSubId !== undefined) {
    lines.push(`tile_set = SubResource("${tileSetSubId}")`);
  }

  if (layer.offsetX !== 0 || layer.offsetY !== 0) {
    lines.push(`position = Vector2(${layer.offsetX}, ${layer.offsetY})`);
  }

  // Generate tile_map_data for Godot 4.x format
  // Each tile entry: gridX, gridY, sourceId (0), atlasCoords, alternativeId
  if (layer.tiles.length > 0) {
    const tileData = generateTileMapData(layer);
    lines.push(`tile_map_data = ${tileData}`);
  }

  // Keep metadata for debugging/reference
  lines.push(`metadata/grid_size = ${layer.gridSize}`);
  lines.push(`metadata/tile_count = ${layer.tiles.length}`);

  return lines;
}

/**
 * Generate tile_map_data PackedByteArray for Godot 4.x TileMapLayer
 * Format based on Godot source (tile_map_layer.cpp):
 * - 2 bytes: format version (currently 1)
 * - Per tile (12 bytes each):
 *   - int16: x coordinate
 *   - int16: y coordinate
 *   - int16: source id (0 for single tileset)
 *   - int16: atlas x coordinate
 *   - int16: atlas y coordinate
 *   - int16: alternative tile id (0 for base, 1-7 for flips)
 */
function generateTileMapData(layer: LdtkConvertedTileLayer): string {
  const bytes: number[] = [];

  // Format version (uint16 little-endian) - version 1
  bytes.push(1, 0);

  for (const tile of layer.tiles) {
    // Calculate alternative tile ID for flip flags
    // Godot uses: bit 0 = flip_h, bit 1 = flip_v, bit 2 = transpose
    let alternativeId = 0;
    if (tile.flipX) alternativeId |= 1;
    if (tile.flipY) alternativeId |= 2;

    // x coordinate (int16 little-endian)
    bytes.push(tile.gridX & 0xFF, (tile.gridX >> 8) & 0xFF);
    // y coordinate (int16 little-endian)
    bytes.push(tile.gridY & 0xFF, (tile.gridY >> 8) & 0xFF);
    // source id (int16 little-endian) - 0 for single tileset
    bytes.push(0, 0);
    // atlas x (int16 little-endian)
    bytes.push(tile.atlasX & 0xFF, (tile.atlasX >> 8) & 0xFF);
    // atlas y (int16 little-endian)
    bytes.push(tile.atlasY & 0xFF, (tile.atlasY >> 8) & 0xFF);
    // alternative tile id (int16 little-endian)
    bytes.push(alternativeId & 0xFF, (alternativeId >> 8) & 0xFF);
  }

  return `PackedByteArray(${bytes.join(', ')})`;
}

function generateEntityLayerNode(
  layer: LdtkConvertedEntityLayer,
  entityMapping?: LdtkEntityMappingInput[],
): string[] {
  const lines: string[] = [];
  lines.push(`[node name="${layer.name}" type="Node2D" parent="."]`);

  const mappingLookup = new Map<string, LdtkEntityMappingInput>();
  if (entityMapping) {
    for (const mapping of entityMapping) {
      mappingLookup.set(mapping.ldtkIdentifier, mapping);
    }
  }

  for (const entity of layer.entities) {
    const mapping = mappingLookup.get(entity.identifier);
    const nodeType = mapping?.godotNodeType ?? 'Marker2D';
    const nodeName = entity.identifier;

    lines.push('');
    lines.push(`[node name="${nodeName}" type="${nodeType}" parent="${layer.name}"]`);
    lines.push(`position = Vector2(${entity.pixelX}, ${entity.pixelY})`);

    // Add entity fields as metadata
    for (const [key, value] of Object.entries(entity.fields)) {
      const serialized = typeof value === 'string' ? `"${value}"` : String(value);
      lines.push(`metadata/${key} = ${serialized}`);
    }

    // Apply mapped properties
    if (mapping?.properties) {
      for (const [key, value] of Object.entries(mapping.properties)) {
        const serialized = typeof value === 'string' ? `"${value}"` : String(value);
        lines.push(`${key} = ${serialized}`);
      }
    }
  }

  return lines;
}

function generateCollisionLayerNode(
  layer: LdtkConvertedCollisionLayer,
  shapeSubResourceIds: number[],
): string[] {
  const lines: string[] = [];
  lines.push(`[node name="${layer.name}" type="StaticBody2D" parent="."]`);

  // Generate rectangular collision shapes with proper shape resources
  for (let i = 0; i < layer.cells.length; i++) {
    const cell = layer.cells[i];
    const centerX = cell.gridX * layer.gridSize + layer.gridSize / 2;
    const centerY = cell.gridY * layer.gridSize + layer.gridSize / 2;
    const shapeId = shapeSubResourceIds[i];

    lines.push('');
    lines.push(`[node name="Cell_${cell.gridX}_${cell.gridY}" type="CollisionShape2D" parent="${layer.name}"]`);
    lines.push(`position = Vector2(${centerX}, ${centerY})`);
    if (shapeId !== undefined) {
      lines.push(`shape = SubResource("${shapeId}")`);
    }
    lines.push(`metadata/intgrid_value = ${cell.value}`);
  }

  return lines;
}

export const handleImportLdtkLevel = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ImportLdtkLevelSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and ldtkPath',
    ]);
  }

  const typedArgs: ImportLdtkLevelInput = validation.data;

  // Validate .ldtk extension
  if (!typedArgs.ldtkPath.endsWith('.ldtk')) {
    return createErrorResponse('LDtk file must have .ldtk extension', [
      'Example: levels/world.ldtk',
    ]);
  }

  // Validate project path
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Validate LDtk file exists
  const ldtkFullPath = path.join(typedArgs.projectPath, typedArgs.ldtkPath);
  if (!fs.existsSync(ldtkFullPath)) {
    return createErrorResponse(`LDtk file not found: ${typedArgs.ldtkPath}`, [
      'Ensure the LDtk file path is correct (relative to project)',
      'Use import_asset to copy the .ldtk file into the project first',
    ]);
  }

  try {
    // Read and parse LDtk file
    const ldtkJson = await fs.readFile(ldtkFullPath, 'utf-8');
    const project = parseLdtkProject(ldtkJson);

    logDebug(`Parsed LDtk project v${project.jsonVersion} with ${project.levels.length} levels`);

    // Convert levels
    let convertedLevels: LdtkConvertedLevel[];

    if (typedArgs.levelIdentifier) {
      // Find specific level
      const level = project.levels.find(
        (l) => l.identifier === typedArgs.levelIdentifier,
      );
      if (!level) {
        const available = project.levels.map((l) => l.identifier).join(', ');
        return createErrorResponse(
          `Level not found: ${typedArgs.levelIdentifier}`,
          [`Available levels: ${available || 'none'}`],
        );
      }
      convertedLevels = [convertLevel(level, typedArgs.createCollision)];
    } else {
      convertedLevels = convertAllLevels(project, typedArgs.createCollision);
    }

    if (convertedLevels.length === 0) {
      return createErrorResponse('No levels found in LDtk file', [
        'Ensure the LDtk file contains at least one level',
      ]);
    }

    // Determine output directory
    const outputDir = typedArgs.outputPath
      ? path.join(typedArgs.projectPath, typedArgs.outputPath)
      : path.join(typedArgs.projectPath, path.dirname(typedArgs.ldtkPath));

    await fs.ensureDir(outputDir);

    // Generate and write .tscn files
    const writtenFiles: string[] = [];
    let totalLayers = 0;
    let totalTiles = 0;
    let totalEntities = 0;

    for (const level of convertedLevels) {
      const tscnContent = generateTscn(level, typedArgs.entityMapping, typedArgs.tileSize);
      const outputFile = path.join(outputDir, `${level.identifier}.tscn`);

      await fs.writeFile(outputFile, tscnContent, 'utf-8');

      const relPath = path.relative(typedArgs.projectPath, outputFile);
      writtenFiles.push(relPath);

      totalLayers += level.layers.length;
      for (const layer of level.layers) {
        if (layer.type === 'tiles') totalTiles += layer.tiles.length;
        if (layer.type === 'entities') totalEntities += layer.entities.length;
      }

      logDebug(`Wrote ${relPath}`);
    }

    const stats = [
      `Levels: ${convertedLevels.length}`,
      `Layers: ${totalLayers}`,
      `Tiles: ${totalTiles}`,
      `Entities: ${totalEntities}`,
      `Collision: ${typedArgs.createCollision ? 'enabled' : 'disabled'}`,
    ];

    return createSuccessResponse(
      `LDtk import successful\n` +
      `Files: ${writtenFiles.join(', ')}\n` +
      `Stats: ${stats.join(', ')}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to import LDtk level: ${errorMessage}`, [
      'Ensure the LDtk file is valid JSON',
      'Check file permissions',
    ]);
  }
};
