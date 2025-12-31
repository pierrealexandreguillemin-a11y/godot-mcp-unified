/**
 * Create TileMapLayer Tool
 * Creates a TileMapLayer node with a specified TileSet
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, CreateTileMapLayerArgs } from '../../server/types';
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

export const createTileMapLayerDefinition: ToolDefinition = {
  name: 'create_tilemap_layer',
  description: 'Create a TileMapLayer node in a scene with a specified TileSet',
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
      nodeName: {
        type: 'string',
        description: 'Name for the TileMapLayer node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (optional, defaults to root)',
      },
      tilesetPath: {
        type: 'string',
        description: 'Path to the TileSet resource (relative to project)',
      },
      zIndex: {
        type: 'number',
        description: 'Z-index for rendering order (optional)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName', 'tilesetPath'],
  },
};

export const handleCreateTileMapLayer = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
    'tilesetPath',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeName, and tilesetPath',
    ]);
  }

  const typedArgs = preparedArgs as CreateTileMapLayerArgs;

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

    logDebug(`Creating TileMapLayer ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

    // Build properties for the TileMapLayer
    const properties: Record<string, unknown> = {
      tile_set: typedArgs.tilesetPath,
    };

    if (typedArgs.zIndex !== undefined) {
      properties.z_index = typedArgs.zIndex;
    }

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodeType: 'TileMapLayer',
      nodeName: typedArgs.nodeName,
      properties: properties,
    };

    if (typedArgs.parentNodePath) {
      params.parentNodePath = typedArgs.parentNodePath;
    }

    const { stdout, stderr } = await executeOperation(
      'add_node',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create TileMapLayer: ${stderr}`, [
        'Check if the parent node path exists',
        'Verify the TileSet path is correct',
        'Ensure the scene file is valid',
      ]);
    }

    return createSuccessResponse(
      `TileMapLayer created successfully: ${typedArgs.nodeName}\nTileSet: ${typedArgs.tilesetPath}${typedArgs.zIndex !== undefined ? `\nZ-Index: ${typedArgs.zIndex}` : ''}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create TileMapLayer: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
