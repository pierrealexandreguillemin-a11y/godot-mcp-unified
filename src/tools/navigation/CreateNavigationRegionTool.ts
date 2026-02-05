/**
 * Create Navigation Region Tool
 * Creates NavigationRegion2D or NavigationRegion3D nodes
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
  CreateNavigationRegionSchema,
  CreateNavigationRegionInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const createNavigationRegionDefinition: ToolDefinition = {
  name: 'create_navigation_region',
  description: 'Create a NavigationRegion2D or NavigationRegion3D node for pathfinding',
  inputSchema: toMcpSchema(CreateNavigationRegionSchema),
};

export const handleCreateNavigationRegion = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateNavigationRegionSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs: CreateNavigationRegionInput = validation.data;

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
        'Set GODOT_PATH environment variable',
      ]);
    }

    const is3D = typedArgs.is3D ?? false;
    const nodeType = is3D ? 'NavigationRegion3D' : 'NavigationRegion2D';
    logDebug(`Creating ${nodeType}: ${typedArgs.nodeName}`);

    const params: BaseToolArgs = {
      scene_path: typedArgs.scenePath,
      node_name: typedArgs.nodeName,
      parent_node_path: typedArgs.parentNodePath ?? '',
      is_3d: is3D,
    };

    if (typedArgs.navigationMeshPath) {
      params.navigation_mesh_path = typedArgs.navigationMeshPath;
    }

    // Build properties for bridge
    const bridgeProperties: Record<string, unknown> = {};
    if (typedArgs.navigationMeshPath) {
      bridgeProperties.navigation_mesh = typedArgs.navigationMeshPath;
    }

    // Use bridge if available, fallback to GodotExecutor
    return await executeWithBridge(
      'add_node',
      {
        scene_path: typedArgs.scenePath,
        node_type: nodeType,
        node_name: typedArgs.nodeName,
        parent_path: typedArgs.parentNodePath ?? '.',
        properties: bridgeProperties,
      },
      async () => {
        const { stdout, stderr } = await executeOperation(
          'create_navigation_region',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to create navigation region: ${stderr}`, [
            'Check if the parent node exists',
            'Verify the scene path is correct',
          ]);
        }

        return createSuccessResponse(
          `NavigationRegion created successfully: ${typedArgs.nodeName} (${nodeType})\n\nOutput: ${stdout}`,
        );
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create navigation region: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
