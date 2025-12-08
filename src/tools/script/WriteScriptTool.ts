/**
 * Write Script Tool
 * Creates or updates a GDScript file
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, WriteScriptArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export const writeScriptDefinition: ToolDefinition = {
  name: 'write_script',
  description: 'Create or update a GDScript (.gd) file',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      scriptPath: {
        type: 'string',
        description: 'Path for the script file (relative to project)',
      },
      content: {
        type: 'string',
        description: 'GDScript content to write',
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite if file exists (default: true)',
      },
    },
    required: ['projectPath', 'scriptPath', 'content'],
  },
};

export const handleWriteScript = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'scriptPath', 'content']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, scriptPath, and content',
    ]);
  }

  // Cast to specific type after validation
  const typedArgs = preparedArgs as WriteScriptArgs;

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
