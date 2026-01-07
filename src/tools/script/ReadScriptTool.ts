/**
 * Read Script Tool
 * Reads the content of a GDScript file
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ReadScriptSchema,
  ReadScriptInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const readScriptDefinition: ToolDefinition = {
  name: 'read_script',
  description: 'Read the content of a GDScript (.gd) file',
  inputSchema: toMcpSchema(ReadScriptSchema),
};

export const handleReadScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ReadScriptSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide both projectPath and scriptPath',
    ]);
  }

  const typedArgs: ReadScriptInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const fullPath = join(typedArgs.projectPath, typedArgs.scriptPath);

    logDebug(`Reading script: ${fullPath}`);

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

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').length;

    return {
      content: [
        {
          type: 'text',
          text: `# Script: ${typedArgs.scriptPath}\n# Lines: ${lines}\n\n${content}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to read script: ${errorMessage}`, [
      'Verify the script path is correct',
      'Check file permissions',
    ]);
  }
};
