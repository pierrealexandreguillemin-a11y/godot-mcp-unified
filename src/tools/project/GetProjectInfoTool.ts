/**
 * Get Project Info Tool
 * Retrieves metadata about a Godot project
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import { prepareToolArgs, validateProjectPath } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { getProjectStructure } from '../../utils/FileUtils.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { logDebug } from '../../utils/Logger.js';
import { getGodotPool } from '../../core/ProcessPool.js';
import { readFileSync } from 'fs';
import { join, basename } from 'path';
import {
  GetProjectInfoSchema,
  GetProjectInfoInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const getProjectInfoDefinition: ToolDefinition = {
  name: 'get_project_info',
  description: 'Retrieve metadata about a Godot project',
  inputSchema: toMcpSchema(GetProjectInfoSchema),
};

export const handleGetProjectInfo = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(GetProjectInfoSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: GetProjectInfoInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
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

    logDebug(`Getting project info for: ${typedArgs.projectPath}`);

    // Get Godot version via ProcessPool
    const pool = getGodotPool();
    const versionResult = await pool.execute(godotPath, ['--version'], { timeout: 10000 });
    const stdout = versionResult.stdout;

    // Get project structure using the utility
    const projectStructure = getProjectStructure(typedArgs.projectPath);

    // Extract project name from project.godot file
    let projectName = basename(typedArgs.projectPath);
    try {
      const projectFile = join(typedArgs.projectPath, 'project.godot');
      const projectFileContent = readFileSync(projectFile, 'utf8');
      const configNameMatch = projectFileContent.match(/config\/name="([^"]+)"/);
      if (configNameMatch && configNameMatch[1]) {
        projectName = configNameMatch[1];
        logDebug(`Found project name in config: ${projectName}`);
      }
    } catch (error) {
      logDebug(`Error reading project file: ${error}`);
      // Continue with default project name if extraction fails
    }

    const projectInfo = {
      name: projectName,
      path: typedArgs.projectPath,
      godotVersion: stdout.trim(),
      structure: projectStructure,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projectInfo, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to get project info: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
