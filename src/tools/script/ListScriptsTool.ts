/**
 * List Scripts Tool
 * Lists all GDScript files in a Godot project
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ListScriptsArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { logDebug } from '../../utils/Logger';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export interface ScriptInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
}

export const listScriptsDefinition: ToolDefinition = {
  name: 'list_scripts',
  description: 'List all GDScript (.gd) files in a Godot project',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      directory: {
        type: 'string',
        description: 'Subdirectory to search (optional, defaults to entire project)',
      },
    },
    required: ['projectPath'],
  },
};

const findScripts = (basePath: string, currentPath: string, scripts: ScriptInfo[]): void => {
  try {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden directories and .godot folder
      if (entry.name.startsWith('.') || entry.name === '.godot') {
        continue;
      }

      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        findScripts(basePath, fullPath, scripts);
      } else if (entry.isFile() && entry.name.endsWith('.gd')) {
        const stats = statSync(fullPath);
        scripts.push({
          path: relative(basePath, fullPath).replace(/\\/g, '/'),
          name: entry.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      }
    }
  } catch {
    // Skip directories we can't read
  }
};

export const handleListScripts = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs = preparedArgs as ListScriptsArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const searchPath = typedArgs.directory
      ? join(typedArgs.projectPath, typedArgs.directory)
      : typedArgs.projectPath;

    logDebug(`Listing scripts in: ${searchPath}`);

    const scripts: ScriptInfo[] = [];
    findScripts(typedArgs.projectPath, searchPath, scripts);

    // Sort by path
    scripts.sort((a, b) => a.path.localeCompare(b.path));

    return createJsonResponse({
      projectPath: typedArgs.projectPath,
      directory: typedArgs.directory || '/',
      count: scripts.length,
      scripts: scripts,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to list scripts: ${errorMessage}`, [
      'Verify the project path is accessible',
      'Check if the directory exists',
    ]);
  }
};
