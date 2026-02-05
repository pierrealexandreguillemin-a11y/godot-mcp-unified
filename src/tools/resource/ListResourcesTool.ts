/**
 * List Resources Tool
 * Lists all resources (.tres, .res) in a Godot project
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
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname, relative } from 'path';
import {
  ListResourcesSchema,
  ListResourcesInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export interface ResourceInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
  format: 'tres' | 'res';
  resourceType?: string;
}

export interface ListResourcesResult {
  projectPath: string;
  directory: string;
  recursive: boolean;
  count: number;
  resources: ResourceInfo[];
  resourceTypes: string[];
}

export const listResourcesDefinition: ToolDefinition = {
  name: 'list_resources',
  description: 'List all resources (.tres, .res) in a Godot project',
  inputSchema: toMcpSchema(ListResourcesSchema),
};

/**
 * Extract resource type from .tres file
 */
function extractResourceType(filePath: string): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Look for [gd_resource type="ResourceType" ...]
    const typeMatch = content.match(/\[gd_resource\s+type="([^"]+)"/);
    if (typeMatch) {
      return typeMatch[1];
    }
    // Alternative format: [resource]
    if (content.includes('[resource]')) {
      // Try to find class_name or type in properties
      const classMatch = content.match(/class_name\s*=\s*"([^"]+)"/);
      if (classMatch) {
        return classMatch[1];
      }
    }
  } catch {
    // Binary .res file or unreadable
  }
  return undefined;
}

/**
 * Recursively scan directory for resource files
 */
function scanForResources(
  basePath: string,
  currentPath: string,
  recursive: boolean
): ResourceInfo[] {
  const resources: ResourceInfo[] = [];

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
            resources.push(...scanForResources(basePath, fullPath, recursive));
          }
        } else {
          const ext = extname(entry).toLowerCase();
          if (ext === '.tres' || ext === '.res') {
            const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
            const resourceType = ext === '.tres' ? extractResourceType(fullPath) : undefined;

            resources.push({
              path: relativePath,
              name: entry.replace(ext, ''),
              size: stat.size,
              modified: stat.mtime.toISOString(),
              format: ext === '.tres' ? 'tres' : 'res',
              resourceType,
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

  return resources;
}

export const handleListResources = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ListResourcesSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: ListResourcesInput = validation.data;

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

    logDebug(`Listing resources in: ${searchPath} (recursive: ${recursive})`);

    let resources = scanForResources(typedArgs.projectPath, searchPath, recursive);

    // Filter by resource type if specified
    if (typedArgs.resourceType) {
      resources = resources.filter(
        (r) => r.resourceType?.toLowerCase() === typedArgs.resourceType?.toLowerCase()
      );
    }

    // Sort by path for consistent ordering
    resources.sort((a, b) => a.path.localeCompare(b.path));

    // Extract unique resource types
    const resourceTypes = [...new Set(
      resources
        .map((r) => r.resourceType)
        .filter((t): t is string => t !== undefined)
    )].sort();

    const result: ListResourcesResult = {
      projectPath: typedArgs.projectPath,
      directory: directory || '(root)',
      recursive,
      count: resources.length,
      resources,
      resourceTypes,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to list resources: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check the directory exists',
    ]);
  }
};
