/**
 * List Scripts Tool
 * Lists all GDScript files in a Godot project
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  ListScriptsSchema,
  ListScriptsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ScriptInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
}

export const listScriptsDefinition: ToolDefinition = {
  name: 'list_scripts',
  description: 'List all GDScript (.gd) files in a Godot project',
  inputSchema: toMcpSchema(ListScriptsSchema),
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

  // Zod validation
  const validation = safeValidateInput(ListScriptsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: ListScriptsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  logDebug(`Listing scripts in: ${typedArgs.directory || '/'}`);

  // Try bridge first, fallback to file system scan
  return executeWithBridge(
    'list_scripts',
    {
      directory: typedArgs.directory || '',
    },
    async () => {
      // Fallback: scan file system directly
      try {
        const searchPath = typedArgs.directory
          ? join(typedArgs.projectPath, typedArgs.directory)
          : typedArgs.projectPath;

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
    }
  );
};
