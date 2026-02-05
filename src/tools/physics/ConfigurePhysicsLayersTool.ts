/**
 * Configure Physics Layers Tool
 * Configures physics layer names in project settings
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { executeWithBridge } from '../../bridge/BridgeExecutor.js';
import { detectGodotPath } from '../../core/PathManager.js';
import { executeOperation } from '../../core/GodotExecutor.js';
import { logDebug } from '../../utils/Logger.js';
import {
  ConfigurePhysicsLayersSchema,
  ConfigurePhysicsLayersInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

export const configurePhysicsLayersDefinition: ToolDefinition = {
  name: 'configure_physics_layers',
  description: 'Configure physics collision layer names in project settings for 2D or 3D',
  inputSchema: toMcpSchema(ConfigurePhysicsLayersSchema),
};

export const handleConfigurePhysicsLayers = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation
  const validation = safeValidateInput(ConfigurePhysicsLayersSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide projectPath, dimension (2d/3d), and layers array',
    ]);
  }

  const typedArgs: ConfigurePhysicsLayersInput = validation.data;

  // Validate layers (before project validation)
  if (!Array.isArray(typedArgs.layers) || typedArgs.layers.length === 0) {
    return createErrorResponse('Layers must be a non-empty array', [
      'Provide at least one layer configuration',
      'Example: [{ layer: 1, name: "Player" }, { layer: 2, name: "Enemies" }]',
    ]);
  }

  // Validate each layer
  for (const layerConfig of typedArgs.layers) {
    if (layerConfig.layer < 1 || layerConfig.layer > 32) {
      return createErrorResponse(`Invalid layer number: ${layerConfig.layer}`, [
        'Layer numbers must be between 1 and 32',
      ]);
    }
    if (!layerConfig.name || typeof layerConfig.name !== 'string') {
      return createErrorResponse('Each layer must have a name', [
        'Provide a string name for each layer',
      ]);
    }
  }

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const godotPath = await detectGodotPath();
    if (!godotPath) {
      return createErrorResponse('Could not find a valid Godot executable path', [
        'Ensure Godot is installed correctly',
        'Set GODOT_PATH environment variable to specify the correct path',
      ]);
    }

    logDebug(`Configuring ${typedArgs.dimension} physics layers for project: ${typedArgs.projectPath}`);

    // Set each layer name via project settings
    const results: string[] = [];

    for (const layerConfig of typedArgs.layers) {
      const settingPath = `layer_names/${typedArgs.dimension}_physics/layer_${layerConfig.layer}`;

      const params: BaseToolArgs = {
        setting: settingPath,
        value: layerConfig.name,
      };

      const { stderr } = await executeOperation(
        'set_project_setting',
        params,
        typedArgs.projectPath,
        godotPath,
      );

      if (stderr && stderr.includes('Failed to')) {
        results.push(`Layer ${layerConfig.layer}: FAILED - ${stderr}`);
      } else {
        results.push(`Layer ${layerConfig.layer}: "${layerConfig.name}"`);
      }
    }

    return createSuccessResponse(
      `Physics layers configured for ${typedArgs.dimension.toUpperCase()}:\n${results.join('\n')}`,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to configure physics layers: ${errorMessage}`, [
      'Ensure Godot is installed correctly',
      'Verify the project path is accessible',
    ]);
  }
};
