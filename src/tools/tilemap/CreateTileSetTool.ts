/**
 * Create TileSet Tool
 * Creates a TileSet resource for use with TileMapLayers
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
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateTileSetSchema,
  CreateTileSetInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createTileSetDefinition: ToolDefinition = {
  name: 'create_tileset',
  description: 'Create a TileSet resource with specified tile size and optional texture atlas',
  inputSchema: toMcpSchema(CreateTileSetSchema),
};

export const handleCreateTileSet = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateTileSetSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, tilesetPath, and tileSize',
    ]);
  }

  const typedArgs: CreateTileSetInput = validation.data;

  // Validate tile size (before project validation)
  if (!typedArgs.tileSize || typeof typedArgs.tileSize.x !== 'number' || typeof typedArgs.tileSize.y !== 'number') {
    return createErrorResponse('Invalid tileSize format', [
      'tileSize must be an object with x and y properties',
      'Example: { x: 16, y: 16 }',
    ]);
  }

  if (typedArgs.tileSize.x <= 0 || typedArgs.tileSize.y <= 0) {
    return createErrorResponse('Tile size must be positive', [
      'Both x and y must be greater than 0',
    ]);
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Creating TileSet at ${typedArgs.tilesetPath} with tile size ${typedArgs.tileSize.x}x${typedArgs.tileSize.y}`);

    const params: BaseToolArgs = {
      tilesetPath: typedArgs.tilesetPath,
      tileSize: typedArgs.tileSize,
    };

    if (typedArgs.texturePath) {
      params.texturePath = typedArgs.texturePath;
    }

    const { stdout, stderr } = await executeOperation(
      'create_tileset',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create TileSet: ${stderr}`, [
        'Check if the output path is valid',
        'Verify the texture path exists (if provided)',
        'Ensure the project has write permissions',
      ]);
    }

    const textureInfo = typedArgs.texturePath ? ` with texture: ${typedArgs.texturePath}` : '';
    return createSuccessResponse(
      `TileSet created successfully at ${typedArgs.tilesetPath}\nTile size: ${typedArgs.tileSize.x}x${typedArgs.tileSize.y}${textureInfo}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create TileSet: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path is accessible',
    ]);
  }
};
