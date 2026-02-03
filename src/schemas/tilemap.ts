/**
 * TileMap Tool Zod Schemas
 * ISO/IEC 5055 compliant - centralized validation
 */

import { z } from 'zod';
import { ProjectToolSchema, SceneToolSchema, NodePathSchema, PathSchema, Vector2Schema } from './common.js';

// ============================================================================
// TileMap Tool Schemas
// ============================================================================

export const CreateTileSetSchema = ProjectToolSchema.extend({
  tilesetPath: PathSchema,
  tileSize: Vector2Schema,
  texturePath: PathSchema.optional(),
});

export const CreateTileMapLayerSchema = SceneToolSchema.extend({
  nodeName: z.string().min(1).describe('Name for the TileMapLayer node'),
  parentNodePath: z.string().optional().describe('Path to the parent node (optional)'),
  tilesetPath: PathSchema.describe('Path to the TileSet resource'),
  zIndex: z.number().int().default(0).describe('Z-index for rendering order'),
});

export const SetTileSchema = SceneToolSchema.extend({
  tilemapNodePath: NodePathSchema,
  layer: z.number().int().min(0).default(0),
  position: Vector2Schema,
  sourceId: z.number().int().min(0),
  atlasCoords: Vector2Schema,
  alternativeTile: z.number().int().optional(),
});

export const TilePlacementSchema = z.object({
  position: Vector2Schema,
  sourceId: z.number().int().min(0),
  atlasCoords: Vector2Schema,
  alternativeTile: z.number().int().optional(),
});

export const PaintTilesSchema = SceneToolSchema.extend({
  tilemapNodePath: NodePathSchema,
  layer: z.number().int().min(0).default(0),
  tiles: z.array(TilePlacementSchema).min(1),
});

// ============================================================================
// LDtk Import Schemas
// ============================================================================

export const LdtkEntityMappingSchema = z.object({
  ldtkIdentifier: z.string().min(1).describe('LDtk entity identifier'),
  godotNodeType: z.string().min(1).describe('Godot node type to create'),
  properties: z.record(z.string(), z.unknown()).optional().describe('Additional properties to set on the node'),
});

export const ImportLdtkLevelSchema = ProjectToolSchema.extend({
  ldtkPath: PathSchema.describe('Path to the .ldtk file (relative to project)'),
  outputPath: PathSchema.optional().describe('Output path for generated .tscn files (relative to project)'),
  levelIdentifier: z.string().optional().describe('Specific level identifier to import (imports all if not specified)'),
  createCollision: z.boolean().default(false).describe('Generate collision shapes from IntGrid layers'),
  entityMapping: z.array(LdtkEntityMappingSchema).optional().describe('Mapping of LDtk entities to Godot node types'),
  tileSize: Vector2Schema.optional().describe('Override tile size (uses LDtk default if not specified)'),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateTileSetInput = z.infer<typeof CreateTileSetSchema>;
export type CreateTileMapLayerInput = z.infer<typeof CreateTileMapLayerSchema>;
export type SetTileInput = z.infer<typeof SetTileSchema>;
export type PaintTilesInput = z.infer<typeof PaintTilesSchema>;
export type ImportLdtkLevelInput = z.infer<typeof ImportLdtkLevelSchema>;
export type LdtkEntityMappingInput = z.infer<typeof LdtkEntityMappingSchema>;
