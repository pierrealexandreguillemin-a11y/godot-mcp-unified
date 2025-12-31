/**
 * Create Navigation Region Tool
 * Creates NavigationRegion2D or NavigationRegion3D nodes
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
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

export interface CreateNavigationRegionArgs extends BaseToolArgs {
  projectPath: string;
  scenePath: string;
  nodeName: string;
  parentNodePath?: string;
  is3D?: boolean;
  navigationMeshPath?: string;
}

export const createNavigationRegionDefinition: ToolDefinition = {
  name: 'create_navigation_region',
  description: 'Create a NavigationRegion2D or NavigationRegion3D node for pathfinding',
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
        description: 'Name for the NavigationRegion node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to parent node (default: root)',
      },
      is3D: {
        type: 'boolean',
        description: 'Create 3D navigation region (default: false for 2D)',
      },
      navigationMeshPath: {
        type: 'string',
        description: 'Path to NavigationMesh/NavigationPolygon resource',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName'],
  },
};

export const handleCreateNavigationRegion = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs = preparedArgs as CreateNavigationRegionArgs;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create navigation region: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
    ]);
  }
};
