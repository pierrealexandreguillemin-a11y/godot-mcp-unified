/**
 * MCP Resources Types
 * Type definitions for Godot MCP Resources
 *
 * ISO/IEC 5055 compliant - Input validation with Zod
 * ISO/IEC 25010 compliant - Security (path traversal protection)
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { resolve, normalize, relative } from 'path';

/**
 * Extended Resource with Godot-specific metadata
 */
export interface GodotResource extends Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Resource content returned by read operations
 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * Resource provider interface for implementing resource groups
 */
export interface ResourceProvider {
  /** Unique prefix for this provider (e.g., 'project', 'scene') */
  prefix: string;

  /** List all resources from this provider */
  listResources(projectPath: string): Promise<GodotResource[]>;

  /** Read a specific resource by URI */
  readResource(projectPath: string, uri: string): Promise<ResourceContent | null>;

  /** Check if this provider handles a given URI */
  handlesUri(uri: string): boolean;
}

/**
 * Resource URI patterns
 */
export const RESOURCE_URIS = {
  // Project resources
  PROJECT_INFO: 'godot://project/info',
  PROJECT_SETTINGS: 'godot://project/settings',
  PROJECT_SETTINGS_SECTION: 'godot://project/settings/', // + section
  EXPORT_PRESETS: 'godot://export/presets',
  SYSTEM_VERSION: 'godot://system/version',

  // Scene & Script resources
  SCENES: 'godot://scenes',
  SCENE: 'godot://scene/', // + path
  SCENE_TREE: 'godot://scene/', // + path + /tree
  SCRIPTS: 'godot://scripts',
  SCRIPT: 'godot://script/', // + path
  SCRIPT_ERRORS: 'godot://script/errors',

  // Assets resources
  ASSETS: 'godot://assets',
  ASSETS_CATEGORY: 'godot://assets/', // + category
  RESOURCES: 'godot://resources',
  UID: 'godot://uid/', // + path

  // Debug resources
  DEBUG_OUTPUT: 'godot://debug/output',
  DEBUG_STREAM: 'godot://debug/stream',
  DEBUG_BREAKPOINTS: 'godot://debug/breakpoints',
  DEBUG_STACK: 'godot://debug/stack',
  DEBUG_VARIABLES: 'godot://debug/variables',
} as const;

/**
 * MIME types for Godot files
 */
export const GODOT_MIME_TYPES: Record<string, string> = {
  '.gd': 'text/x-gdscript',
  '.tscn': 'text/x-godot-scene',
  '.tres': 'text/x-godot-resource',
  '.res': 'application/x-godot-resource',
  '.godot': 'text/x-godot-project',
  '.cfg': 'text/plain',
  '.json': 'application/json',
  '.gdshader': 'text/x-godot-shader',
  '.shader': 'text/x-godot-shader',
  '.import': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

/**
 * Get MIME type for a file extension
 */
export const getMimeType = (filePath: string): string => {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return GODOT_MIME_TYPES[ext] || 'application/octet-stream';
};

// ============================================================================
// SECURITY: Path Traversal Protection (OWASP A01:2021)
// ============================================================================

/**
 * Validates that a path stays within the project directory
 * Prevents path traversal attacks (../, symbolic links, etc.)
 */
export const validatePathWithinProject = (
  projectPath: string,
  relativePath: string
): string | null => {
  if (relativePath.includes('\0')) return null;

  const normalizedProject = resolve(normalize(projectPath));
  const fullPath = resolve(normalizedProject, normalize(relativePath));

  if (!fullPath.startsWith(normalizedProject)) return null;

  const relPath = relative(normalizedProject, fullPath);
  if (relPath.startsWith('..') || relPath.includes('..')) return null;

  return fullPath;
};

/**
 * Sanitize a path extracted from URI
 */
export const sanitizeUriPath = (uriPath: string): string => {
  return uriPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
};

// ============================================================================
// ZOD SCHEMAS: Input Validation (ISO/IEC 5055)
// ============================================================================

export const SectionNameSchema = z
  .string()
  .min(1, 'Section name cannot be empty')
  .max(100, 'Section name too long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Section must be alphanumeric');

export const FilePathSchema = z
  .string()
  .min(1, 'Path cannot be empty')
  .max(500, 'Path too long')
  .refine((p) => !p.includes('\0'), 'Null bytes forbidden')
  .refine((p) => !p.includes('..'), 'Parent reference forbidden');

export const AssetCategorySchema = z.enum([
  'images', 'audio', 'models', 'fonts', 'shaders',
  'resources', 'scenes', 'scripts', 'data',
]);

export type AssetCategory = z.infer<typeof AssetCategorySchema>;

/**
 * Validate scene URI and extract path
 */
export const validateSceneUri = (uri: string):
  { valid: true; path: string; isTree: boolean } | { valid: false; error: string } => {
  if (!uri.startsWith(RESOURCE_URIS.SCENE)) {
    return { valid: false, error: 'Invalid scene URI prefix' };
  }
  const isTree = uri.endsWith('/tree');
  let path = uri.replace(RESOURCE_URIS.SCENE, '');
  if (isTree) path = path.replace(/\/tree$/, '');
  const sanitized = sanitizeUriPath(path);
  const result = FilePathSchema.safeParse(sanitized);
  if (!result.success) return { valid: false, error: result.error.issues[0]?.message || 'Invalid' };
  return { valid: true, path: sanitized, isTree };
};

/**
 * Validate script URI and extract path
 */
export const validateScriptUri = (uri: string):
  { valid: true; path: string } | { valid: false; error: string } => {
  if (!uri.startsWith(RESOURCE_URIS.SCRIPT)) {
    return { valid: false, error: 'Invalid script URI prefix' };
  }
  const path = uri.replace(RESOURCE_URIS.SCRIPT, '');
  const sanitized = sanitizeUriPath(path);
  const result = FilePathSchema.safeParse(sanitized);
  if (!result.success) return { valid: false, error: result.error.issues[0]?.message || 'Invalid' };
  return { valid: true, path: sanitized };
};

/**
 * Validate asset category
 */
export const validateAssetCategory = (category: string):
  { valid: true; category: AssetCategory } | { valid: false; error: string } => {
  const result = AssetCategorySchema.safeParse(category);
  if (!result.success) {
    return { valid: false, error: `Invalid category. Valid: ${AssetCategorySchema.options.join(', ')}` };
  }
  return { valid: true, category: result.data };
};

/**
 * Validate section name for settings
 */
export const validateSectionName = (section: string):
  { valid: true; section: string } | { valid: false; error: string } => {
  const result = SectionNameSchema.safeParse(section);
  if (!result.success) return { valid: false, error: result.error.issues[0]?.message || 'Invalid' };
  return { valid: true, section: result.data };
};

/**
 * Validate UID path
 */
export const validateUidPath = (uri: string):
  { valid: true; path: string } | { valid: false; error: string } => {
  if (!uri.startsWith(RESOURCE_URIS.UID)) {
    return { valid: false, error: 'Invalid UID URI prefix' };
  }
  const path = uri.replace(RESOURCE_URIS.UID, '');
  const sanitized = sanitizeUriPath(path);
  const result = FilePathSchema.safeParse(sanitized);
  if (!result.success) return { valid: false, error: result.error.issues[0]?.message || 'Invalid' };
  return { valid: true, path: sanitized };
};
