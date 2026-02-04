/**
 * Assets Resource Provider
 * Provides MCP Resources for Godot assets and resources
 *
 * Resources:
 * - godot://assets - List all assets
 * - godot://assets/{category} - Assets by category (images, audio, models, etc.)
 * - godot://resources - List all .tres/.res resource files
 * - godot://uid/{path} - UID for a specific file
 */

import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';
import {
  ResourceProvider,
  GodotResource,
  ResourceContent,
  RESOURCE_URIS,
  validateAssetCategory,
  validateUidPath,
  validatePathWithinProject,
} from '../types.js';
import { isGodotProject } from '../../utils/FileUtils.js';
import { findFiles } from '../utils/fileScanner.js';
import {
  ASSET_CATEGORIES,
  getAllAssetExtensions,
  getCategoryForExtension,
} from '../utils/assetCategories.js';

export class AssetsResourceProvider implements ResourceProvider {
  prefix = 'assets';

  handlesUri(uri: string): boolean {
    return (
      uri === RESOURCE_URIS.ASSETS ||
      uri.startsWith(RESOURCE_URIS.ASSETS_CATEGORY) ||
      uri === RESOURCE_URIS.RESOURCES ||
      uri.startsWith(RESOURCE_URIS.UID)
    );
  }

  async listResources(_projectPath: string): Promise<GodotResource[]> {
    // Note: projectPath not used here as we return static resource definitions
    // Actual project content is read in readResource()
    const resources: GodotResource[] = [
      {
        uri: RESOURCE_URIS.ASSETS,
        name: 'All Assets',
        description: 'Complete list of all asset files in the project',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.RESOURCES,
        name: 'Resource Files',
        description: 'List of all .tres and .res resource files',
        mimeType: 'application/json',
      },
    ];

    // Add category-specific resources
    for (const category of Object.keys(ASSET_CATEGORIES)) {
      resources.push({
        uri: `${RESOURCE_URIS.ASSETS_CATEGORY}${category}`,
        name: `Assets: ${category}`,
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} files (${ASSET_CATEGORIES[category].join(', ')})`,
        mimeType: 'application/json',
      });
    }

    return resources;
  }

  async readResource(projectPath: string, uri: string): Promise<ResourceContent | null> {
    if (uri === RESOURCE_URIS.ASSETS) {
      return this.listAllAssets(projectPath);
    }

    if (uri === RESOURCE_URIS.RESOURCES) {
      return this.listResourceFiles(projectPath);
    }

    // Category: validate with Zod schema
    if (uri.startsWith(RESOURCE_URIS.ASSETS_CATEGORY) && uri !== RESOURCE_URIS.ASSETS) {
      const rawCategory = uri.replace(RESOURCE_URIS.ASSETS_CATEGORY, '');
      const validation = validateAssetCategory(rawCategory);
      if (!validation.valid) {
        return this.createErrorContent(uri, validation.error);
      }
      return this.listAssetsByCategory(projectPath, validation.category);
    }

    // UID: validate path with security check
    if (uri.startsWith(RESOURCE_URIS.UID)) {
      const validation = validateUidPath(uri);
      if (!validation.valid) {
        return this.createErrorContent(uri, validation.error);
      }
      return this.getFileUid(projectPath, validation.path);
    }

    return null;
  }

  private createErrorContent(uri: string, error: string): ResourceContent {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ error, uri }, null, 2),
    };
  }

  private async listAllAssets(projectPath: string): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return {
        uri: RESOURCE_URIS.ASSETS,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'No project loaded', assets: [] }, null, 2),
      };
    }

    const files = findFiles(projectPath, getAllAssetExtensions());

    // Group by category
    const byCategory: Record<string, typeof files> = {};
    for (const file of files) {
      const category = getCategoryForExtension(file.ext);
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(file);
    }

    // Build summary
    const summary: Record<string, number> = {};
    for (const [category, categoryFiles] of Object.entries(byCategory)) {
      summary[category] = categoryFiles.length;
    }

    return {
      uri: RESOURCE_URIS.ASSETS,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          totalCount: files.length,
          summary,
          assets: files.map((f) => ({
            path: `res://${f.relativePath}`,
            category: getCategoryForExtension(f.ext),
            extension: f.ext,
            size: f.size,
            modified: f.modified.toISOString(),
          })),
        },
        null,
        2
      ),
    };
  }

  private async listAssetsByCategory(
    projectPath: string,
    category: string
  ): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return {
        uri: `${RESOURCE_URIS.ASSETS_CATEGORY}${category}`,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'No project loaded', assets: [] }, null, 2),
      };
    }

    const extensions = ASSET_CATEGORIES[category];
    if (!extensions) {
      return {
        uri: `${RESOURCE_URIS.ASSETS_CATEGORY}${category}`,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            error: `Unknown category: ${category}`,
            availableCategories: Object.keys(ASSET_CATEGORIES),
          },
          null,
          2
        ),
      };
    }

    const files = findFiles(projectPath, extensions);

    return {
      uri: `${RESOURCE_URIS.ASSETS_CATEGORY}${category}`,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          category,
          extensions,
          count: files.length,
          assets: files.map((f) => ({
            path: `res://${f.relativePath}`,
            name: basename(f.path),
            extension: f.ext,
            size: f.size,
            modified: f.modified.toISOString(),
          })),
        },
        null,
        2
      ),
    };
  }

  private async listResourceFiles(projectPath: string): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return {
        uri: RESOURCE_URIS.RESOURCES,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'No project loaded', resources: [] }, null, 2),
      };
    }

    const files = findFiles(projectPath, ['.tres', '.res']);

    // Try to extract resource type from .tres files
    const resources = files.map((f) => {
      let resourceType: string | null = null;

      if (f.ext === '.tres') {
        try {
          const content = readFileSync(f.path, 'utf-8');
          const typeMatch = content.match(/\[gd_resource type="([^"]+)"/);
          if (typeMatch) resourceType = typeMatch[1];
        } catch {
          // Ignore read errors
        }
      }

      return {
        path: `res://${f.relativePath}`,
        name: basename(f.path),
        extension: f.ext,
        resourceType,
        size: f.size,
        modified: f.modified.toISOString(),
      };
    });

    // Group by resource type
    const byType: Record<string, number> = {};
    for (const res of resources) {
      const type = res.resourceType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      uri: RESOURCE_URIS.RESOURCES,
      mimeType: 'application/json',
      text: JSON.stringify({ count: resources.length, byType, resources }, null, 2),
    };
  }

  private async getFileUid(projectPath: string, filePath: string): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return null;
    }

    // Security: validate path is within project
    const fullFilePath = validatePathWithinProject(projectPath, filePath);
    if (!fullFilePath) {
      return this.createErrorContent(`${RESOURCE_URIS.UID}${filePath}`, 'Path traversal detected');
    }

    const importFilePath = `${fullFilePath}.import`;

    if (!existsSync(fullFilePath)) {
      return {
        uri: `${RESOURCE_URIS.UID}${filePath}`,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'File not found', path: filePath }, null, 2),
      };
    }

    let uid: string | null = null;

    // Try to read UID from .import file
    if (existsSync(importFilePath)) {
      try {
        const importContent = readFileSync(importFilePath, 'utf-8');
        const uidMatch = importContent.match(/uid="([^"]+)"/);
        if (uidMatch) uid = uidMatch[1];
      } catch {
        // Ignore read errors
      }
    }

    // For .tscn files, check the uid in the file header
    if (!uid && filePath.endsWith('.tscn')) {
      try {
        const content = readFileSync(fullFilePath, 'utf-8');
        const uidMatch = content.match(/uid="([^"]+)"/);
        if (uidMatch) uid = uidMatch[1];
      } catch {
        // Ignore
      }
    }

    return {
      uri: `${RESOURCE_URIS.UID}${filePath}`,
      mimeType: 'application/json',
      text: JSON.stringify({ path: filePath, uid, hasImportFile: existsSync(importFilePath) }, null, 2),
    };
  }
}
