/**
 * Set Keyframe Tool
 * Sets a keyframe value at a specific time in an animation track
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
  SetKeyframeSchema,
  SetKeyframeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const setKeyframeDefinition: ToolDefinition = {
  name: 'set_keyframe',
  description: 'Set a keyframe value at a specific time in an animation track',
  inputSchema: toMcpSchema(SetKeyframeSchema),
};

export const handleSetKeyframe = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SetKeyframeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, playerNodePath, animationName, trackIndex, time, and value',
    ]);
  }

  const typedArgs: SetKeyframeInput = validation.data;

  // Validate track index (before project validation)
  if (typedArgs.trackIndex < 0) {
    return createErrorResponse('Track index must be non-negative', [
      'Track indices are 0-based',
      'Use add_animation_track to create tracks first',
    ]);
  }

  // Validate time (before project validation)
  if (typedArgs.time < 0) {
    return createErrorResponse('Keyframe time must be non-negative', [
      'Time is in seconds from the start of the animation',
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

  logDebug(`Setting keyframe at ${typedArgs.time}s in track ${typedArgs.trackIndex} of animation ${typedArgs.animationName}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'set_keyframe',
    {
      player_node_path: typedArgs.playerNodePath,
      animation_name: typedArgs.animationName,
      track_index: typedArgs.trackIndex,
      time: typedArgs.time,
      value: typedArgs.value,
      transition: typedArgs.transition,
      easing: typedArgs.easing,
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
          trackIndex: typedArgs.trackIndex,
          time: typedArgs.time,
          value: typedArgs.value,
        };

        if (typedArgs.transition !== undefined) {
          params.transition = typedArgs.transition;
        }

        if (typedArgs.easing !== undefined) {
          params.easing = typedArgs.easing;
        }

        const { stdout, stderr } = await executeOperation(
          'set_keyframe',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to set keyframe: ${stderr}`, [
            'Check if the animation and track exist',
            'Verify the track index is valid',
            'Ensure the value type matches the track type',
          ]);
        }

        return createSuccessResponse(
          `Keyframe set successfully at ${typedArgs.time}s in track ${typedArgs.trackIndex}\n\nOutput: ${stdout}`,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to set keyframe: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Verify the animation, track, and time values are valid',
        ]);
      }
    }
  );
};
