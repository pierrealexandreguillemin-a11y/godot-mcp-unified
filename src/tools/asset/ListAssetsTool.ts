/**
 * List Assets Tool
 * Lists all assets (images, audio, 3D models, fonts) in a Godot project
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import {
  ListAssetsSchema,
  ListAssetsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export type AssetCategory = 'texture' | 'audio' | 'model' | 'font';

export interface ListAssetsArgs extends ProjectToolArgs {
  directory?: string;
  recursive?: boolean;
  category?: 'all' | AssetCategory;
}

export interface AssetInfo {
  path: string;
  name: string;
  category: AssetCategory;
  format: string;
  size: number;
  modified: string;
  hasImportFile: boolean;
}

export interface ListAssetsResult {
  projectPath: string;
  directory: string;
  recursive: boolean;
  category: string;
  count: number;
  assets: AssetInfo[];
  summary: {
    texture: number;
    audio: number;
    model: number;
    font: number;
  };
}

// Asset extensions by category
const ASSET_EXTENSIONS: Record<AssetCategory, string[]> = {
  texture: ['.png', '.jpg', '.jpeg', '.bmp', '.svg', '.webp', '.tga', '.exr', '.hdr'],
  audio: ['.wav', '.ogg', '.mp3', '.flac'],
  model: ['.glb', '.gltf', '.obj', '.fbx', '.dae'],
  font: ['.ttf', '.otf', '.woff', '.woff2'],
};

// Create reverse lookup: extension -> category
const EXTENSION_TO_CATEGORY: Map<string, AssetCategory> = new Map();
for (const [category, extensions] of Object.entries(ASSET_EXTENSIONS)) {
  for (const ext of extensions) {
    EXTENSION_TO_CATEGORY.set(ext, category as AssetCategory);
  }
}

// All supported extensions
const ALL_ASSET_EXTENSIONS = new Set(
  Object.values(ASSET_EXTENSIONS).flat()
);

export const listAssetsDefinition: ToolDefinition = {
  name: 'list_assets',
  description: 'List all assets (images, audio, 3D models, fonts) in a Godot project',
  inputSchema: toMcpSchema(ListAssetsSchema),
};

/**
 * Get asset category from file extension
 */
function getAssetCategory(ext: string): AssetCategory | undefined {
  return EXTENSION_TO_CATEGORY.get(ext.toLowerCase());
}

/**
 * Check if file has an associated .import file
 */
function hasImportFile(filePath: string): boolean {
  return existsSync(filePath + '.import');
}

/**
 * Recursively scan directory for asset files
 */
function scanForAssets(
  basePath: string,
  currentPath: string,
  recursive: boolean,
  categoryFilter: 'all' | AssetCategory
): AssetInfo[] {
  const assets: AssetInfo[] = [];

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
            assets.push(...scanForAssets(basePath, fullPath, recursive, categoryFilter));
          }
        } else {
          const ext = extname(entry).toLowerCase();

          // Check if this is a supported asset extension
          if (!ALL_ASSET_EXTENSIONS.has(ext)) {
            continue;
          }

          const category = getAssetCategory(ext);
          if (!category) {
            continue;
          }

          // Apply category filter
          if (categoryFilter !== 'all' && category !== categoryFilter) {
            continue;
          }

          const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');

          assets.push({
            path: relativePath,
            name: entry.replace(ext, ''),
            category,
            format: ext.substring(1), // Remove leading dot
            size: stat.size,
            modified: stat.mtime.toISOString(),
            hasImportFile: hasImportFile(fullPath),
          });
        }
      } catch {
        // Skip files we can't access
        logDebug(`Could not access: ${fullPath}`);
      }
    }
  } catch (error) {
    logDebug(`Could not read directory: ${currentPath}, error: ${error}`);
  }

  return assets;
}

export const handleListAssets = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation (replaces validateBasicArgs + manual category check)
  const validation = safeValidateInput(ListAssetsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
      'Valid categories: all, texture, audio, model, font',
    ]);
  }

  const typedArgs: ListAssetsInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const recursive = typedArgs.recursive !== false; // Default to true
    const directory = typedArgs.directory || '';
    const category = typedArgs.category || 'all';
    const searchPath = directory
      ? join(typedArgs.projectPath, directory)
      : typedArgs.projectPath;

    logDebug(`Listing assets in: ${searchPath} (recursive: ${recursive}, category: ${category})`);

    const assets = scanForAssets(typedArgs.projectPath, searchPath, recursive, category);

    // Sort by path for consistent ordering
    assets.sort((a, b) => a.path.localeCompare(b.path));

    // Calculate summary
    const summary = {
      texture: assets.filter((a) => a.category === 'texture').length,
      audio: assets.filter((a) => a.category === 'audio').length,
      model: assets.filter((a) => a.category === 'model').length,
      font: assets.filter((a) => a.category === 'font').length,
    };

    const result: ListAssetsResult = {
      projectPath: typedArgs.projectPath,
      directory: directory || '(root)',
      recursive,
      category,
      count: assets.length,
      assets,
      summary,
    };

    return createJsonResponse(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to list assets: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check the directory exists',
    ]);
  }
};
