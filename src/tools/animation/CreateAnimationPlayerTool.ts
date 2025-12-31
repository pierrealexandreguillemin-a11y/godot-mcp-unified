/**
 * Create Animation Player Tool
 * Creates an AnimationPlayer node in a scene
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, CreateAnimationPlayerArgs } from '../../server/types';
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

export const createAnimationPlayerDefinition: ToolDefinition = {
  name: 'create_animation_player',
  description: 'Create an AnimationPlayer node in a scene for managing animations',
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
        description: 'Name for the AnimationPlayer node',
      },
      parentNodePath: {
        type: 'string',
        description: 'Path to the parent node (optional, defaults to root)',
      },
    },
    required: ['projectPath', 'scenePath', 'nodeName'],
  },
};

export const handleCreateAnimationPlayer = async (args: BaseToolArgs): Promise<ToolResponse> => {
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

  const typedArgs = preparedArgs as CreateAnimationPlayerArgs;

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

    logDebug(`Creating AnimationPlayer node ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodeType: 'AnimationPlayer',
      nodeName: typedArgs.nodeName,
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
      return createErrorResponse(`Failed to create AnimationPlayer: ${stderr}`, [
        'Check if the parent node path exists',
        'Verify the scene file is not corrupted',
      ]);
    }

    return createSuccessResponse(
      `AnimationPlayer created successfully: ${typedArgs.nodeName}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create AnimationPlayer: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
