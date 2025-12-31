/**
 * Set Keyframe Tool
 * Sets a keyframe value at a specific time in an animation track
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, SetKeyframeArgs } from '../../server/types';
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

export const setKeyframeDefinition: ToolDefinition = {
  name: 'set_keyframe',
  description: 'Set a keyframe value at a specific time in an animation track',
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
        description: 'Name of the animation',
      },
      trackIndex: {
        type: 'number',
        description: 'Index of the track (0-based)',
      },
      time: {
        type: 'number',
        description: 'Time position in seconds for the keyframe',
      },
      value: {
        type: 'object',
        description: 'Value for the keyframe (type depends on track type: number, Vector2, Vector3, Color, etc.)',
      },
      transition: {
        type: 'number',
        description: 'Transition type: 0=LINEAR, 1=SINE, 2=QUINT, 3=QUART, 4=QUAD, 5=EXPO, 6=ELASTIC, 7=CUBIC, 8=CIRC, 9=BOUNCE, 10=BACK, 11=SPRING (default: 0)',
      },
      easing: {
        type: 'number',
        description: 'Easing type: 0=EASE_IN, 1=EASE_OUT, 2=EASE_IN_OUT, 3=EASE_OUT_IN (default: 0)',
      },
    },
    required: ['projectPath', 'scenePath', 'playerNodePath', 'animationName', 'trackIndex', 'time', 'value'],
  },
};

export const handleSetKeyframe = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, [
    'projectPath',
    'scenePath',
    'playerNodePath',
    'animationName',
    'trackIndex',
    'time',
    'value',
  ]);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scenePath, playerNodePath, animationName, trackIndex, time, and value',
    ]);
  }

  const typedArgs = preparedArgs as SetKeyframeArgs;

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

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Setting keyframe at ${typedArgs.time}s in track ${typedArgs.trackIndex} of animation ${typedArgs.animationName}`);

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
};
