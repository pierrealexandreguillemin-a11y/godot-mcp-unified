/**
 * Add Node Tool
 * Adds nodes to existing scenes in Godot projects
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, AddNodeArgs } from '../../server/types';
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

export const addNodeDefinition: ToolDefinition = {
  name: 'add_node',
  description: 'Add a node to an existing scene in a Godot project',
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
      nodeType: {
        type: 'string',
        description: 'Type of the node to add (e.g., Node2D, Sprite2D, RigidBody2D)',
      },
      nodeName: {
        type: 'string',
        description: 'Name for the new node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (optional, defaults to root)',
      },
      properties: {
        type: 'object',
        description: 'Additional properties to set on the node (optional)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeType', 'nodeName'],
  },
};

export const handleAddNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'nodeType',
    'nodeName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, nodeType, and nodeName',
    ]);
  }

  const typedArgs = preparedArgs as AddNodeArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    // Ensure Godot path is available
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Adding node ${typedArgs.nodeName} (${typedArgs.nodeType}) to scene: ${typedArgs.scenePath}`);

    // Prepare parameters for the operation
    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodeType: typedArgs.nodeType,
      nodeName: typedArgs.nodeName,
    };

    // Add optional parameters
    if (typedArgs.parentNodePath) {
      params.parentNodePath = typedArgs.parentNodePath;
    }

    if (typedArgs.properties) {
      params.properties = typedArgs.properties;
    }

    // Execute the operation
    const { stdout, stderr } = await executeOperation(
      'add_node',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to add node: ${stderr}`, [
        'Check if the node type is valid',
        'Ensure the parent node path exists',
        'Verify the scene file is not corrupted',
      ]);
    }

    return createSuccessResponse(
      `Node added successfully: ${typedArgs.nodeName} (${typedArgs.nodeType})\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to add node: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
