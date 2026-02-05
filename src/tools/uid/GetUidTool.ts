/**
 * Get UID Tool
 * Gets UIDs for files in Godot projects (for Godot 4.4+)
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  validateFilePath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import {
  GetUidSchema,
  GetUidInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

/**
 * Check if Godot version is 4.4 or later
 */
const isGodot44OrLater = (version: string): boolean => {
  const versionMatch = version.match(/(\d+)\.(\d+)/);
  if (!versionMatch) return false;

  const major = parseInt(versionMatch[1]);
  const minor = parseInt(versionMatch[2]);

  return major > 4 || (major === 4 && minor >= 4);
};

export const getUidDefinition: ToolDefinition = {
  name: 'get_uid',
  description: 'Get the UID for a specific file in a Godot project (for Godot 4.4+)',
  inputSchema: toMcpSchema(GetUidSchema),
};

export const handleGetUid = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(GetUidSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and filePath',
    ]);
  }

  const typedArgs: GetUidInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const fileValidationError = validateFilePath(typedArgs.projectPath, typedArgs.filePath);
  if (fileValidationError) {
    return fileValidationError;
  }

  try {
    // Ensure Godot path is available
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    // Get Godot version to check if UIDs are supported
    const pool = getGodotPool();
    const versionResult = await pool.execute(godotPath, ['--version'], { timeout: 10000 });
    const version = versionResult.stdout.trim();

    if (!isGodot44OrLater(version)) {
      return createErrorResponse(
        `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
        [
          'Upgrade to Godot 4.4 or later to use UIDs',
          'Use resource paths instead of UIDs for this version of Godot',
        ],
      );
    }

    logDebug(`Getting UID for file: ${typedArgs.filePath} in project: ${typedArgs.projectPath}`);

    // Prepare parameters for the operation
    const params = {
      filePath: typedArgs.filePath,
    };

    // Execute the operation
    const { stdout, stderr } = await executeOperation(
      'get_uid',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to get UID: ${stderr}`, [
        'Check if the file exists and is a valid resource',
        'Ensure the file is imported in Godot',
      ]);
    }

    return createSuccessResponse(`UID for ${typedArgs.filePath}: ${stdout.trim()}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to get UID: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
