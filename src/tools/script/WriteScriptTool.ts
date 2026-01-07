/**
 * Write Script Tool
 * Creates or updates a GDScript file
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
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  WriteScriptSchema,
  WriteScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

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

  try {
    // Ensure script path ends with .gd
    let scriptPath = typedArgs.scriptPath;
    if (!scriptPath.endsWith('.gd')) {
      scriptPath += '.gd';
    }

    const fullPath = join(typedArgs.projectPath, scriptPath);
    const fileExists = existsSync(fullPath);

    // Check overwrite permission
    if (fileExists && typedArgs.overwrite === false) {
      return createErrorResponse(`Script already exists: ${scriptPath}`, [
        'Set overwrite: true to replace the existing file',
        'Use a different script path',
      ]);
    }

    logDebug(`Writing script: ${fullPath}`);

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
};
