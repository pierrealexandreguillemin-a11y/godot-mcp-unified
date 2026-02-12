/**
 * Configuration management for Godot MCP Server
 * Handles environment variables and configuration validation
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * Check if a package.json file belongs to this project.
 */
function isOwnPackageJson(filePath: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
    return pkg.name === 'godot-mcp';
  } catch {
    return false;
  }
}

/**
 * Find package.json using multiple strategies, robust against different cwd values.
 * Strategy 1: From the entry script path (works in production when cwd != project root)
 * Strategy 2: From process.cwd() (works in development and tests)
 */
function findPackageJson(): string | null {
  const entryScript = process.argv[1];
  if (entryScript) {
    // Entry script is typically build/index.js - package.json is one level up
    const fromEntry = resolve(dirname(entryScript), '..', 'package.json');
    if (existsSync(fromEntry) && isOwnPackageJson(fromEntry)) return fromEntry;
  }
  const fromCwd = resolve(process.cwd(), 'package.json');
  if (existsSync(fromCwd) && isOwnPackageJson(fromCwd)) return fromCwd;
  return null;
}

let PACKAGE_VERSION = '0.9.0';
try {
  const pkgPath = findPackageJson();
  if (pkgPath) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
    PACKAGE_VERSION = pkg.version;
  }
} catch { /* use fallback */ }

export interface GodotServerConfig {
  godotPath?: string;
  debugMode?: boolean;
  godotDebugMode?: boolean;
  strictPathValidation?: boolean;
  readOnlyMode?: boolean;
}

export interface ParameterMappings {
  [snakeCase: string]: string;
}

// Global configuration constants
export const DEBUG_MODE = process.env.DEBUG === 'true';
export const GODOT_DEBUG_MODE = true; // Always use GODOT DEBUG MODE
export const READ_ONLY_MODE = process.env.READ_ONLY_MODE === 'true';

// Parameter name mappings between snake_case and camelCase
export const PARAMETER_MAPPINGS: ParameterMappings = {
  project_path: 'projectPath',
  scene_path: 'scenePath',
  root_node_type: 'rootNodeType',
  parent_node_path: 'parentNodePath',
  node_type: 'nodeType',
  node_name: 'nodeName',
  texture_path: 'texturePath',
  node_path: 'nodePath',
  output_path: 'outputPath',
  mesh_item_names: 'meshItemNames',
  new_path: 'newPath',
  file_path: 'filePath',
  directory: 'directory',
  recursive: 'recursive',
  scene: 'scene',
};

// Reverse mapping from camelCase to snake_case
export const REVERSE_PARAMETER_MAPPINGS: ParameterMappings = (() => {
  const reverse: ParameterMappings = {};
  Object.entries(PARAMETER_MAPPINGS).forEach(([snakeCase, camelCase]) => {
    reverse[camelCase] = snakeCase;
  });
  return reverse;
})();

/**
 * Get the default configuration
 */
export const getDefaultConfig = (): GodotServerConfig => ({
  godotPath: process.env.GODOT_PATH,
  debugMode: DEBUG_MODE,
  godotDebugMode: GODOT_DEBUG_MODE,
  strictPathValidation: true,
  readOnlyMode: READ_ONLY_MODE,
});

/**
 * Merge user config with defaults
 */
export const mergeConfig = (userConfig?: Partial<GodotServerConfig>): GodotServerConfig => ({
  ...getDefaultConfig(),
  ...userConfig,
});

// Default configuration instance
export const config = {
  SERVER_NAME: 'godot-mcp-server',
  SERVER_VERSION: PACKAGE_VERSION,
  DEBUG_MODE,
  GODOT_DEBUG_MODE,
  READ_ONLY_MODE,
  ...getDefaultConfig(),
};
