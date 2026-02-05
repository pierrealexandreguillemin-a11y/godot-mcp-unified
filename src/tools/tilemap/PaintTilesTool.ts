/**
 * Paint Tiles Tool
 * Paints multiple tiles in a TileMapLayer in a single operation
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  PaintTilesSchema,
  PaintTilesInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const paintTilesDefinition: ToolDefinition = {
  name: 'paint_tiles',
  description: 'Paint multiple tiles in a TileMapLayer in a single batch operation',
  inputSchema: toMcpSchema(PaintTilesSchema),
};

export const handlePaintTiles = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(PaintTilesSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, tilemapNodePath, and tiles array',
    ]);
  }

  const typedArgs: PaintTilesInput = validation.data;

  // Validate tiles array (before project validation)
  if (!Array.isArray(typedArgs.tiles) || typedArgs.tiles.length === 0) {
    return createErrorResponse('Tiles must be a non-empty array', [
      'Provide at least one tile placement',
      'Example: [{ position: { x: 0, y: 0 }, sourceId: 0, atlasCoords: { x: 0, y: 0 } }]',
    ]);
  }

  // Validate each tile
  for (let i = 0; i < typedArgs.tiles.length; i++) {
    const tile = typedArgs.tiles[i];
    if (!tile.position || typeof tile.position.x !== 'number' || typeof tile.position.y !== 'number') {
      return createErrorResponse(`Invalid position in tile ${i}`, [
        'Each tile must have a position with x and y properties',
      ]);
    }
    if (typeof tile.sourceId !== 'number') {
      return createErrorResponse(`Invalid sourceId in tile ${i}`, [
        'Each tile must have a sourceId (number)',
      ]);
    }
    if (!tile.atlasCoords || typeof tile.atlasCoords.x !== 'number' || typeof tile.atlasCoords.y !== 'number') {
      return createErrorResponse(`Invalid atlasCoords in tile ${i}`, [
        'Each tile must have atlasCoords with x and y properties',
      ]);
    }
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Painting ${typedArgs.tiles.length} tiles in ${typedArgs.tilemapNodePath}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      tilemapNodePath: typedArgs.tilemapNodePath,
      layer: typedArgs.layer ?? 0,
      tiles: typedArgs.tiles.map(tile => ({
        position: tile.position,
        sourceId: tile.sourceId,
        atlasCoords: tile.atlasCoords,
        alternativeTile: tile.alternativeTile ?? 0,
      })),
    };

    const { stdout, stderr } = await executeOperation(
      'paint_tiles',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to paint tiles: ${stderr}`, [
        'Check if the TileMapLayer node path is correct',
        'Verify all tile positions and atlas coordinates are valid',
        'Ensure the TileSet is properly configured',
      ]);
    }

    return createSuccessResponse(
      `Successfully painted ${typedArgs.tiles.length} tiles in ${typedArgs.tilemapNodePath}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to paint tiles: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the TileMapLayer and TileSet are configured correctly',
    ]);
  }
};
