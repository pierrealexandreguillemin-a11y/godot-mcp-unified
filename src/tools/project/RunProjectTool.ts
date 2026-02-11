/**
 * Run Project Tool
 * Handles running Godot projects in debug mode
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity, bridge fallback
 */

import { prepareToolArgs } from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { isGodotProject } from '../../utils/FileUtils.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { runGodotProject } from '../../core/ProcessManager.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import { ToolResponse, ToolDefinition, BaseToolArgs } from '../../server/types.js';
import {
  RunProjectSchema,
  RunProjectInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const runProjectDefinition: ToolDefinition = {
  name: 'run_project',
  description: 'Run the Godot project and capture output',
  inputSchema: toMcpSchema(RunProjectSchema),
};

/**
 * Handle the run_project tool
 */
export const handleRunProject = async (args: BaseToolArgs): Promise<ToolResponse> => {
  // Validate and normalize arguments
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(RunProjectSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid path to a Godot project directory',
    ]);
  }

  const typedArgs: RunProjectInput = validation.data;

  // Validate project
  if (!isGodotProject(typedArgs.projectPath)) {
    return createErrorResponse(`Not a valid Godot project: ${typedArgs.projectPath}`, [
      'Ensure the path points to a directory containing a project.godot file',
      'Use list_projects to find valid Godot projects',
    ]);
  }

  logDebug(`Running Godot project: ${typedArgs.projectPath}`);

  // Try bridge first, fallback to spawning process
  return executeWithBridge(
    'run_project',
    {
      scene: typedArgs.scene || '',
      debug: true,
    },
    async () => {
      // Fallback: spawn Godot process via ProcessManager
      try {
        const godotPath = await detectGodotPath();
        if (!godotPath) {
          return createErrorResponse('Could not find a valid Godot executable path', [
            'Ensure Godot is installed correctly',
            'Set GODOT_PATH environment variable to specify the correct path',
          ]);
        }

        runGodotProject(godotPath, typedArgs.projectPath, typedArgs.scene);

        return {
          content: [
            {
              type: 'text',
              text: `Godot project started in debug mode. Use get_debug_output to see output.`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(`Failed to run Godot project: ${errorMessage}`, [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]);
      }
    }
  );
};
