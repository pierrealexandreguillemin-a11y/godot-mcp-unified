/**
 * MCP Resources Types
 * Type definitions for Godot MCP Resources
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';

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
