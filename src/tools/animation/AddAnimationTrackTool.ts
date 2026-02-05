/**
 * Add Animation Track Tool
 * Adds a track to an existing animation
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
  AddAnimationTrackSchema,
  AddAnimationTrackInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

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

  logDebug(`Adding ${typedArgs.trackType} track to animation ${typedArgs.animationName}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'add_animation_track',
    {
      player_node_path: typedArgs.playerNodePath,
      animation_name: typedArgs.animationName,
      track_type: typedArgs.trackType,
      node_path: typedArgs.nodePath,
      property: typedArgs.property,
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
    }
  );
};
