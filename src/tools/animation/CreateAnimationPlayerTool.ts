/**
 * Create Animation Player Tool
 * Creates an AnimationPlayer node in a scene
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
  CreateAnimationPlayerSchema,
  CreateAnimationPlayerInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

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

  logDebug(`Creating AnimationPlayer node ${typedArgs.nodeName} in scene: ${typedArgs.scenePath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'add_node',
    {
      node_type: 'AnimationPlayer',
      node_name: typedArgs.nodeName,
      parent_path: typedArgs.parentNodePath || '.',
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
    }
  );
};
