/**
 * Set Tile Tool
 * Sets a single tile in a TileMapLayer at a specified position
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SetTileArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';

export const setTileDefinition: ToolDefinition = {
  name: 'set_tile',
  description: 'Set a single tile in a TileMapLayer at a specified grid position',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scenePath: {
        type: 'string',
        description: 'Path to the scene file (relative to project)',
      },
      tilemapNodePath: {
        type: 'string',
        description: 'Path to the TileMapLayer node in the scene',
      },
      layer: {
        type: 'number',
        description: 'Layer index for multi-layer tilemaps (optional, default: 0)',
      },
      position: {
        type: 'object',
        description: 'Grid position for the tile (e.g., { x: 5, y: 3 })',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
        },
      },
      sourceId: {
        type: 'number',
        description: 'Source ID in the TileSet (usually 0 for single-source tilesets)',
      },
      atlasCoords: {
        type: 'object',
        description: 'Atlas coordinates of the tile in the tileset (e.g., { x: 0, y: 0 })',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
        },
      },
      alternativeTile: {
        type: 'number',
        description: 'Alternative tile index (optional, default: 0)',
      },
    },
    required: ['projectPath', 'scenePath', 'tilemapNodePath', 'position', 'sourceId', 'atlasCoords'],
  },
};

export const handleSetTile = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'tilemapNodePath',
    'position',
    'sourceId',
    'atlasCoords',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, tilemapNodePath, position, sourceId, and atlasCoords',
    ]);
  }

  const typedArgs = preparedArgs as SetTileArgs;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to set tile: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the TileMapLayer and TileSet are configured correctly',
    ]);
  }
};
