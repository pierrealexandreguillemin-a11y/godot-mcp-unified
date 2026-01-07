/**
 * Add Animation Track Tool
 * Adds a track to an existing animation
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
  AddAnimationTrackSchema,
  AddAnimationTrackInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const addAnimationTrackDefinition: ToolDefinition = {
  name: 'add_animation_track',
  description: 'Add a track to an existing animation for animating node properties',
  inputSchema: toMcpSchema(AddAnimationTrackSchema),
};

export const handleAddAnimationTrack = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(AddAnimationTrackSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, playerNodePath, animationName, trackType, and nodePath',
    ]);
  }

  const typedArgs: AddAnimationTrackInput = validation.data;

  // Validate track type requires property for value tracks (before project validation)
  if (typedArgs.trackType === 'value' && !typedArgs.property) {
    return createErrorResponse('Property is required for value tracks', [
      'Specify the property to animate (e.g., "modulate", "position", "scale")',
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

    logDebug(`Adding ${typedArgs.trackType} track to animation ${typedArgs.animationName}`);

    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      playerNodePath: typedArgs.playerNodePath,
      animationName: typedArgs.animationName,
      trackType: typedArgs.trackType,
      nodePath: typedArgs.nodePath,
    };

    if (typedArgs.property) {
      params.property = typedArgs.property;
    }

    const { stdout, stderr } = await executeOperation(
      'add_animation_track',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to add animation track: ${stderr}`, [
        'Check if the animation exists',
        'Verify the target node path is correct',
        'Ensure the property name is valid for the node type',
      ]);
    }

    const trackDescription = typedArgs.property
      ? `${typedArgs.trackType} track for ${typedArgs.nodePath}:${typedArgs.property}`
      : `${typedArgs.trackType} track for ${typedArgs.nodePath}`;

    return createSuccessResponse(
      `Animation track added successfully: ${trackDescription}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to add animation track: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the animation and node paths are correct',
    ]);
  }
};
