/**
 * Delete Script Tool
 * Deletes a GDScript file from the project
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
import { logDebug } from '../../utils/Logger.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import {
  DeleteScriptSchema,
  DeleteScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

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

  logDebug(`Deleting script: ${typedArgs.scriptPath}`);

  // Try bridge first, fallback to file deletion
  return executeWithBridge(
    'delete_script',
    {
      script_path: typedArgs.scriptPath.replace(/\\/g, '/'),
    },
    async () => {
      // Fallback: delete file directly
      try {
        const fullPath = join(typedArgs.projectPath, typedArgs.scriptPath);

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
    }
  );
};
