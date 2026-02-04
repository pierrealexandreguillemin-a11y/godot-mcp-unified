/**
 * Godot executor utilities for running Godot operations via GDScript.
 *
 * This module provides the execution layer for Godot operations, handling the
 * communication between the MCP server and the Godot engine. It uses a ProcessPool
 * for efficient concurrent execution management and proper resource handling.
 *
 * @module GodotExecutor
 * @author Godot MCP Unified Team
 * @version 1.0.0
 *
 * @description
 * Implements ISO/IEC 25010 quality characteristics:
 * - **Performance Efficiency**: Uses ProcessPool for concurrent execution management
 * - **Reliability**: Robust error handling with timeout protection
 * - **Maintainability**: Clean separation between parameter conversion and execution
 * - **Portability**: Cross-platform path normalization for Windows/Unix compatibility
 * - **Security**: Isolated headless execution with controlled script injection
 *
 * @example
 * ```typescript
 * import { executeOperation, getGodotVersion, isGodot44OrLater } from './GodotExecutor';
 *
 * // Check Godot version
 * const version = await getGodotVersion('/path/to/godot');
 * console.log('Godot version:', version);
 *
 * // Check if version supports new features
 * if (isGodot44OrLater(version)) {
 *   console.log('Using Godot 4.4+ features');
 * }
 *
 * // Execute an operation
 * const result = await executeOperation(
 *   'create_node',
 *   { nodeName: 'Player', nodeType: 'CharacterBody3D' },
 *   '/path/to/project',
 *   '/path/to/godot'
 * );
 * ```
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { convertCamelToSnakeCase } from './ParameterNormalizer.js';
import { BaseToolArgs } from '../server/types.js';
import { normalizePath } from './PathManager.js';
import { logDebug } from '../utils/Logger.js';
import { GODOT_DEBUG_MODE } from '../config/config.js';
import { getGodotPool, ProcessResult } from './ProcessPool.js';

/**
 * Resolves the absolute path to the Godot operations GDScript file.
 *
 * This internal function calculates the path to the operations script relative
 * to the current module location, ensuring consistent resolution across different
 * execution contexts and bundling scenarios.
 *
 * @function getOperationsScriptPath
 * @returns {string} Absolute path to the godot_operations.gd script
 * @internal
 *
 * @example
 * ```typescript
 * const scriptPath = getOperationsScriptPath();
 * // Returns: '/app/dist/scripts/godot_operations.gd'
 * ```
 */
const getOperationsScriptPath = (): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..', 'scripts', 'godot_operations.gd');
};

/**
 * Checks if the provided Godot version string represents version 4.4 or later.
 *
 * This function parses a Godot version string and determines if it meets the
 * minimum version requirement for features introduced in Godot 4.4. Useful for
 * conditional feature enabling based on the installed Godot version.
 *
 * @function isGodot44OrLater
 * @param {string} version - The Godot version string (e.g., "4.4.stable", "4.2.1.stable")
 * @returns {boolean} True if the version is 4.4 or later, false otherwise
 *
 * @example
 * ```typescript
 * // Check various version strings
 * isGodot44OrLater('4.4.stable');     // true
 * isGodot44OrLater('4.5.0.beta');     // true
 * isGodot44OrLater('5.0.stable');     // true
 * isGodot44OrLater('4.3.stable');     // false
 * isGodot44OrLater('4.2.1.stable');   // false
 * isGodot44OrLater('3.5.stable');     // false
 * ```
 *
 * @example
 * ```typescript
 * // Conditional feature usage
 * const version = await getGodotVersion(godotPath);
 * if (isGodot44OrLater(version)) {
 *   // Use Godot 4.4+ specific APIs
 *   await executeOperation('new_feature', params, projectPath, godotPath);
 * }
 * ```
 *
 * @remarks
 * - Parses only major and minor version numbers
 * - Returns false for malformed version strings that don't match the expected pattern
 * - Compatible with various Godot version string formats (stable, beta, alpha, rc)
 *
 * @see {@link getGodotVersion} for retrieving the version string
 */
