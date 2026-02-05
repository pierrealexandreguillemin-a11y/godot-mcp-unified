/**
 * Update Project UIDs Tool
 * Updates UID references in a Godot project by resaving resources (for Godot 4.4+)
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation, getGodotVersion, isGodot44OrLater } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  UpdateProjectUidsSchema,
  UpdateProjectUidsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const updateProjectUidsDefinition: ToolDefinition = {
  name: 'update_project_uids',
  description: 'Update UID references in a Godot project by resaving resources (for Godot 4.4+)',
  inputSchema: toMcpSchema(UpdateProjectUidsSchema),
};

/**
 * Handle the update_project_uids tool
 */
export const handleUpdateProjectUids = async (args: BaseToolArgs): Promise<ToolResponse> => {
  // Validate and normalize arguments
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(UpdateProjectUidsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: UpdateProjectUidsInput = validation.data;

  // Validate project path
  const projectValidation = validateProjectPath(typedArgs.projectPath);
  if (projectValidation) {
    return projectValidation;
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

    // Get Godot version to check if UIDs are supported
    const version = await getGodotVersion(godotPath);
    if (!isGodot44OrLater(version)) {
      return createErrorResponse(
        `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
        [
          'Upgrade to Godot 4.4 or later to use UIDs',
          'Use resource paths instead of UIDs for this version of Godot',
        ],
      );
    }

    logDebug(`Updating project UIDs for: ${typedArgs.projectPath}`);

    // Prepare parameters for the operation
    const params = {
      projectPath: typedArgs.projectPath,
    };

    // Use bridge if available, fallback to GodotExecutor
    return await executeWithBridge(
      'resave_resources',
      {
        project_path: typedArgs.projectPath,
      },
      async () => {
        const { stdout, stderr } = await executeOperation(
          'resave_resources',
          params,
          typedArgs.projectPath,
          godotPath,
        );

        if (stderr && stderr.includes('Failed to')) {
          return createErrorResponse(`Failed to update project UIDs: ${stderr}`, [
            'Check if the project is valid',
            'Ensure you have write permissions to the project directory',
          ]);
        }

        return createSuccessResponse(`Project UIDs updated successfully.\n\nOutput: ${stdout}`);
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to update project UIDs: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
