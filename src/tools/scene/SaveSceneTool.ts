/**
 * Save Scene Tool
 * Saves scenes with options for creating variants
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';
import {
  SaveSceneSchema,
  SaveSceneInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const saveSceneDefinition: ToolDefinition = {
  name: 'save_scene',
  description: 'Save a scene, optionally as a new variant',
  inputSchema: toMcpSchema(SaveSceneSchema),
};

export const handleSaveScene = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(SaveSceneSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath and scenePath',
    ]);
  }

  const typedArgs: SaveSceneInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
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

    const isVariant = Boolean(typedArgs.newPath);
    logDebug(`Saving scene: ${typedArgs.scenePath}${isVariant ? ` as variant: ${typedArgs.newPath}` : ''}`);

    // Prepare parameters for the operation
    const params: BaseToolArgs = {
      scenePath: typedArgs.scenePath,
    };

    if (typedArgs.newPath) {
      params.newPath = typedArgs.newPath;
    }

    // Execute the operation
    const { stdout, stderr } = await executeOperation(
      'save_scene',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to save scene: ${stderr}`, [
        'Check if you have write permissions',
        'Ensure the scene file is not corrupted',
        'Verify the output path is valid',
      ]);
    }

    const savedPath = typedArgs.newPath || typedArgs.scenePath;
    return createSuccessResponse(`Scene saved successfully: ${savedPath}\n\nOutput: ${stdout}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to save scene: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify the project path is accessible',
    ]);
  }
};
