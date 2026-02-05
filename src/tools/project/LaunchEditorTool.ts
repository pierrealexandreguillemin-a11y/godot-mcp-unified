/**
 * Launch Editor Tool
 * Launches the Godot editor for a specific project
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
import { detectGodotPath } from '../../core/PathManager.js';
import { launchGodotEditor } from '../../core/ProcessManager.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import {
  LaunchEditorSchema,
  LaunchEditorInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const launchEditorDefinition: ToolDefinition = {
  name: 'launch_editor',
  description: 'Launch Godot editor for a specific project',
  inputSchema: toMcpSchema(LaunchEditorSchema),
};

export const handleLaunchEditor = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(LaunchEditorSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: LaunchEditorInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    launchGodotEditor(godotPath, typedArgs.projectPath);

    return createSuccessResponse(
      `Godot editor launched successfully for project at ${typedArgs.projectPath}.`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to launch Godot editor: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
