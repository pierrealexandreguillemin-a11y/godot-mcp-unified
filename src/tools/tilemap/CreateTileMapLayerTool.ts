/**
 * Create TileMapLayer Tool
 * Creates a TileMapLayer node with a specified TileSet
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
import { ToolContext, defaultToolContext } from '../ToolContext.js';
import {
  CreateTileMapLayerSchema,
  CreateTileMapLayerInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createTileMapLayerDefinition: ToolDefinition = {
  name: 'create_tilemap_layer',
  description: 'Create a TileMapLayer node in a scene with a specified TileSet',
  inputSchema: toMcpSchema(CreateTileMapLayerSchema),
};

export const handleCreateTileMapLayer = async (args: BaseToolArgs, ctx: ToolContext = defaultToolContext): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args, ctx);

  // Zod validation
  const validation = safeValidateInput(CreateTileMapLayerSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodeName, and tilesetPath',
    ]);
  }

  const typedArgs: CreateTileMapLayerInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath, ctx);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath, ctx);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    const godotPath = await ctx.detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    ctx.logDebug(`Creating TileMapLayer ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

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

    // Use bridge if available, fallback to GodotExecutor
    return await ctx.executeWithBridge(
      'add_node',
      {
        scene_path: typedArgs.scenePath,
        node_type: 'TileMapLayer',
        node_name: typedArgs.nodeName,
        parent_path: typedArgs.parentNodePath ?? '.',
        properties,
      },
      async () => {
        const { stdout, stderr } = await ctx.executeOperation(
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
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create TileMapLayer: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