export const isGodot44OrLater = (version: string): boolean => {
  const match = version.match(/^(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return major > 4 || (major === 4 && minor >= 4);
  }
  return false;
};

/**
 * Retrieves the Godot engine version by executing the Godot binary.
 *
 * This function spawns a Godot process with the `--version` flag to query
 * the installed Godot version. It uses the ProcessPool for efficient execution
 * and includes a timeout to prevent hanging on unresponsive binaries.
 *
 * @function getGodotVersion
 * @async
 * @param {string} godotPath - Absolute path to the Godot executable
 * @returns {Promise<string>} The Godot version string (e.g., "4.2.stable.official")
 * @throws {Error} If the Godot binary cannot be executed or times out
 *
 * @example
 * ```typescript
 * // Get the Godot version
 * try {
 *   const version = await getGodotVersion('/usr/bin/godot');
 *   console.log('Installed Godot version:', version);
 *   // Output: "4.2.stable.official.abc123"
 * } catch (error) {
 *   console.error('Failed to get Godot version:', error.message);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use with version checking
 * const version = await getGodotVersion(config.godotPath);
 * if (isGodot44OrLater(version)) {
 *   console.log('Running on Godot 4.4+');
 * }
 * ```
 *
 * @remarks
 * - Uses a 10-second timeout to prevent indefinite waiting
 * - Output is trimmed to remove trailing whitespace/newlines
 * - Utilizes ProcessPool for resource-efficient execution
 *
 * @see {@link isGodot44OrLater} for version comparison
 * @see {@link getGodotPool} for the underlying process pool
 */
export const getGodotVersion = async (godotPath: string): Promise<string> => {
  const pool = getGodotPool();
  const result = await pool.execute(godotPath, ['--version'], { timeout: 10000 });
  return result.stdout.trim();
};

/**
 * Executes a Godot operation using the operations GDScript via ProcessPool.
 *
 * This is the primary function for executing Godot operations from the MCP server.
 * It handles the complete execution pipeline including path normalization, parameter
 * conversion to snake_case, JSON serialization, and process execution with timeout.
 *
 * @function executeOperation
 * @async
 * @param {string} operation - The operation name to execute (e.g., "create_node", "read_scene")
 * @param {BaseToolArgs} params - Parameters for the operation in camelCase format
 * @param {string} projectPath - Absolute path to the Godot project directory
 * @param {string} godotPath - Absolute path to the Godot executable
 * @returns {Promise<{ stdout: string; stderr: string }>} Object containing stdout and stderr from the operation
 *
 * @example
 * ```typescript
 * // Create a new node in a scene
 * const result = await executeOperation(
 *   'create_node',
 *   {
 *     scenePath: 'res://scenes/main.tscn',
 *     nodeName: 'Player',
 *     nodeType: 'CharacterBody3D',
 *     parentPath: '.'
 *   },
 *   '/home/user/my-game',
 *   '/usr/bin/godot'
 * );
 *
 * if (result.stderr) {
 *   console.error('Operation failed:', result.stderr);
 * } else {
 *   console.log('Operation result:', result.stdout);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Read a scene file
 * const result = await executeOperation(
 *   'read_scene',
 *   { scenePath: 'res://scenes/level1.tscn' },
 *   'C:/Projects/MyGame',
 *   'C:/Godot/godot.exe'
 * );
 * const sceneData = JSON.parse(result.stdout);
 * ```
 *
 * @example
 * ```typescript
 * // Handle errors gracefully
 * const result = await executeOperation('invalid_op', {}, projectPath, godotPath);
 * if (result.stderr) {
 *   // Error is captured in stderr, not thrown
 *   console.error('Error:', result.stderr);
 * }
 * ```
 *
 * @remarks
 * - Parameters are automatically converted from camelCase to snake_case
 * - Project paths are normalized for cross-platform compatibility
 * - Uses headless mode (`--headless`) for non-interactive execution
 * - Default timeout is 60 seconds (1 minute)
 * - Debug mode can be enabled via GODOT_DEBUG_MODE configuration
 * - Errors are caught and returned in stderr rather than thrown
 *
 * @see {@link convertCamelToSnakeCase} for parameter conversion
 * @see {@link normalizePath} for path normalization
 * @see {@link getGodotPool} for the process pool implementation
 * @see {@link ProcessResult} for the result type from ProcessPool
 */
export const executeOperation = async (
  operation: string,
  params: BaseToolArgs,
  projectPath: string,
  godotPath: string,
): Promise<{ stdout: string; stderr: string }> => {
  logDebug(`Executing operation: ${operation} in project: ${projectPath}`);
  logDebug(`Original operation params: ${JSON.stringify(params)}`);

  // Normalize the project path to handle Windows path issues
  const normalizedProjectPath = normalizePath(projectPath);

  // Convert camelCase parameters to snake_case for Godot script
  const snakeCaseParams = convertCamelToSnakeCase(params);
  logDebug(`Converted snake_case params: ${JSON.stringify(snakeCaseParams)}`);

  // Serialize the snake_case parameters to a valid JSON string
  const paramsJson = JSON.stringify(snakeCaseParams);

  // Get the operations script path
  const operationsScriptPath = getOperationsScriptPath();

  // Build command arguments for ProcessPool
  const args: string[] = [
    '--headless',
    '--path',
    normalizedProjectPath,
    '--script',
    operationsScriptPath,
    operation,
    paramsJson,
  ];

  // Add debug arguments if debug mode is enabled
  if (GODOT_DEBUG_MODE) {
    args.push('--debug-godot');
  }

  logDebug(`Executing via ProcessPool: ${godotPath} ${args.join(' ')}`);

  try {
    const pool = getGodotPool();
    const result: ProcessResult = await pool.execute(godotPath, args, {
      cwd: normalizedProjectPath,
      timeout: 60000, // 1 minute timeout
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error: unknown) {
    // Return error as stderr
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      stdout: '',
      stderr: errorMessage,
    };
  }
};
