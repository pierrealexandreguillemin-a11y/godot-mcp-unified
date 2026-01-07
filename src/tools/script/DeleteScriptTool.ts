/**
 * Delete Script Tool
 * Deletes a GDScript file from the project
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import {
  DeleteScriptSchema,
  DeleteScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const deleteScriptDefinition: ToolDefinition = {
  name: 'delete_script',
  description: 'Delete a GDScript (.gd) file from the project',
  inputSchema: toMcpSchema(DeleteScriptSchema),
};

export const handleDeleteScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(DeleteScriptSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide both projectPath and scriptPath',
    ]);
  }

  const typedArgs: DeleteScriptInput = validation.data;

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
