/**
 * Add Animation Tool
 * Adds a new animation to an AnimationPlayer
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
  AddAnimationSchema,
  AddAnimationInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const addAnimationDefinition: ToolDefinition = {
  name: 'add_animation',
  description: 'Add a new animation to an AnimationPlayer node',
  inputSchema: toMcpSchema(AddAnimationSchema),
};

export const handleAddAnimation = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(AddAnimationSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, playerNodePath, and animationName',
    ]);
  }

  const typedArgs: AddAnimationInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Adding animation ${typedArgs.animationName} to player: ${typedArgs.playerNodePath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'add_animation',
    {
      player_node_path: typedArgs.playerNodePath,
      animation_name: typedArgs.animationName,
      length: typedArgs.length ?? 1.0,
      loop: typedArgs.loop ?? false,
    },
    async () => {
      // Fallback: traditional GodotExecutor method
      try {
        const godotPath = await detectGodotPath();
        if (!godotPath) {
          return createErrorResponse('Could not find a valid Godot executable path', [
            'Ensure Godot is installed correctly',
            'Set GODOT_PATH environment variable to specify the correct path',
          ]);
        }

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
    }
  );
};
