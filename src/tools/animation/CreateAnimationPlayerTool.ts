/**
 * Create Animation Player Tool
 * Creates an AnimationPlayer node in a scene
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';
import {
  CreateAnimationPlayerSchema,
  CreateAnimationPlayerInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const createAnimationPlayerDefinition: ToolDefinition = {
  name: 'create_animation_player',
  description: 'Create an AnimationPlayer node in a scene for managing animations',
  inputSchema: toMcpSchema(CreateAnimationPlayerSchema),
};

export const handleCreateAnimationPlayer = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(CreateAnimationPlayerSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodeName',
    ]);
  }

  const typedArgs: CreateAnimationPlayerInput = validation.data;

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
