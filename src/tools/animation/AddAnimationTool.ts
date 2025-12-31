/**
 * Add Animation Tool
 * Adds a new animation to an AnimationPlayer
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, AddAnimationArgs } from '../../server/types';
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

export const addAnimationDefinition: ToolDefinition = {
  name: 'add_animation',
  description: 'Add a new animation to an AnimationPlayer node',
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
      playerNodePath: {
        type: 'string',
        description: 'Path to the AnimationPlayer node in the scene',
      },
      animationName: {
        type: 'string',
        description: 'Name for the new animation',
      },
      length: {
        type: 'number',
        description: 'Duration of the animation in seconds (default: 1.0)',
      },
      loop: {
        type: 'boolean',
        description: 'Whether the animation should loop (default: false)',
      },
    },
    required: ['projectPath', 'scenePath', 'playerNodePath', 'animationName'],
  },
};

export const handleAddAnimation = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'playerNodePath',
    'animationName',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, playerNodePath, and animationName',
    ]);
  }

  const typedArgs = preparedArgs as AddAnimationArgs;

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

    logDebug(`Adding animation ${typedArgs.animationName} to player: ${typedArgs.playerNodePath}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      playerNodePath: typedArgs.playerNodePath,
      animationName: typedArgs.animationName,
      length: typedArgs.length ?? 1.0,
      loop: typedArgs.loop ?? false,
    };

    const { stdout, stderr } = await executeOperation(
      'add_animation',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to add animation: ${stderr}`, [
        'Check if the AnimationPlayer node path is correct',
        'Ensure the animation name is unique',
        'Verify the scene file is valid',
      ]);
    }

    return createSuccessResponse(
      `Animation added successfully: ${typedArgs.animationName} (length: ${typedArgs.length ?? 1.0}s, loop: ${typedArgs.loop ?? false})\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to add animation: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the AnimationPlayer node exists in the scene',
    ]);
  }
};
