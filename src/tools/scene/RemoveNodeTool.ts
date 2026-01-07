/**
 * Remove Node Tool
 * Removes nodes from existing scenes in Godot projects
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
  RemoveNodeSchema,
  RemoveNodeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const removeNodeDefinition: ToolDefinition = {
  name: 'remove_node',
  description: 'Remove a node from an existing scene in a Godot project',
  inputSchema: toMcpSchema(RemoveNodeSchema),
};

export const handleRemoveNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(RemoveNodeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, and nodePath',
    ]);
  }

  const typedArgs: RemoveNodeInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  try {
    // Ensure Godot path is available
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Removing node ${typedArgs.nodePath} from scene: ${typedArgs.scenePath}`);

    // Prepare parameters for the operation
    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
      nodePath: typedArgs.nodePath,
    };

    // Execute the operation
    const { stdout, stderr } = await executeOperation(
      'remove_node',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to remove node: ${stderr}`, [
        'Check if the node path exists in the scene',
        'Ensure the node is not referenced by other nodes',
        'Verify the scene file is not corrupted',
      ]);
    }

    return createSuccessResponse(
      `Node removed successfully: ${typedArgs.nodePath}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to remove node: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path and scene path are accessible',
    ]);
  }
};
