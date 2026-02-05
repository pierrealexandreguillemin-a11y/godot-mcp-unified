/**
 * Write Script Tool
 * Creates or updates a GDScript file
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
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
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  WriteScriptSchema,
  WriteScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const writeScriptDefinition: ToolDefinition = {
  name: 'write_script',
  description: 'Create or update a GDScript (.gd) file',
  inputSchema: toMcpSchema(WriteScriptSchema),
};

export const handleWriteScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(WriteScriptSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scriptPath, and content',
    ]);
  }

  const typedArgs: WriteScriptInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  // Ensure script path ends with .gd
  let scriptPath = typedArgs.scriptPath;
  if (!scriptPath.endsWith('.gd')) {
    scriptPath += '.gd';
  }

  logDebug(`Writing script: ${scriptPath}`);

  // Try bridge first, fallback to file system
  return executeWithBridge(
    'write_script',
    {
      script_path: `res://${scriptPath.replace(/\\/g, '/')}`,
      content: typedArgs.content,
      overwrite: typedArgs.overwrite !== false,
    },
    async () => {
      // Fallback: write directly to file system
      try {
        const fullPath = join(typedArgs.projectPath, scriptPath);
        const fileExists = existsSync(fullPath);

        // Check overwrite permission
        if (fileExists && typedArgs.overwrite === false) {
          return createErrorResponse(`Script already exists: ${scriptPath}`, [
            'Set overwrite: true to replace the existing file',
            'Use a different script path',
          ]);
        }

        // Create directory if needed
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        // Write the script
        writeFileSync(fullPath, typedArgs.content, 'utf-8');

        const action = fileExists ? 'updated' : 'created';
        const lines = typedArgs.content.split('\n').length;

        return createSuccessResponse(
          `Script ${action} successfully: ${scriptPath}\n` +
          `Lines: ${lines}\n` +
          `Path: ${fullPath}`
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to write script: ${errorMessage}`, [
          'Check write permissions',
          'Verify the project path is correct',
        ]);
      }
    }
  );
};
