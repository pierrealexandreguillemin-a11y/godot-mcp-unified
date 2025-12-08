/**
 * Godot executor utilities
 * Handles execution of Godot operations and commands
 * Uses ProcessPool for concurrent execution management
 *
 * ISO/IEC 25010 compliant - efficient, reliable, maintainable
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { convertCamelToSnakeCase } from './ParameterNormalizer.js';
import { BaseToolArgs } from '../server/types.js';
import { normalizePath } from './PathManager.js';
import { logDebug } from '../utils/Logger.js';
import { GODOT_DEBUG_MODE } from '../config/config.js';
import { getGodotPool, ProcessResult } from './ProcessPool.js';

const getOperationsScriptPath = (): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..', 'scripts', 'godot_operations.gd');
};

/**
 * Check if the Godot version is 4.4 or later
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
 * Get Godot version using ProcessPool
 */
export const getGodotVersion = async (godotPath: string): Promise<string> => {
  const pool = getGodotPool();
  const result = await pool.execute(godotPath, ['--version'], { timeout: 10000 });
  return result.stdout.trim();
};

/**
 * Execute a Godot operation using the operations script via ProcessPool
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
