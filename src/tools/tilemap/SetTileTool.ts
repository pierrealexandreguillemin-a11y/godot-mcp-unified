/**
 * Set Tile Tool
 * Sets a single tile in a TileMapLayer at a specified position
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
  SetTileSchema,
  SetTileInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const setTileDefinition: ToolDefinition = {
  name: 'set_tile',
  description: 'Set a single tile in a TileMapLayer at a specified grid position',
  inputSchema: toMcpSchema(SetTileSchema),
};

export const handleSetTile = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SetTileSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, tilemapNodePath, position, sourceId, and atlasCoords',
    ]);
  }

  const typedArgs: SetTileInput = validation.data;

  // Validate position (before project validation)
  if (!typedArgs.position || typeof typedArgs.position.x !== 'number' || typeof typedArgs.position.y !== 'number') {
    return createErrorResponse('Invalid position format', [
      'position must be an object with x and y properties',
      'Example: { x: 5, y: 3 }',
    ]);
  }

  // Validate atlas coords (before project validation)
  if (!typedArgs.atlasCoords || typeof typedArgs.atlasCoords.x !== 'number' || typeof typedArgs.atlasCoords.y !== 'number') {
    return createErrorResponse('Invalid atlasCoords format', [
      'atlasCoords must be an object with x and y properties',
      'Example: { x: 0, y: 0 }',
    ]);
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

    logDebug(`Setting tile at (${typedArgs.position.x}, ${typedArgs.position.y}) in ${typedArgs.tilemapNodePath}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      tilemapNodePath: typedArgs.tilemapNodePath,
      layer: typedArgs.layer ?? 0,
      position: typedArgs.position,
      sourceId: typedArgs.sourceId,
      atlasCoords: typedArgs.atlasCoords,
      alternativeTile: typedArgs.alternativeTile ?? 0,
    };

    // Use bridge if available, fallback to GodotExecutor
    return await executeWithBridge(
      'set_tile',
      {
        scene_path: typedArgs.scenePath,
        tilemap_node_path: typedArgs.tilemapNodePath,
        layer: typedArgs.layer ?? 0,
        position: typedArgs.position,
        source_id: typedArgs.sourceId,
        atlas_coords: typedArgs.atlasCoords,
        alternative_tile: typedArgs.alternativeTile ?? 0,
      },
      async () => {
        const { stdout, stderr } = await executeOperation(
          'set_tile',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to set tile: ${stderr}`, [
            'Check if the TileMapLayer node path is correct',
            'Verify the source ID and atlas coordinates are valid',
            'Ensure the TileSet is properly configured',
          ]);
        }

        return createSuccessResponse(
          `Tile set successfully at (${typedArgs.position.x}, ${typedArgs.position.y})\nSource: ${typedArgs.sourceId}, Atlas: (${typedArgs.atlasCoords.x}, ${typedArgs.atlasCoords.y})\n\nOutput: ${stdout}`,
        );
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to set tile: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the TileMapLayer and TileSet are configured correctly',
    ]);
  }
};
