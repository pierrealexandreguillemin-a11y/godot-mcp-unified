/**
 * Edit Node Tool
 * Edits properties of existing nodes in Godot scenes
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  EditNodeSchema,
  EditNodeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const editNodeDefinition: ToolDefinition = {
  name: 'edit_node',
  description: 'Edit properties of an existing node in a Godot scene',
  inputSchema: toMcpSchema(EditNodeSchema),
};

export const handleEditNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(EditNodeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodePath, and properties',
    ]);
  }

  const typedArgs: EditNodeInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Editing node ${typedArgs.nodePath} in scene: ${typedArgs.scenePath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'edit_node',
    {
      node_path: typedArgs.nodePath,
      properties: typedArgs.properties,
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
          nodePath: typedArgs.nodePath,
          properties: typedArgs.properties,
        };

        const { stdout, stderr } = await executeOperation(
          'edit_node',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to edit node: ${stderr}`, [
            'Check if the node path exists in the scene',
            'Ensure the property names are valid for the node type',
            'Verify the scene file is not corrupted',
          ]);
        }

        return createSuccessResponse(`Node edited successfully: ${typedArgs.nodePath}\n\nOutput: ${stdout}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to edit node: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path and scene path are accessible',
        ]);
      }
    }
  );
};
