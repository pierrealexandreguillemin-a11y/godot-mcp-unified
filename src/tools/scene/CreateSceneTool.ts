/**
 * Create Scene Tool
 * Creates new scenes in Godot projects
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';
import {
  CreateSceneSchema,
  CreateSceneInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

// ============================================================================
// Tool Definition (auto-generated from Zod schema)
// ============================================================================

export const createSceneDefinition: ToolDefinition = {
  name: 'create_scene',
  description: 'Create a new scene in a Godot project',
  inputSchema: toMcpSchema(CreateSceneSchema),
};

// ============================================================================
// Tool Handler
// ============================================================================

export const handleCreateScene = async (args: BaseToolArgs): Promise<ToolResponse> => {
  // Step 1: Prepare args (normalize paths, camelCase)
  const preparedArgs = prepareToolArgs(args);

  // Step 2: Validate with Zod (replaces validateBasicArgs + type assertion)
  const validation = safeValidateInput(CreateSceneSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide valid paths for both the project and the scene',
      'projectPath: Path to the Godot project directory',
      'scenePath: Path for the new scene file (relative to project)',
    ]);
  }

  // Step 3: Typed args from Zod (no manual type assertion needed!)
  const typedArgs: CreateSceneInput = validation.data;

  // Step 4: Validate project exists
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    // Step 5: Ensure Godot path is available
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Creating scene: ${typedArgs.scenePath} in project: ${typedArgs.projectPath}`);

    // Step 6: Prepare parameters for the operation
    // Note: rootNodeType has default 'Node2D' from Zod schema
    const params = {
      scenePath: typedArgs.scenePath,
      rootNodeType: typedArgs.rootNodeType, // Already defaulted by Zod
    };

    // Step 7: Execute the operation
    const { stdout, stderr } = await executeOperation(
      'create_scene',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to create scene: ${stderr}`, [
        'Check if the root node type is valid',
        'Ensure you have write permissions to the scene path',
        'Verify the scene path is valid',
      ]);
    }

    return createSuccessResponse(
      `Scene created successfully: ${typedArgs.scenePath}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to create scene: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
