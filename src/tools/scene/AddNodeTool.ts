/**
 * Add Node Tool
 * Adds nodes to existing scenes in Godot projects
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
  AddNodeSchema,
  AddNodeInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const addNodeDefinition: ToolDefinition = {
  name: 'add_node',
  description: 'Add a node to an existing scene in a Godot project',
  inputSchema: toMcpSchema(AddNodeSchema),
};

export const handleAddNode = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(AddNodeSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodeType, and nodeName',
    ]);
  }

  const typedArgs: AddNodeInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  logDebug(`Adding node ${typedArgs.nodeName} (${typedArgs.nodeType}) to scene: ${typedArgs.scenePath}`);

  // Try bridge first, fallback to GodotExecutor
  return executeWithBridge(
    'add_node',
    {
      node_type: typedArgs.nodeType,
      node_name: typedArgs.nodeName,
      parent_path: typedArgs.parentNodePath || '.',
      properties: typedArgs.properties || {},
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
          nodeType: typedArgs.nodeType,
          nodeName: typedArgs.nodeName,
        };

        if (typedArgs.parentNodePath) {
          params.parentNodePath = typedArgs.parentNodePath;
        }

        if (typedArgs.properties) {
          params.properties = typedArgs.properties;
        }

        const { stdout, stderr } = await executeOperation(
          'add_node',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to add node: ${stderr}`, [
            'Check if the node type is valid',
            'Ensure the parent node path exists',
            'Verify the scene file is not corrupted',
          ]);
        }

        return createSuccessResponse(
          `Node added successfully: ${typedArgs.nodeName} (${typedArgs.nodeType})\n\nOutput: ${stdout}`,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to add node: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path and scene path are accessible',
        ]);
      }
    }
  );
};
