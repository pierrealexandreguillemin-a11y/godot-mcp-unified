/**
 * List Scenes Tool
 * Lists all scenes (.tscn, .scn) in a Godot project
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
import { logDebug } from '../../utils/Logger.js';
import { readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import {
  ListScenesSchema,
  ListScenesInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface SceneInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
  type: 'tscn' | 'scn';
}

export interface ListScenesResult {
  projectPath: string;
  directory: string;
  recursive: boolean;
  count: number;
  scenes: SceneInfo[];
}

export const listScenesDefinition: ToolDefinition = {
  name: 'list_scenes',
  description: 'List all scenes (.tscn, .scn) in a Godot project',
  inputSchema: toMcpSchema(ListScenesSchema),
};

/**
 * Recursively scan directory for scene files
 */
function scanForScenes(
  basePath: string,
  currentPath: string,
  recursive: boolean
): SceneInfo[] {
  const scenes: SceneInfo[] = [];

  try {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      // Skip hidden files/directories and .godot folder
      if (entry.startsWith('.') || entry === 'addons') {
        continue;
      }

      const fullPath = join(currentPath, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (recursive) {
            scenes.push(...scanForScenes(basePath, fullPath, recursive));
          }
        } else {
          const ext = extname(entry).toLowerCase();
          if (ext === '.tscn' || ext === '.scn') {
            const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
            scenes.push({
              path: relativePath,
              name: entry.replace(ext, ''),
              size: stat.size,
              modified: stat.mtime.toISOString(),
              type: ext === '.tscn' ? 'tscn' : 'scn',
            });
          }
        }
      } catch {
        // Skip files we can't access
        logDebug(`Could not access: ${fullPath}`);
      }
    }
  } catch (error) {
    logDebug(`Could not read directory: ${currentPath}, error: ${error}`);
  }

  return scenes;
}

export const handleListScenes = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ListScenesSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: ListScenesInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const recursive = typedArgs.recursive !== false; // Default to true
    const directory = typedArgs.directory || '';
    const searchPath = directory
      ? join(typedArgs.projectPath, directory)
      : typedArgs.projectPath;

    logDebug(`Listing scenes in: ${searchPath} (recursive: ${recursive})`);

    const scenes = scanForScenes(typedArgs.projectPath, searchPath, recursive);

    // Sort by path for consistent ordering
    scenes.sort((a, b) => a.path.localeCompare(b.path));

    const result: ListScenesResult = {
      projectPath: typedArgs.projectPath,
      directory: directory || '(root)',
      recursive,
      count: scenes.length,
      scenes,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to list scenes: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check the directory exists',
    ]);
  }
};
