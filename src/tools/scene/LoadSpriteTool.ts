/**
 * Load Sprite Tool
 * Loads sprites and textures into Sprite2D nodes in Godot scenes
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types';
import {
  prepareToolArgs,
  validateProjectPath,
  validateScenePath,
  validateFilePath,
  createSuccessResponse,
} from '../BaseToolHandler';
import { createErrorResponse } from '../../utils/ErrorHandler';
import { detectGodotPath } from '../../core/PathManager';
import { executeOperation } from '../../core/GodotExecutor';
import { logDebug } from '../../utils/Logger';
import {
  LoadSpriteSchema,
  LoadSpriteInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas';

export const loadSpriteDefinition: ToolDefinition = {
  name: 'load_sprite',
  description: 'Load a sprite/texture into a Sprite2D node in a Godot scene',
  inputSchema: toMcpSchema(LoadSpriteSchema),
};

export const handleLoadSprite = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(LoadSpriteSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, scenePath, nodePath, and texturePath',
    ]);
  }

  const typedArgs: LoadSpriteInput = validation.data;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const sceneValidationError = validateScenePath(typedArgs.projectPath, typedArgs.scenePath);
  if (sceneValidationError) {
    return sceneValidationError;
  }

  const textureValidationError = validateFilePath(typedArgs.projectPath, typedArgs.texturePath);
  if (textureValidationError) {
    return textureValidationError;
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

    logDebug(
      `Loading sprite ${typedArgs.texturePath} into node ${typedArgs.nodePath} in scene: ${typedArgs.scenePath}`,
    );

    // Prepare parameters for the operation
    const params = {
      scenePath: typedArgs.scenePath,
      nodePath: typedArgs.nodePath,
      texturePath: typedArgs.texturePath,
    };

    // Execute the operation
    const { stdout, stderr } = await executeOperation(
      'load_sprite',
      params,
      typedArgs.projectPath,
      godotPath,
    );

    if (stderr && stderr.includes('Failed to')) {
      return createErrorResponse(`Failed to load sprite: ${stderr}`, [
        'Check if the node path exists and is a Sprite2D node',
        'Ensure the texture file is a valid image format',
        'Verify the texture path is correct',
      ]);
    }

    return createSuccessResponse(
      `Sprite loaded successfully: ${typedArgs.texturePath} into ${typedArgs.nodePath}\n\nOutput: ${stdout}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to load sprite: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Check if the GODOT_PATH environment variable is set correctly',
      'Verify all file paths are accessible',
    ]);
  }
};
