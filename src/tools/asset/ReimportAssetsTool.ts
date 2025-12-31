/**
 * Reimport Assets Tool
 * Forces Godot to reimport specified assets
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { existsSync, unlinkSync, utimesSync, statSync } from 'fs';
import { join } from 'path';

export type ReimportMethod = 'touch' | 'delete_import';

export interface ReimportAssetsArgs extends ProjectToolArgs {
  assetPaths: string[];
  method?: ReimportMethod;
}

export interface ReimportResult {
  path: string;
  success: boolean;
  action: string;
  error?: string;
}

export interface ReimportAssetsResult {
  method: ReimportMethod;
  total: number;
  succeeded: number;
  failed: number;
  results: ReimportResult[];
  message: string;
}

export const reimportAssetsDefinition: ToolDefinition = {
  name: 'reimport_assets',
  description: 'Force Godot to reimport specified assets by touching files or deleting .import metadata',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      assetPaths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of asset paths relative to project (e.g., ["assets/player.png", "audio/music.ogg"])',
      },
      method: {
        type: 'string',
        enum: ['touch', 'delete_import'],
        description: 'Reimport method: "touch" updates file timestamp, "delete_import" removes .import file (default: touch)',
      },
    },
    required: ['projectPath', 'assetPaths'],
  },
};

/**
 * Touch a file (update its modification time)
 */
function touchFile(filePath: string): void {
  const now = new Date();
  utimesSync(filePath, now, now);
}

/**
 * Delete the .import file for an asset
 */
function deleteImportFile(assetPath: string): boolean {
  const importPath = assetPath + '.import';
  if (existsSync(importPath)) {
    unlinkSync(importPath);
    return true;
  }
  return false;
}

export const handleReimportAssets = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Validate required arguments
  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'assetPaths']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath and assetPaths',
      'assetPaths should be an array of relative paths',
    ]);
  }

  const typedArgs = preparedArgs as ReimportAssetsArgs;

  // Validate assetPaths is an array
  if (!Array.isArray(typedArgs.assetPaths)) {
    return createErrorResponse('assetPaths must be an array', [
      'Provide an array of asset paths',
      'Example: ["assets/player.png", "audio/music.ogg"]',
    ]);
  }

  // Validate assetPaths is not empty
  if (typedArgs.assetPaths.length === 0) {
    return createErrorResponse('assetPaths cannot be empty', [
      'Provide at least one asset path to reimport',
    ]);
  }

  // Validate method if provided
  const method: ReimportMethod = typedArgs.method || 'touch';
  if (method !== 'touch' && method !== 'delete_import') {
    return createErrorResponse(`Invalid method: ${method}`, [
      'Use "touch" to update file timestamp',
      'Use "delete_import" to delete .import file',
    ]);
  }

  // Validate project path
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const results: ReimportResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const assetPath of typedArgs.assetPaths) {
    // Normalize path (remove res:// prefix if present)
    let normalizedPath = assetPath;
    if (normalizedPath.startsWith('res://')) {
      normalizedPath = normalizedPath.substring(6);
    }

    // Validate path doesn't escape project
    if (normalizedPath.includes('..')) {
      results.push({
        path: assetPath,
        success: false,
        action: 'skipped',
        error: 'Path contains ".." which is not allowed',
      });
      failed++;
      continue;
    }

    const fullPath = join(typedArgs.projectPath, normalizedPath);

    // Check if asset exists
    if (!existsSync(fullPath)) {
      results.push({
        path: assetPath,
        success: false,
        action: 'skipped',
        error: 'Asset file not found',
      });
      failed++;
      continue;
    }

    // Check if it's a file
    try {
      const stat = statSync(fullPath);
      if (!stat.isFile()) {
        results.push({
          path: assetPath,
          success: false,
          action: 'skipped',
          error: 'Path is a directory, not a file',
        });
        failed++;
        continue;
      }
    } catch {
      results.push({
        path: assetPath,
        success: false,
        action: 'skipped',
        error: 'Cannot access file',
      });
      failed++;
      continue;
    }

    // Apply reimport method
    try {
      if (method === 'touch') {
        touchFile(fullPath);
        logDebug(`Touched file: ${fullPath}`);
        results.push({
          path: assetPath,
          success: true,
          action: 'touched',
        });
      } else {
        const hadImportFile = deleteImportFile(fullPath);
        logDebug(`Deleted .import for: ${fullPath} (existed: ${hadImportFile})`);
        results.push({
          path: assetPath,
          success: true,
          action: hadImportFile ? 'import_deleted' : 'no_import_file',
        });
      }
      succeeded++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        path: assetPath,
        success: false,
        action: 'failed',
        error: errorMessage,
      });
      failed++;
    }
  }

  const result: ReimportAssetsResult = {
    method,
    total: typedArgs.assetPaths.length,
    succeeded,
    failed,
    results,
    message: `Processed ${typedArgs.assetPaths.length} assets: ${succeeded} succeeded, ${failed} failed. Godot will reimport on next project scan.`,
  };

  return createJsonResponse(result);
};
