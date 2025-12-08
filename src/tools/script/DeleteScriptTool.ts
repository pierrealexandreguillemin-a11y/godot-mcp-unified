/**
 * Delete Script Tool
 * Deletes a GDScript file from the project
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, DeleteScriptArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export const deleteScriptDefinition: ToolDefinition = {
  name: 'delete_script',
  description: 'Delete a GDScript (.gd) file from the project',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scriptPath: {
        type: 'string',
        description: 'Path to the script file (relative to project)',
      },
      force: {
        type: 'boolean',
        description: 'Skip confirmation (default: false)',
      },
    },
    required: ['projectPath', 'scriptPath'],
  },
};

export const handleDeleteScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scriptPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide both projectPath and scriptPath',
    ]);
  }

  const typedArgs = preparedArgs as DeleteScriptArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const fullPath = join(typedArgs.projectPath, typedArgs.scriptPath);

    logDebug(`Deleting script: ${fullPath}`);

    if (!existsSync(fullPath)) {
      return createErrorResponse(`Script file not found: ${typedArgs.scriptPath}`, [
        'Use list_scripts to find available scripts',
        'Check the script path is correct',
      ]);
    }

    if (!typedArgs.scriptPath.endsWith('.gd')) {
      return createErrorResponse('File is not a GDScript file (.gd)', [
        'Provide a path to a .gd file',
      ]);
    }

    // Delete the file
    unlinkSync(fullPath);

    return createSuccessResponse(
      `Script deleted successfully: ${typedArgs.scriptPath}\n` +
      `Note: Any scenes referencing this script may have broken references.`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to delete script: ${errorMessage}`, [
      'Check file permissions',
      'Verify the script path is correct',
    ]);
  }
};
