/**
 * Create Animation Tree Tool
 * Creates an AnimationTree node for advanced animation blending and state machines
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  CreateAnimationTreeSchema,
  CreateAnimationTreeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface CreateAnimationTreeResult {
  nodeName: string;
  scenePath: string;
  animPlayerPath?: string;
  message: string;
}

export const createAnimationTreeDefinition: ToolDefinition = {
  name: 'create_animation_tree',
  description:
    'Create an AnimationTree node for advanced animation control including state machines and blend spaces',
  inputSchema: toMcpSchema(CreateAnimationTreeSchema),
};

export const handleCreateAnimationTree = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateAnimationTreeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs: CreateAnimationTreeInput = validation.data;

  // Validate nodeName - Godot node names cannot contain / : @ or be empty
  const invalidNodeNameChars = /[/:@]/;
  if (!typedArgs.nodeName || typedArgs.nodeName.trim() === '') {
    return createErrorResponse('nodeName cannot be empty', [
      'Provide a valid node name',
    ]);
  }
  if (invalidNodeNameChars.test(typedArgs.nodeName)) {
    return createErrorResponse('nodeName contains invalid characters', [
      'Node names cannot contain: / : @',
      `Received: "${typedArgs.nodeName}"`,
    ]);
  }

  // Validate scenePath extension
  if (!typedArgs.scenePath.endsWith('.tscn') && !typedArgs.scenePath.endsWith('.scn')) {
    return createErrorResponse('scenePath must be a scene file (.tscn or .scn)', [
      `Received: "${typedArgs.scenePath}"`,
    ]);
  }

  // Validate processCallback if provided
  if (
    typedArgs.processCallback &&
    !['idle', 'physics', 'manual'].includes(typedArgs.processCallback)
  ) {
    return createErrorResponse('Invalid processCallback value', [
      'Use one of: idle, physics, manual',
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
        'Set GODOT_PATH environment variable',
      ]);
    }

    logDebug(`Creating AnimationTree node ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodeName: typedArgs.nodeName,
    };

    if (typedArgs.parentNodePath) {
      params.parentNodePath = typedArgs.parentNodePath;
    }
    if (typedArgs.animPlayerPath) {
      params.animPlayerPath = typedArgs.animPlayerPath;
    }
    if (typedArgs.rootMotionTrack) {
      params.rootMotionTrack = typedArgs.rootMotionTrack;
    }
    if (typedArgs.processCallback) {
      params.processCallback = typedArgs.processCallback;
    }

    const { stderr } = await executeOperation(
      'create_animation_tree',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create AnimationTree: ${stderr}`, [
        'Check if the parent node path exists',
        'Verify the scene file is valid',
      ]);
    }

    const result: CreateAnimationTreeResult = {
      nodeName: typedArgs.nodeName,
      scenePath: typedArgs.scenePath,
      animPlayerPath: typedArgs.animPlayerPath,
      message: `AnimationTree '${typedArgs.nodeName}' created successfully`,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create AnimationTree: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project and scene paths',
    ]);
  }
};
